import prisma from "@/lib/prisma";
import { publishApproved } from "@/lib/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Веб-панель модерации AI-контента (дублирует кнопки админ-бота).
// Защита простым админ-секретом в заголовке.
function authed(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  return process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

export async function GET(req) {
  if (!authed(req)) return Response.json({ ok: false }, { status: 401 });
  const items = await prisma.newsQueue.findMany({
    where: { status: { in: ["PENDING", "APPROVED", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json({ ok: true, items });
}

export async function POST(req) {
  if (!authed(req)) return Response.json({ ok: false }, { status: 401 });
  const { action, newsId, text } = await req.json().catch(() => ({}));
  if (!newsId) return Response.json({ ok: false, reason: "no_id" }, { status: 400 });

  if (action === "approve") {
    const r = await publishApproved(newsId);
    return Response.json(r);
  }
  if (action === "reject") {
    await prisma.newsQueue.update({
      where: { id: newsId },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
    return Response.json({ ok: true });
  }
  if (action === "edit") {
    const news = await prisma.newsQueue.update({
      where: { id: newsId },
      data: { contentInformal: text, status: "PENDING" },
    });
    return Response.json({ ok: true, news });
  }
  return Response.json({ ok: false, reason: "unknown_action" }, { status: 400 });
}
