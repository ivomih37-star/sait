import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Контроль на входе: отметка прихода гостя по QR-токену или коду билета.
// Защищён админ-секретом (его держит устройство персонала-сканера).
function authed(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  return process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

function summary(reg) {
  return {
    code: reg.ticketCode,
    holder: reg.user?.name || reg.user?.username || null,
    guests: reg.guests,
    event: reg.event?.title,
    startsAt: reg.event?.startsAt,
    seat: reg.seat ? { table: reg.seat.table.label, number: reg.seat.number } : null,
  };
}

export async function POST(req) {
  if (!authed(req)) return Response.json({ ok: false, reason: "auth" }, { status: 401 });

  const { token, code } = await req.json().catch(() => ({}));
  if (!token && !code) {
    return Response.json({ ok: false, reason: "no_input" }, { status: 400 });
  }

  const where = token ? { qrToken: token } : { ticketCode: code };
  const reg = await prisma.registration.findUnique({
    where,
    include: { event: true, seat: { include: { table: true } }, user: true },
  });
  if (!reg) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });

  if (reg.checkedIn) {
    return Response.json({ ok: true, already: true, ticket: summary(reg) });
  }

  const updated = await prisma.registration.update({
    where: { id: reg.id },
    data: { checkedIn: true, status: "CHECKED_IN" },
    include: { event: true, seat: { include: { table: true } }, user: true },
  });
  return Response.json({ ok: true, already: false, ticket: summary(updated) });
}
