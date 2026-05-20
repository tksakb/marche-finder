const searchButton = document.querySelector("#searchButton");
const statusText = document.querySelector("#statusText");
const generatedAt = document.querySelector("#generatedAt");
const totalCount = document.querySelector("#totalCount");
const openCount = document.querySelector("#openCount");
const upcomingCount = document.querySelector("#upcomingCount");
const unknownCount = document.querySelector("#unknownCount");
const instagramCount = document.querySelector("#instagramCount");
const results = document.querySelector("#results");
const prefectureTemplate = document.querySelector("#prefectureTemplate");
const cardTemplate = document.querySelector("#cardTemplate");

searchButton.addEventListener("click", search);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

async function search() {
  setLoading(true);
  setStatus("検索しています。候補ページを開いて募集状況と費用を読み取っています...");
  generatedAt.textContent = "";
  results.innerHTML = "";

  try {
    const response = await fetch("/api/search", {
      signal: AbortSignal.timeout(35000)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "検索に失敗しました。");

    render(payload);
    const cacheNote = payload.warning || (payload.cached ? "検索サイトが一時的に0件を返したため、前回成功した結果を表示しています。" : "県別、開催時期が近い順に並べています。");
    setStatus(`${payload.count}件の候補を収集しました。${cacheNote}`);
    generatedAt.textContent = `更新: ${formatDateTime(payload.generatedAt)}`;
  } catch (error) {
    const message = error.name === "TimeoutError" ? "検索が35秒を超えたため中断しました。" : `検索できませんでした: ${error.message}`;
    setStatus(message);
    renderEmpty("ネットワーク接続または検索サイト側の制限で取得できませんでした。少し時間を置いて再実行してください。");
  } finally {
    setLoading(false);
  }
}

function render(payload) {
  const grouped = new Map(payload.prefectures.map((prefecture) => [prefecture, []]));
  for (const item of payload.results) {
    if (!grouped.has(item.prefecture)) grouped.set(item.prefecture, []);
    grouped.get(item.prefecture).push(item);
  }

  totalCount.textContent = payload.results.length;
  openCount.textContent = payload.results.filter((item) => item.statusType === "open").length;
  upcomingCount.textContent = payload.results.filter((item) => item.statusType === "upcoming").length;
  unknownCount.textContent = payload.results.filter((item) => item.statusType === "unknown").length;
  instagramCount.textContent = payload.results.filter((item) => item.sourceType === "instagram").length;

  results.innerHTML = "";

  if (payload.results.length === 0) {
    renderEmpty("該当する候補が見つかりませんでした。");
    return;
  }

  for (const [prefecture, items] of grouped) {
    const section = prefectureTemplate.content.cloneNode(true);
    section.querySelector("h2").textContent = prefecture;
    section.querySelector(".section-count").textContent = `${items.length}件`;
    const cards = section.querySelector(".cards");

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "候補なし";
      cards.append(empty);
    }

    for (const item of items) {
      cards.append(createCard(item));
    }

    results.append(section);
  }
}

function createCard(item) {
  const card = cardTemplate.content.cloneNode(true);
  card.querySelector("h3").textContent = item.name;
  card.querySelector(".period").textContent = item.period;
  card.querySelector(".fee").textContent = item.fee;
  card.querySelector(".snippet").textContent = item.sourceHint;

  const badge = card.querySelector(".badge");
  badge.textContent = item.status;
  badge.classList.add(item.statusType);

  const sourceBadge = card.querySelector(".source-badge");
  sourceBadge.textContent = item.source || "Web";
  sourceBadge.classList.add(item.sourceType || "web");

  const link = card.querySelector(".link-button");
  link.href = item.url;
  link.setAttribute("aria-label", `${item.name}の募集ページを開く`);
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = item.url;
  });

  return card;
}

function renderEmpty(message) {
  results.innerHTML = `<div class="panel empty">${escapeHtml(message)}</div>`;
  totalCount.textContent = "0";
  openCount.textContent = "0";
  upcomingCount.textContent = "0";
  unknownCount.textContent = "0";
  instagramCount.textContent = "0";
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.textContent = isLoading ? "検索中..." : "⌕ 探す";
}

function setStatus(message) {
  statusText.textContent = message;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}
