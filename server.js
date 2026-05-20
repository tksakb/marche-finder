const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

const PREFECTURES = [
  { name: "蝓ｼ邇�", queryName: "蝓ｼ邇臥恁", keywords: ["蝓ｼ邇�", "縺輔＞縺溘∪", "蟾晁ｶ�", "謇\豐｢", "雜願ｰｷ", "辭願ｰｷ"] },
  { name: "闌ｨ蝓�", queryName: "闌ｨ蝓守恁", keywords: ["闌ｨ蝓�", "豌ｴ謌ｸ", "縺､縺上�", "蝨滓ｵｦ", "縺ｲ縺溘■縺ｪ縺�"] },
  { name: "譚ｱ莠ｬ", queryName: "譚ｱ莠ｬ驛ｽ", keywords: ["譚ｱ莠ｬ", "驛ｽ蜀�", "貂玖ｰｷ", "譁ｰ螳ｿ", "豎 陲�", "遶句ｷ�", "蜷臥･･蟇ｺ"] },
  { name: "蜊�痩", queryName: "蜊�痩逵�", keywords: ["蜊�痩", "闊ｹ讖�", "譟�", "譚ｾ謌ｸ", "蟶ょｷ�", "蟷募ｼｵ"] }
];

const SEARCH_TERMS = [
  "繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎苓\⒦供髮�",
  "繝上Φ繝峨Γ繧､繝峨�繝ｫ繧ｷ繧ｧ 蜃ｺ蠎� 蜍滄寔",
  "繧ｯ繝ｩ繝輔ヨ繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎苓\� 蜍滄寔",
  "繝槭�繧ｱ繝�ヨ 蜃ｺ蠎苓\⒦供髮�"
];

const INSTAGRAM_SEARCH_TERMS = [
  "繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎苓\⒦供髮�",
  "繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎怜供髮�",
  "繝上Φ繝峨Γ繧､繝峨�繝ｫ繧ｷ繧ｧ 蜃ｺ蠎苓\⒦供髮�",
  "繧ｯ繝ｩ繝輔ヨ繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎怜供髮�"
];

const FALLBACK_SOURCES = {
  "蝓ｼ邇�": [
    { title: "蝓ｼ邇臥恁縺ｮ繝槭Ν繧ｷ繧ｧ繝ｻ譛晏ｸる幕蛯ｬ諠⒦ ｱ繝ｻ蜃ｺ蠎怜供髮�ュ蝣ｱ�彷mfm.jp", url: "https://fmfm.jp/event/marche/saitama" },
    { title: "蝓ｼ邇臥恁縺ｮ繧ｯ繝ｩ繝輔ヨ繝輔ぉ繧｢髢句ぎ諠⒦ ｱ繝ｻ繝上Φ繝峨Γ繧､繝牙�蠎怜供髮�ｽ彷mfm.jp", url: "https://fmfm.jp/event/craftfair/saitama" },
    { title: "蠖ｩ縺ｮ蝗ｽ繝槭Ν繧ｷ繧ｧ Sainokuni Marche", url: "https://sainokunimarche.com/" },
    { title: "蝓ｼ邇臥恁縺ｮ蜃ｺ蠎苓\⒦供髮�ｽ懊う繝吶Φ繝域ュ蝣ｱ�懊ず繝｢繝�ぅ繝ｼ", url: "https://jmty.jp/saitama/eve-kw-%E5%87%BA%E5%BA%97%E8%80%85%E5%8B%9F%E9%9B%86" },
    { title: "髢｢譚ｱ 蜃ｺ蠎苓\⒦供髮�ュ蝣ｱ縲仙XIV蠑上\� Instagram", url: "https://www.instagram.com/kanto.ss/", source: "instagram" }
  ],
  "闌ｨ蝓�": [
    { title: "闌ｨ蝓守恁縺ｮ繝槭Ν繧ｷ繧ｧ繝ｻ譛晏ｸる幕蛯ｬ諠⒦ ｱ繝ｻ蜃ｺ蠎怜供髮�ュ蝣ｱ�彷mfm.jp", url: "https://fmfm.jp/event/marche/ibaraki" },
    { title: "闌ｨ蝓守恁縺ｮ繧ｯ繝ｩ繝輔ヨ繝輔ぉ繧｢髢句ぎ諠⒦ ｱ繝ｻ繝上Φ繝峨Γ繧､繝牙�蠎怜供髮�ｽ彷mfm.jp", url: "https://fmfm.jp/event/craftfair/ibaraki" },
    { title: "闌ｨ蝓守恁縺ｮ蜃ｺ蠎苓\⒦供髮�ｽ懊う繝吶Φ繝域ュ蝣ｱ�懊ず繝｢繝�ぅ繝ｼ", url: "https://jmty.jp/ibaraki/eve-kw-%E5%87%BA%E5%BA%97%E8%80%85%E5%8B%9F%E9%9B%86" },
    { title: "闌ｨ蝓弱け繝ｩ繝輔ヨ繝槭Ν繧ｷ繧ｧ 螳溯｡悟ｧ泌藤莨� Instagram", url: "https://www.instagram.com/ibarakicraftmarche/", source: "instagram" }
  ],
  "譚ｱ莠ｬ": [
    { title: "譚ｱ莠ｬ驛ｽ縺ｮ繝槭Ν繧ｷ繧ｧ繝ｻ譛晏ｸる幕蛯ｬ諠⒦ ｱ繝ｻ蜃ｺ蠎怜供髮�ュ蝣ｱ�彷mfm.jp", url: "https://fmfm.jp/event/marche/tokyo" },
    { title: "譚ｱ莠ｬ驛ｽ縺ｮ繧ｯ繝ｩ繝輔ヨ繝輔ぉ繧｢髢句ぎ諠⒦ ｱ繝ｻ繝上Φ繝峨Γ繧､繝牙�蠎怜供髮�ｽ彷mfm.jp", url: "https://fmfm.jp/event/craftfair/tokyo" },
    { title: "譚ｱ莠ｬ繝上Φ繝峨Γ繧､繝峨�繝ｫ繧ｷ繧ｧ 蜃ｺ蠎励♀逕ｳ縺苓ｾｼ縺ｿ", url: "https://tokyo.handmade-marche.jp/entry/" },
    { title: "譚ｱ莠ｬ驛ｽ縺ｮ蜃ｺ蠎苓\⒦供髮�ｽ懊う繝吶Φ繝域ュ蝣ｱ�懊ず繝｢繝�ぅ繝ｼ", url: "https://jmty.jp/tokyo/eve-kw-%E5%87%BA%E5%BA%97%E8%80%85%E5%8B%9F%E9%9B%86" },
    { title: "髢｢譚ｱ 蜃ｺ蠎苓\⒦供髮�ュ蝣ｱ縲仙XIV蠑上\� Instagram", url: "https://www.instagram.com/kanto.ss/", source: "instagram" }
  ],
  "蜊�痩": [
    { title: "蜊�痩逵後�繝槭Ν繧ｷ繧ｧ繝ｻ譛晏ｸる幕蛯ｬ諠⒦ ｱ繝ｻ蜃ｺ蠎怜供髮�ュ蝣ｱ�彷mfm.jp", url: "https://fmfm.jp/event/marche/chiba" },
    { title: "蜊�痩逵後�繧ｯ繝ｩ繝輔ヨ繝輔ぉ繧｢髢句ぎ諠⒦ ｱ繝ｻ繝上Φ繝峨Γ繧､繝牙�蠎怜供髮�ｽ彷mfm.jp", url: "https://fmfm.jp/event/craftfair/chiba" },
    { title: "蜊�痩逵後�蜃ｺ蠎苓\⒦供髮�ｽ懊う繝吶Φ繝域ュ蝣ｱ�懊ず繝｢繝�ぅ繝ｼ", url: "https://jmty.jp/chiba/eve-kw-%E5%87%BA%E5%BA%97%E8%80%85%E5%8B%9F%E9%9B%86" },
    { title: "縺�■縺九ｏ縺斐■縺昴≧繝槭Ν繧ｷ繧ｧ 蜃ｺ蠎苓\⒦供髮�", url: "https://ichimarche.com/guideline/" },
    { title: "髢｢譚ｱ 蜃ｺ蠎苓\⒦供髮�ュ蝣ｱ縲仙XIV蠑上\� Instagram", url: "https://www.instagram.com/kanto.ss/", source: "instagram" }
  ]
};

const STATUS = {
  open: "蜃ｺ蠎苓\⒦供髮�ｸｭ",
  upcoming: "蜍滄寔髢句ｧ句燕",
  unknown: "諠⒦ ｱ縺ｪ縺�"
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
      resolve(buildFallbackPayload(startedAt, "讀懃ｴ｢縺ｫ譎る俣縺後°縺九▲縺溘◆繧√\�\比ｸｭ縺ｧ謇薙■蛻�ｊ縺ｾ縺励◆縲ゅｂ縺�ｸ\蠎ｦ縺願ｩｦ縺励￥縺 縺輔＞縲�"));
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

  if (unique.length === 0) {
    unique.push(...fallbackEntries());
  }

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

  const usedFallback = discovered.length === 0;
  const payload = {
    generatedAt: startedAt.toISOString(),
    prefectures: PREFECTURES.map((p) => p.name),
    count: filtered.length,
    cached: false,
    warning: usedFallback ? "讀懃ｴ｢繧ｵ繧､繝医′蛟呵｣懊ｒ霑斐＆縺ｪ縺九▲縺溘◆繧√\∽ｸｻ隕√↑蜍滄寔諠⒦ ｱ繧ｵ繧､繝医°繧牙\呵｣懊ｒ陦ｨ遉ｺ縺励※縺�∪縺吶\�" : "",
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
      warning: "讀懃ｴ｢繧ｵ繧､繝医′荳\譎ら噪縺ｫ蛟呵｣懊ｒ霑斐＆縺ｪ縺九▲縺溘◆繧√\∝燕蝗樊�蜉溘＠縺溽ｵ先棡繧定｡ｨ遉ｺ縺励※縺�∪縺吶\�"
    };
  }

  return payload;
}

function fallbackEntries() {
  return PREFECTURES.flatMap((prefecture) => {
    return (FALLBACK_SOURCES[prefecture.name] || []).map((result) => ({
      result,
      prefecture,
      source: result.source || "web"
    }));
  });
}

async function searchDuckDuckGo(query, limit = 5) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url, SEARCH_PAGE_TIMEOUT_MS);
  if (!html) return [];

  const blocks = html.match(/<a[^>]+class="[^"]*result__a[^"]*"[¥s¥S]*?<¥/a>/g) || [];
  return blocks.slice(0, limit).map((block) => {
    const href = attr(block, "href");
    const title = cleanText(block);
    const resolved = normalizeDuckDuckGoUrl(href);
    return resolved && title ? { title, url: resolved } : null;
  }).filter(Boolean);
}

async function enrichCandidate(result, prefecture, now = new Date(), source = "web") {
  const isInstagramUrl = source === "instagram" || /(^|¥.)instagram¥.com$/i.test(hostname(result.url));
  const html = isInstagramUrl ? "" : await fetchText(result.url, CANDIDATE_PAGE_TIMEOUT_MS);
  const bodyText = html ? cleanText(stripScripts(html)).slice(0, 12000) : "";
  const combined = `${result.title} ${bodyText}`;
  const isInstagram = isInstagramUrl;

  const marcheScore = countMatches(combined, [/繝槭Ν繧ｷ繧ｧ/g, /繝槭�繧ｱ繝�ヨ/g, /蟶�b/g, /繧ｯ繝ｩ繝輔ヨ/g, /繝上Φ繝峨Γ繧､繝�/g]);
  const vendorScore = countMatches(combined, [/蜃ｺ蠎苓\⒦供髮�/g, /蜃ｺ蠎怜供髮�/g, /蜃ｺ蠎苓\⒤ｒ蜍滄寔/g, /蜃ｺ蠎礼筏霎ｼ/g, /蜃ｺ螻戊\⒦供髮�/g, /蜍滄寔隕� �/g]);
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
    fee: fee || "諠⒦ ｱ縺ｪ縺�",
    url: result.url,
    source: isInstagram ? "Instagram" : "Web",
    sourceType: isInstagram ? "instagram" : "web",
    sourceHint: bodyText ? extractSnippet(combined) : "讀懃ｴ｢邨先棡縺九ｉ蜿門ｾ励\ゅ�繝ｼ繧ｸ譛ｬ譁��蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆縲�",
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
  if (/蜍滄寔髢句ｧ句燕|蜿嶺ｻ倬幕蟋句燕|逕ｳ霎ｼ髢句ｧ句燕|霑第律蜍滄寔|蜍滄寔莠亥ｮ�/.test(text)) {
    return { label: STATUS.upcoming, type: "upcoming" };
  }
  if (/蜍滄寔邨ゆｺ�蜿嶺ｻ倡ｵゆｺ�邱 蛻�貅\莠�螳壼藤縺ｫ驕斐＠/.test(text) && !/蜍滄寔荳ｭ|蜿嶺ｻ倅ｸｭ/.test(text)) {
    return { label: "蜍滄寔邨ゆｺ��蜿ｯ閭ｽ諤ｧ", type: "closed" };
  }
  if (/蜃ｺ蠎苓\⒦供髮�蜃ｺ蠎怜供髮�蜃ｺ螻戊\⒦供髮�蜃ｺ蠎苓\⒤ｒ蜍滄寔|蜃ｺ蠎礼筏霎ｼ|蜃ｺ蠎礼筏縺苓ｾｼ縺ｿ|蜿嶺ｻ倅ｸｭ|蜍滄寔荳ｭ/.test(text)) {
    return { label: STATUS.open, type: "open" };
  }
  return { label: STATUS.unknown, type: "unknown" };
}

function extractDate(text, now = new Date()) {
  const normalized = text.replace(/¥s+/g, " ");
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidates = [];

  for (const match of normalized.matchAll(/(20¥d{2})[蟷ｴ¥/.-]¥s*(1[0-2]|0?[1-9])[譛�/.-]¥s*([12]¥d|3[01]|0?[1-9])譌･?/g)) {
    candidates.push(toDateCandidate(Number(match[1]), Number(match[2]), Number(match[3])));
  }

  for (const match of normalized.matchAll(/(?<!¥d)(1[0-2]|0?[1-9])譛�s*([12]¥d|3[01]|0?[1-9])譌･/g)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let candidate = toDateCandidate(today.getFullYear(), month, day);
    if (new Date(candidate.value) < today) {
      candidate = toDateCandidate(today.getFullYear() + 1, month, day);
    }
    candidates.push(candidate);
  }

  for (const match of normalized.matchAll(/(20¥d{2})蟷ｴ¥s*(譏･|螟楯遘弓蜀ｬ)/g)) {
    const monthBySeason = { "譏･": 4, "螟�": 7, "遘�": 10, "蜀ｬ": 12 };
    candidates.push(toDateCandidate(Number(match[1]), monthBySeason[match[2]], 1, `${match[1]}蟷ｴ${match[2]}`));
  }

  const future = candidates
    .filter((candidate) => new Date(candidate.value) >= today)
    .sort((a, b) => new Date(a.value) - new Date(b.value));

  if (future.length > 0) {
    return future[0];
  }

  return { label: "諠⒦ ｱ縺ｪ縺�", value: null };
}

function toDateCandidate(year, month, day, label = `${year}蟷ｴ${month}譛�${day}譌･`) {
  return {
    label,
    value: `${year}-${pad(month)}-${pad(day)}`
  };
}

function extractFee(text) {
  const normalized = text.replace(/¥s+/g, " ");
  const patterns = [
    /(蜃ｺ蠎玲侭|蜃ｺ蠎苓ｲｻ|蜃ｺ螻墓侭|蜿ょ刈雋ｻ|繝悶�繧ｹ莉｣|蛹ｺ逕ｻ譁�)[��:¥s]*([^縲ゅ\√\後\構n]{0,50}?¥d[¥d,]*¥s*蜀㎆^縲ゅ\√\後\構n]{0,30})/,
    /(蜃ｺ蠎玲侭|蜃ｺ蠎苓ｲｻ|蜃ｺ螻墓侭|蜿ょ刈雋ｻ|繝悶�繧ｹ莉｣|蛹ｺ逕ｻ譁�)[��:¥s]*([^縲ゅ\√\後\構n]{0,20}?辟｡譁兌^縲ゅ\√\後\構n]{0,20})/,
    /((?:¥d[¥d,]*¥s*蜀�)(?:¥s*[縲恠¥-]¥s*¥d[¥d,]*¥s*蜀�)?)(?=.{0,16}(蜃ｺ蠎慾蜃ｺ螻怖繝悶�繧ｹ|蛹ｺ逕ｻ|蜿ょ刈))/,
    /(辟｡譁�)(?=.{0,20}(蜃ｺ蠎慾蜃ｺ螻怖繝悶�繧ｹ|蛹ｺ逕ｻ|蜿ょ刈))/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const fee = (match[2] || match[1]).trim();
    if (/^驥曾s*謖㍾ｮ壹↑縺�/.test(fee)) continue;
    if (/蜀�辟｡譁�/.test(fee)) return fee;
  }

  return "";
}

function extractSnippet(text) {
  const index = text.search(/蜃ｺ蠎苓\⒦供髮�蜃ｺ蠎怜供髮�蜃ｺ螻戊\⒦供髮�蜃ｺ蠎礼筏霎ｼ|蜍滄寔荳ｭ|蜍滄寔髢句ｧ句燕|蜃ｺ蠎玲侭|蜃ｺ蠎苓ｲｻ|髢句ぎ/);
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
    .replace(/<script[¥s¥S]*?<¥/script>/gi, " ")
    .replace(/<style[¥s¥S]*?<¥/style>/gi, " ")
    .replace(/<noscript[¥s¥S]*?<¥/noscript>/gi, " ");
}

function cleanText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/¥s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "¥"")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(¥d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function compactTitle(title) {
  return title
    .replace(/¥s*[-|�彎¥s*.*?(Google|Yahoo|讀懃ｴ｢|Search).*$/i, "")
    .replace(/¥s+/g, " ")
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
