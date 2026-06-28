import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Список опубликованных продуктов (с вкусовым профилем и средним рейтингом)
export async function GET() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: {
      tasteProfile: true,
      producer: { select: { name: true, region: true } },
      _count: { select: { ratings: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ ok: true, products });
}
