import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Календарь ближайших открытых дегустаций со свободными местами
export async function GET() {
  const events = await prisma.event.findMany({
    where: { status: "OPEN", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      tables: { include: { seats: true } },
      _count: { select: { registrations: true } },
    },
  });

  const data = events.map((e) => {
    const seats = e.tables.flatMap((t) => t.seats);
    const free = seats.filter((s) => s.status === "FREE").length;
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      venue: e.venue,
      address: e.address,
      priceRub: e.priceRub,
      capacity: e.capacity,
      seatsFree: seats.length ? free : Math.max(e.capacity - e._count.registrations, 0),
      tables: e.tables.map((t) => ({
        id: t.id,
        label: t.label,
        seats: t.seats
          .sort((a, b) => a.number - b.number)
          .map((s) => ({ id: s.id, number: s.number, status: s.status })),
      })),
    };
  });

  return Response.json({ ok: true, events: data });
}
