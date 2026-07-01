import { describe, it, expect } from "vitest";
import { parseFeed, fetchLatestUnseen } from "../lib/ai/rss.js";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[Нова реколта ракия в Тракия]]></title>
    <link>https://example.bg/news/1</link>
    <description>&lt;p&gt;Силна реколта грозде и ръст на интерес към отлежали серии.&lt;/p&gt;</description>
    <pubDate>Wed, 25 Jun 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Дегустация на сливова в София</title>
    <link>https://example.bg/news/2</link>
    <description>Барел-серии и гастро-съчетания на новото издание.</description>
    <pubDate>Fri, 27 Jun 2026 09:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom: мускатова ракия</title>
    <link href="https://atom.bg/a/1" rel="alternate"/>
    <summary>Ароматна мускатова ракия с цветни нотки и дълъг финал на дегустацията.</summary>
    <updated>2026-06-26T12:00:00Z</updated>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("парсит RSS 2.0, декодирует CDATA и сущности, чистит теги", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Нова реколта ракия в Тракия");
    expect(items[0].link).toBe("https://example.bg/news/1");
    expect(items[0].summary).toContain("Силна реколта");
    expect(items[0].summary).not.toContain("<p>");
    expect(items[0].publishedAt.getTime()).toBeGreaterThan(0);
  });

  it("парсит Atom с href в <link> и <summary>", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("https://atom.bg/a/1");
    expect(items[0].title).toContain("мускатова");
  });

  it("пустой/мусорный вход → пустой массив", () => {
    expect(parseFeed("")).toEqual([]);
    expect(parseFeed("<html>no feed</html>")).toEqual([]);
  });
});

describe("fetchLatestUnseen (без сети)", () => {
  it("выбирает самую свежую непросмотренную (моки fetch)", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, text: async () => RSS });
    try {
      // news/2 свежее (27 июня) — должна выбраться первой
      const fresh = await fetchLatestUnseen({ feeds: ["x"], seenUrls: new Set() });
      expect(fresh.url).toBe("https://example.bg/news/2");

      // если news/2 уже видели — берём news/1
      const next = await fetchLatestUnseen({
        feeds: ["x"],
        seenUrls: new Set(["https://example.bg/news/2"]),
      });
      expect(next.url).toBe("https://example.bg/news/1");
    } finally {
      globalThis.fetch = orig;
    }
  });
});
