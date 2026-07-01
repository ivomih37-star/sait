// ===========================================================================
//  Лёгкий RSS/Atom-парсер и подбор свежей непросмотренной новости.
//  Без внешних зависимостей; в проде (Beget) использует прямой fetch.
// ===========================================================================

// Дефолтные ленты: поиск Google News по болгарской ракии (валидный RSS).
export const DEFAULT_FEEDS = [
  "https://news.google.com/rss/search?q=%D1%80%D0%B0%D0%BA%D0%B8%D1%8F+%D0%91%D1%8A%D0%BB%D0%B3%D0%B0%D1%80%D0%B8%D1%8F&hl=bg&gl=BG&ceid=BG:bg",
];

const UA =
  "Mozilla/5.0 (compatible; RakiaClubBot/1.0; +https://xn--80aaldqfdq.xn--p1ai)";

function decodeEntities(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function stripTags(s = "") {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : null;
}

/**
 * Парсит строку RSS 2.0 / Atom в массив элементов.
 * @returns {Array<{title,link,summary,publishedAt}>}
 */
export function parseFeed(xml = "") {
  const items = [];
  const blocks = [
    ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  for (const b of blocks) {
    const title = stripTags(tag(b, "title") || "");
    // RSS <link>текст</link> или Atom <link href="...">
    let link = tag(b, "link");
    if (!link) {
      const href = b.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = href ? href[1] : null;
    }
    const rawDesc =
      tag(b, "description") || tag(b, "summary") || tag(b, "content") || "";
    const summary = stripTags(rawDesc).slice(0, 800);
    const dateStr = tag(b, "pubDate") || tag(b, "updated") || tag(b, "published");
    const publishedAt = dateStr ? new Date(dateStr) : null;
    if (title || link) items.push({ title, link, summary, publishedAt });
  }
  return items;
}

async function fetchFeed(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    return parseFeed(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/**
 * Берёт самую свежую новость из лент, которой ещё нет в seenUrls.
 * @param {{ feeds?: string[], seenUrls?: Set<string>, minLen?: number }} opts
 * @returns {Promise<{title,summary,url,publishedAt}|null>}
 */
export async function fetchLatestUnseen({ feeds = DEFAULT_FEEDS, seenUrls = new Set(), minLen = 30 } = {}) {
  const all = (await Promise.all(feeds.map((f) => fetchFeed(f)))).flat();

  // сортировка по дате (свежие первыми), новости без даты — в конец
  all.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));

  for (const it of all) {
    if (!it.link || seenUrls.has(it.link)) continue;
    const summary = it.summary || it.title;
    if (!summary || summary.length < minLen) continue;
    return { title: it.title, summary, url: it.link, publishedAt: it.publishedAt };
  }
  return null;
}
