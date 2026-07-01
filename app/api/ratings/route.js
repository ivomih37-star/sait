import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phygital QR-оценка: гость оценивает продукт (с аккаунтом или анонимно)
export async function POST(req) {
  const { productId, score, notes, sessionId, source = "qr" } = await req
    .json()
    .catch(() => ({}));

  const s = Number(score);
  if (!productId || !(s >= 1 && s <= 5)) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return Response.json({ ok: false, reason: "no_product" }, { status: 404 });

  await prisma.rating.create({
    data: { productId, score: s, notes: notes || null, sessionId: sessionId || null, source },
  });

  const agg = await prisma.rating.aggregate({
    where: { productId },
    _avg: { score: true },
    _count: true,
  });

  return Response.json({
    ok: true,
    average: Number(agg._avg.score?.toFixed(2) || 0),
    count: agg._count,
  });
}
