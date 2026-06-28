import { runNewsCycle } from "@/worker/news-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HTTP-триггер AI-генерации контента (защищён CRON_SECRET).
// Можно дёргать из системного cron Beget: curl -H "x-cron-secret: ..." ...
export async function POST(req) {
  const secret = req.headers.get("x-cron-secret") || "";
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const news = await runNewsCycle();
    if (!news) return Response.json({ ok: true, skipped: true, reason: "no_new_items" });
    return Response.json({ ok: true, id: news.id, status: news.status });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
