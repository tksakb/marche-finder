const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const PREFECTURES = [
  { name: "埼玉", queryName: "埼玉県", keywords: ["埼玉", "さいたま", "川越", "所沢", "越谷", "熊谷"] },
  { name: "茨城", queryName: "茨城県", keywords: ["茨城", "水戸", "つくば", "土浦", "ひたちなか"] },
  { name: "東京", queryName: "東京都", keywords: ["東京", "都内", "渋谷", "新宿", "池袋", "立川", "吉祥寺"] },
  { name: "千葉", queryName: "千葉県", keywords: ["千葉", "船橋", "柏", "松戸", "市川", "幕張"] }
];

const SEARCH_TERMS = [
  "マルシェ 出店者募集",
  "ハンドメイドマルシェ 出店 募集",
  "クラフトマルシェ 出店者 募集",
  "マーケット 出店者募集"
];

const INSTAGRAM_SEARCH_TERMS = [
  "マルシェ 出店者募集",
  "マルシェ 出店募集",
  "ハンドメイドマルシェ 出店者募集",
  "クラフトマルシェ 出店募集"
];

const STATUS = {
  open: "出店者募集中",
  upcoming: "募集開始前",
  unknown: "情報なし"
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

const SEARCH_TIMEOUT_MS = 30000;
const SEARCH_PAGE_TIMEOUT_MS = 5000;
const CANDIDATE_PAGE_TIMEOUT_MS = 3500;

let lastSuccessfulPayload = null;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/search") {
      await handleSearch(res);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Marche finder is running at http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try: PORT=${PORT + 1} node server.js`);
    process.exit(1);
  }
  throw error;
});

async function handleSearch(res) {
  const startedAt = new Date();
  const timeoutPayload = new Promise((resolve) => {
    setTimeout(() => {
      resolve(buildFallbackPayload(startedAt, "検索に時間がかかったため、途中で打ち切りました。もう一度お試しください。"));
    }, SEARCH_TIMEOUT_MS);
  });

  sendJson(res, 200, await Promise.race([collectResults(startedAt), timeoutPayload]));
}

async function collectResults(startedAt) {
  const searchJobs = PREFECTURES.flatMap((prefecture) => {
    return [
      {
        prefecture,
        source: "web",
        query: `${prefecture.queryName} (${SEARCH_TERMS.join(" OR ")}) 2026 2027`,
        limit: 6
      },
      {
        prefecture,
        source: "instagram",
        query: `site:instagram.com ${prefecture.queryName} (${INSTAGRAM_SEARCH_TERMS.join(" OR ")}) 2026 2027`,
        limit: 5
      }
    ];
  });

  const discovered = (await runWithLimit(searchJobs, 3, async (job) => {
    const results = await searchDuckDuckGo(job.query, job.limit);
    return results.map((result) => ({
      result,
      prefecture: job.prefecture,
      source: job.source
    }));
  })).flat();
  const seen = new Set();
  const unique = discovered.filter(({ result, prefecture }) => {
    const key = `${prefecture.name}:${result.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const collected = (await runWithLimit(unique, 8, ({ result, prefecture, source }) => {
    return enrichCandidate(result, prefecture, startedAt, source);
  })).filter(Boolean);

  const filtered = collected
    .filter((item) => item.score >= 2)
    .sort((a, b) => {
      const prefDiff = prefIndex(a.prefecture) - prefIndex(b.prefecture);
      if (prefDiff !== 0) return prefDiff;
      return sortDate(a.dateValue, startedAt) - sortDate(b.dateValue, startedAt);
    });

  const payload = {
    generatedAt: startedAt.toISOString(),
    prefectures: PREFECTURES.map((p) => p.name),
    count: filtered.length,
    cached: false,
    warning: "",
    results: filtered
  };

  if (payload.count > 0) {
    lastSuccessfulPayload = payload;
    return payload;
  }

  if (lastSuccessfulPayload) {
    return {
      ...lastSuccessfulPayload,
      generatedAt: startedAt.toISOString(),
      cached: true,
      warning: "検索サイトが一時的に候補を返さなかったため、前回成功した結果を表示しています。"
    };
  }

  return payload;
}

async function searchDuckDuckGo(query, limit = 5) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url, SEARCH_PAGE_TIMEOUT_MS);
  if (!html) return [];

  const blocks = html.match(/<a[^>]+class="[^"]*result__a[^"]*"[\s\S]*?<\/a>/g) || [];
  return blocks.slice(0, limit).map((block) => {
    const href = attr(block, "href");
    const title = cleanText(block);
    const resolved = normalizeDuckDuckGoUrl(href);
    return resolved && title ? { title, url: resolved } : null;
  }).filter(Boolean);
}

async function enrichCandidate(result, prefecture, now = new Date(), source = "web") {
  const isInstagramUrl = source === "instagram" || /(^|\.)instagram\.com$/i.test(hostname(result.url));
  const html = isInstagramUrl ? "" : await fetchText(result.url, CANDIDATE_PAGE_TIMEOUT_MS);
  const bodyText = html ? cleanText(stripScripts(html)).slice(0, 12000) : "";
  const combined = `${result.title} ${bodyText}`;
  const isInstagram = isInstagramUrl;

  const marcheScore = countMatches(combined, [/マルシェ/g, /マーケット/g, /市\b/g, /クラフト/g, /ハンドメイド/g]);
  const vendorScore = countMatches(combined, [/出店者募集/g, /出店募集/g, /出店者を募集/g, /出店申込/g, /出展者募集/g, /募集要項/g]);
  const prefectureScore = prefecture.keywords.some((word) => combined.includes(word)) ? 1 : 0;
  const instagramScore = isInstagram ? 1 : 0;
  const score = marcheScore + vendorScore + prefectureScore + instagramScore;

  if (score < 2) return null;

  const status = detectStatus(combined);
  const date = extractDate(combined, now);
  const fee = extractFee(combined);

  return {
    prefecture: prefecture.name,
    name: compactTitle(result.title),
    status: status.label,
    statusType: status.type,
    period: date.label,
    dateValue: date.value,
    fee: fee || "情報なし",
    url: result.url,
    source: isInstagram ? "Instagram" : "Web",
    sourceType: isInstagram ? "instagram" : "web",
    sourceHint: bodyText ? extractSnippet(combined) : "検索結果から取得。ページ本文は取得できませんでした。",
    score
  };
}

function buildFallbackPayload(startedAt, warning) {
  if (lastSuccessfulPayload) {
    return {
      ...lastSuccessfulPayload,
      generatedAt: startedAt.toISOString(),
      cached: true,
      warning
    };
  }

  return {
    generatedAt: startedAt.toISOString(),
    prefectures: PREFECTURES.map((p) => p.name),
    count: 0,
    cached: false,
    warning,
    results: []
  };
}

function detectStatus(text) {
  if (/募集開始前|受付開始前|申込開始前|近日募集|募集予定/.test(text)) {
    return { label: STATUS.upcoming, type: "upcoming" };
  }
  if (/募集終了|受付終了|締切|満了|定員に達し/.test(text) && !/募集中|受付中/.test(text)) {
    return { label: "募集終了の可能性", type: "closed" };
  }
  if (/出店者募集|出店募集|出展者募集|出店者を募集|出店申込|出店申し込み|受付中|募集中/.test(text)) {
    return { label: STATUS.open, type: "open" };
  }
  return { label: STATUS.unknown, type: "unknown" };
}

function extractDate(text, now = new Date()) {
  const normalized = text.replace(/\s+/g, " ");
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidates = [];

  for (const match of normalized.matchAll(/(20\d{2})[年\/.-]\s*(1[0-2]|0?[1-9])[月\/.-]\s*([12]\d|3[01]|0?[1-9])日?/g)) {
    candidates.push(toDateCandidate(Number(match[1]), Number(match[2]), Number(match[3])));
  }

  for (const match of normalized.matchAll(/(?<!\d)(1[0-2]|0?[1-9])月\s*([12]\d|3[01]|0?[1-9])日/g)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let candidate = toDateCandidate(today.getFullYear(), month, day);
    if (new Date(candidate.value) < today) {
      candidate = toDateCandidate(today.getFullYear() + 1, month, day);
    }
    candidates.push(candidate);
  }

  for (const match of normalized.matchAll(/(20\d{2})年\s*(春|夏|秋|冬)/g)) {
    const monthBySeason = { "春": 4, "夏": 7, "秋": 10, "冬": 12 };
    candidates.push(toDateCandidate(Number(match[1]), monthBySeason[match[2]], 1, `${match[1]}年${match[2]}`));
  }

  const future = candidates
    .filter((candidate) => new Date(candidate.value) >= today)
    .sort((a, b) => new Date(a.value) - new Date(b.value));

  if (future.length > 0) {
    return future[0];
  }

  return { label: "情報なし", value: null };
}

function toDateCandidate(year, month, day, label = `${year}年${month}月${day}日`) {
  return {
    label,
    value: `${year}-${pad(month)}-${pad(day)}`
  };
}

function extractFee(text) {
  const normalized = text.replace(/\s+/g, " ");
  const patterns = [
    /(出店料|出店費|出展料|参加費|ブース代|区画料)[：:\s]*([^。、「」\n]{0,50}?\d[\d,]*\s*円[^。、「」\n]{0,30})/,
    /(出店料|出店費|出展料|参加費|ブース代|区画料)[：:\s]*([^。、「」\n]{0,20}?無料[^。、「」\n]{0,20})/,
    /((?:\d[\d,]*\s*円)(?:\s*[〜~\-]\s*\d[\d,]*\s*円)?)(?=.{0,16}(出店|出展|ブース|区画|参加))/,
    /(無料)(?=.{0,20}(出店|出展|ブース|区画|参加))/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const fee = (match[2] || match[1]).trim();
    if (/^金\s*指定なし/.test(fee)) continue;
    if (/円|無料/.test(fee)) return fee;
  }

  return "";
}

function extractSnippet(text) {
  const index = text.search(/出店者募集|出店募集|出展者募集|出店申込|募集中|募集開始前|出店料|出店費|開催/);
  if (index < 0) return text.slice(0, 120);
  return text.slice(Math.max(0, index - 35), index + 140).trim();
}

async function fetchText(url, timeoutMs) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MarcheFinder/1.0)",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return "";
    return await response.text();
  } catch {
    return "";
  }
}

async function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const publicRoot = await resolvePublicRoot();
  const filePath = path.normalize(path.join(publicRoot, safePath));
  if (!filePath.startsWith(publicRoot)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function resolvePublicRoot() {
  try {
    await fs.access(path.join(PUBLIC, "index.html"));
    return PUBLIC;
  } catch {
    return ROOT;
  }
}

function prefIndex(name) {
  return PREFECTURES.findIndex((prefecture) => prefecture.name === name);
}

function sortDate(value, now) {
  if (!value) return Number.MAX_SAFE_INTEGER - 100000;

  const date = new Date(value);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (date >= today) return date.getTime();
  return Number.MAX_SAFE_INTEGER - 50000 + date.getTime() / 100000000;
}

function normalizeDuckDuckGoUrl(href) {
  if (!href) return "";
  const decoded = decodeEntities(href);
  if (decoded.startsWith("//duckduckgo.com/l/?")) {
    const redirect = new URL(`https:${decoded}`);
    return redirect.searchParams.get("uddg") || "";
  }
  if (decoded.startsWith("/l/?")) {
    const redirect = new URL(`https://duckduckgo.com${decoded}`);
    return redirect.searchParams.get("uddg") || "";
  }
  return decoded.startsWith("http") ? decoded : "";
}

function hostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function attr(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function stripScripts(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
}

function cleanText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function compactTitle(title) {
  return title
    .replace(/\s*[-|｜]\s*.*?(Google|Yahoo|検索|Search).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + ((text.match(pattern) || []).length > 0 ? 1 : 0), 0);
}

async function runWithLimit(items, limit, worker) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}
