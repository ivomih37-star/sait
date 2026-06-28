import prisma from "@/lib/prisma";
import { validateInitData } from "@/lib/telegram/validateInitData";
import { makeTicketCode, signTicket } from "@/lib/auth/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Запись на дегустацию + выбор места + выпуск билета с QR-токеном
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { initData, eventId, seatId, guests = 1 } = body;

  const v = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!v.ok || !v.user?.id) {
    return Response.json({ ok: false, reason: "auth" }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { telegramId: BigInt(v.user.id) } });
      if (!user) throw new Error("user_not_found");

      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== "OPEN") throw new Error("event_unavailable");

      // Если выбрано место — занимаем его атомарно
      if (seatId) {
        const seat = await tx.seat.findUnique({ where: { id: seatId } });
        if (!seat || seat.status !== "FREE") throw new Error("seat_taken");
        await tx.seat.update({ where: { id: seatId }, data: { status: "TAKEN" } });
      }

      const ticketCode = makeTicketCode();
      const reg = await tx.registration.create({
        data: {
          userId: user.id,
          eventId,
          seatId: seatId || null,
          guests,
          status: "CONFIRMED",
          ticketCode,
          qrToken: "pending",
        },
      });

      const qrToken = signTicket({ registrationId: reg.id, eventId, userId: user.id });
      await tx.registration.update({ where: { id: reg.id }, data: { qrToken } });

      return { ticketCode, qrToken, registrationId: reg.id };
    });

    return Response.json({ ok: true, ...result });
  } catch (e) {
    const known = ["seat_taken", "event_unavailable", "user_not_found"];
    return Response.json(
      { ok: false, reason: e.message },
      { status: known.includes(e.message) ? 409 : 500 }
    );
  }
}
