// ===========================================================================
//  Доступ к событиям/дегустациям через Prisma (для главной и расписания).
// ===========================================================================
import prisma from "./prisma.js";

/** Ближайшие открытые дегустации со сводкой по свободным местам. */
export async function listUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: { status: "OPEN", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      tables: { include: { seats: true } },
      _count: { select: { registrations: true } },
    },
  });

  return events.map((e) => {
    const seats = e.tables.flatMap((t) => t.seats);
    const free = seats.length
      ? seats.filter((s) => s.status === "FREE").length
      : Math.max(e.capacity - e._count.registrations, 0);
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      startsAt: e.startsAt,
      venue: e.venue,
      address: e.address,
      priceRub: e.priceRub,
      capacity: e.capacity,
      seatsFree: free,
    };
  });
}
