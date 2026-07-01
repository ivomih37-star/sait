import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Один продукт по id ИЛИ slug (для QR-страницы и карточки)
export async function GET(_req, { params }) {
  const { id } = params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      tasteProfile: true,
      pairings: true,
      producer: { select: { name: true, region: true } },
    },
  });
  if (!product) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });

  const agg = await prisma.rating.aggregate({
    where: { productId: product.id },
    _avg: { score: true },
    _count: true,
  });

  return Response.json({
    ok: true,
    product: {
      ...product,
      ratingAvg: Number(agg._avg.score?.toFixed(2) || 0),
      ratingCount: agg._count,
    },
  });
}
