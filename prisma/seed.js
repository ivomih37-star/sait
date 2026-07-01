// ===========================================================================
//  Сид БД — демо-данные РакияКлуб.рф
//  Запуск: npm run db:seed  (после prisma migrate)
// ===========================================================================
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Сидинг базы данных…");

  // --- Производитель ---
  const producer = await prisma.producer.upsert({
    where: { slug: "trakiyska-izba" },
    update: {},
    create: {
      slug: "trakiyska-izba",
      name: "Тракийска изба",
      region: "Тракия",
      foundedYear: 1998,
      description:
        "Семейная винокурня в сердце Тракийской низменности. Медные аламбики, традиция двойной дистилляции.",
    },
  });

  // --- Продукты + вкусовые профили (оси spider chart) ---
  const products = [
    {
      slug: "grozdova-reserve",
      name: "Гроздова Reserve",
      kind: "GROZDOVA",
      abv: 42,
      priceRetail: 3200,
      priceWholesale: 2100,
      isLimited: false,
      stock: 120,
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
      priceRetail: 4100,
      priceWholesale: 2700,
      isLimited: true,
      stock: 30,
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
      priceRetail: 3600,
      priceWholesale: 2400,
      isLimited: false,
      stock: 75,
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
      priceWholesale: 3120,
      isLimited: true,
      stock: 18,
      description:
        "Лимитированная вишнёвая из горных Родоп. Тёмная вишня, миндаль, лёгкая горчинка косточки.",
      profile: { intensity: 8, tannins: 6, fruitiness: 8, freshness: 5, woodNotes: 6, sweetness: 6 },
      pairings: [
        { dish: "Утиная грудка с вишней", emoji: "🦆", score: 90 },
        { dish: "Шоколадный фондан", emoji: "🍰", score: 87 },
      ],
    },
  ];

  for (const p of products) {
    const { profile, pairings, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...data,
        producerId: producer.id,
        tasteProfile: { create: profile },
        pairings: { create: pairings },
      },
    });
    console.log(`  ✓ продукт: ${product.name}`);
  }

  // --- События / дегустации со столами и местами ---
  const events = [
    {
      slug: "degustaciya-iyul-2026",
      title: "Летняя дегустация: фруктовая ракия",
      description: "6 образцов, слепая дегустация, гастропейринг от шефа.",
      startsAt: new Date("2026-07-18T19:00:00+03:00"),
      venue: "Пространство «Амбар»",
      address: "Москва, ул. Примерная, 1",
      priceRub: 3500,
      tables: 3,
      seatsPerTable: 6,
    },
    {
      slug: "barrel-night-avgust-2026",
      title: "Barrel Night: выдержанные серии",
      description: "Вертикальная дегустация баррель-серий, тёмный шоколад и кашкавал.",
      startsAt: new Date("2026-08-08T19:30:00+03:00"),
      venue: "Винотека «Тракия»",
      address: "Москва, Гончарная наб., 9",
      priceRub: 4500,
      tables: 2,
      seatsPerTable: 7,
    },
    {
      slug: "muscat-evening-sentyabr-2026",
      title: "Мускатный вечер: ароматные сорта",
      description: "Кайсиева и мускатные ракии, балканское мезе и живая музыка.",
      startsAt: new Date("2026-09-12T19:00:00+03:00"),
      venue: "Терраса «Родопа»",
      address: "Москва, ул. Примерная, 14",
      priceRub: 3200,
      tables: 3,
      seatsPerTable: 5,
    },
  ];

  for (const e of events) {
    const { tables, seatsPerTable, ...data } = e;
    const event = await prisma.event.upsert({
      where: { slug: e.slug },
      update: {},
      create: { ...data, capacity: tables * seatsPerTable, status: "OPEN" },
    });

    // Столы/места создаём только если их ещё нет (идемпотентность)
    const existing = await prisma.eventTable.count({ where: { eventId: event.id } });
    if (existing === 0) {
      for (let t = 1; t <= tables; t++) {
        await prisma.eventTable.create({
          data: {
            label: `Стол ${t}`,
            capacity: seatsPerTable,
            eventId: event.id,
            seats: {
              create: Array.from({ length: seatsPerTable }, (_, i) => ({ number: i + 1 })),
            },
          },
        });
      }
    }
    console.log(`  ✓ событие: ${event.title} (${tables}×${seatsPerTable} мест)`);
  }

  console.log("✅ Сидинг завершён.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
