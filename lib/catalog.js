// ===========================================================================
//  Доступ к каталогу через Prisma + маппинг в форму для UI.
//  Используется серверными компонентами страниц каталога.
// ===========================================================================
import prisma from "./prisma.js";
import { FLAVOUR_AXES } from "./constants.js";

function mapProduct(p) {
  return {
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    abv: p.abv,
    volumeMl: p.volumeMl,
    year: p.year,
    priceRetail: p.priceRetail,
    priceWholesale: p.priceWholesale,
    isLimited: p.isLimited,
    description: p.description,
    producer: p.producer?.name || null,
    region: p.producer?.region || null,
    profile: p.tasteProfile
      ? {
          intensity: p.tasteProfile.intensity,
          tannins: p.tasteProfile.tannins,
          fruitiness: p.tasteProfile.fruitiness,
          freshness: p.tasteProfile.freshness,
          woodNotes: p.tasteProfile.woodNotes,
          sweetness: p.tasteProfile.sweetness,
        }
      : null,
    pairings: (p.pairings || []).map((x) => ({
      dish: x.dish,
      emoji: x.emoji,
      score: x.score,
      description: x.description,
    })),
  };
}

/** Список опубликованных продуктов для каталога. */
export async function listProducts() {
  const rows = await prisma.product.findMany({
    where: { isPublished: true },
    include: { producer: true, tasteProfile: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapProduct);
}

/** Один продукт по slug (или id) с пейрингами. */
export async function getProduct(slug) {
  const p = await prisma.product.findFirst({
    where: { isPublished: true, OR: [{ slug }, { id: slug }] },
    include: { producer: true, tasteProfile: true, pairings: { orderBy: { score: "desc" } } },
  });
  return p ? mapProduct(p) : null;
}

/** Средний (базовый) вкусовой профиль по каталогу — для сравнения на radar. */
export async function averageProfile() {
  const rows = await prisma.tasteProfile.findMany();
  const acc = {};
  for (const a of FLAVOUR_AXES) acc[a.key] = 0;
  if (!rows.length) return acc;
  for (const r of rows) for (const a of FLAVOUR_AXES) acc[a.key] += r[a.key];
  for (const a of FLAVOUR_AXES) acc[a.key] = +(acc[a.key] / rows.length).toFixed(1);
  return acc;
}
