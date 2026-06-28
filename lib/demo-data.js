// ===========================================================================
//  Демо-данные для рендеринга UI без запущенной БД.
//  Структуры совпадают с Prisma-моделями — на проде заменяются запросами
//  через lib/prisma.js (prisma.product.findMany и т.д.).
// ===========================================================================

// 6 осей вкусового профиля (Flavour Matrix / spider chart)
export const FLAVOUR_AXES = [
  { key: "intensity", label: "Интенсивность" },
  { key: "tannins", label: "Танины" },
  { key: "fruitiness", label: "Фруктовость" },
  { key: "freshness", label: "Свежесть" },
  { key: "woodNotes", label: "Дерево" },
  { key: "sweetness", label: "Сладость" },
];

export const KIND_LABELS = {
  GROZDOVA: "Виноградная",
  SLIVOVA: "Сливовая",
  KAYSIEVA: "Абрикосовая",
  VISHNEVA: "Вишнёвая",
  DYULEVA: "Айвовая",
  MUSKATOVA: "Мускатная",
  SMESENA: "Купаж",
};

export const products = [
  {
    slug: "grozdova-reserve",
    name: "Гроздова Reserve",
    kind: "GROZDOVA",
    abv: 42,
    volumeMl: 700,
    year: 2021,
    priceRetail: 3200,
    isLimited: false,
    producer: "Тракийска изба",
    region: "Тракия",
    description:
      "Двойная дистилляция, выдержка на тонкой дрожжевой подложке. Чистый виноградный тон с минеральным финишем.",
    profile: { intensity: 7, tannins: 4, fruitiness: 6, freshness: 7, woodNotes: 5, sweetness: 3 },
    pairings: [
      { dish: "Шопский салат с брынзой", emoji: "🥗", score: 88 },
      { dish: "Гриль из ягнёнка", emoji: "🍖", score: 82 },
    ],
  },
  {
    slug: "slivova-barrel-aged",
    name: "Сливова Barrel Aged",
    kind: "SLIVOVA",
    abv: 45,
    volumeMl: 700,
    year: 2019,
    priceRetail: 4100,
    isLimited: true,
    producer: "Тракийска изба",
    region: "Тракия",
    description:
      "36 месяцев в дубе. Сухофрукты, тёмный шоколад, дым и долгое древесное послевкусие.",
    profile: { intensity: 9, tannins: 7, fruitiness: 5, freshness: 4, woodNotes: 9, sweetness: 4 },
    pairings: [
      { dish: "Тёмный шоколад 80%", emoji: "🍫", score: 91 },
      { dish: "Выдержанный кашкавал", emoji: "🧀", score: 85 },
    ],
  },
  {
    slug: "kaysieva-muscat",
    name: "Кайсиева Muscat",
    kind: "KAYSIEVA",
    abv: 40,
    volumeMl: 700,
    year: 2022,
    priceRetail: 3600,
    isLimited: false,
    producer: "Тракийска изба",
    region: "Тракия",
    description:
      "Ароматная абрикосовая с мускатной ароматикой. Сочные косточковые тона, мёд и цветы.",
    profile: { intensity: 6, tannins: 2, fruitiness: 9, freshness: 8, woodNotes: 2, sweetness: 7 },
    pairings: [
      { dish: "Баница с тыквой", emoji: "🥧", score: 89 },
      { dish: "Свежие абрикосы и мёд", emoji: "🍑", score: 94 },
    ],
  },
  {
    slug: "vishneva-noir",
    name: "Вишнёва Noir",
    kind: "VISHNEVA",
    abv: 43,
    volumeMl: 500,
    year: 2020,
    priceRetail: 4800,
    isLimited: true,
    producer: "Тракийска изба",
    region: "Родопи",
    description:
      "Лимитированная вишнёвая из горных Родоп. Тёмная вишня, миндаль, лёгкая горчинка косточки.",
    profile: { intensity: 8, tannins: 6, fruitiness: 8, freshness: 5, woodNotes: 6, sweetness: 6 },
    pairings: [
      { dish: "Утиная грудка с вишней", emoji: "🦆", score: 90 },
      { dish: "Шоколадный фондан", emoji: "🍰", score: 87 },
    ],
  },
];

export const events = [
  {
    slug: "degustaciya-iyul-2026",
    title: "Летняя дегустация: фруктовая ракия",
    startsAt: "2026-07-18T19:00:00+03:00",
    venue: "Пространство «Амбар»",
    address: "Москва, ул. Примерная, 1",
    capacity: 18,
    seatsLeft: 7,
    priceRub: 3500,
    status: "OPEN",
  },
  {
    slug: "barrel-night-avgust",
    title: "Barrel Night: выдержанные серии",
    startsAt: "2026-08-08T19:30:00+03:00",
    venue: "Винотека «Тракия»",
    address: "Москва, Гончарная наб., 9",
    capacity: 14,
    seatsLeft: 3,
    priceRub: 4500,
    status: "OPEN",
  },
];

// Средний (базовый) профиль по каталогу — для сравнения в radar chart.
export function averageProfile() {
  const acc = {};
  for (const axis of FLAVOUR_AXES) acc[axis.key] = 0;
  for (const p of products) {
    for (const axis of FLAVOUR_AXES) acc[axis.key] += p.profile[axis.key];
  }
  for (const axis of FLAVOUR_AXES) acc[axis.key] = +(acc[axis.key] / products.length).toFixed(1);
  return acc;
}

export function getProduct(slug) {
  return products.find((p) => p.slug === slug) || null;
}
