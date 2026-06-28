import prisma from "@/lib/prisma";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Цифровой билет: данные регистрации + QR (data URL) по публичному коду
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return Response.json({ ok: false, reason: "no_code" }, { status: 400 });

  const reg = await prisma.registration.findUnique({
    where: { ticketCode: code },
    include: { event: true, seat: { include: { table: true } }, user: true },
  });
  if (!reg) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });

  // QR кодирует ссылку проверки с подписанным токеном
  const base = process.env.APP_BASE_URL || "";
  const verifyUrl = `${base}/api/tma/ticket?verify=${encodeURIComponent(reg.qrToken)}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 320 });

  return Response.json({
    ok: true,
    ticket: {
      code: reg.ticketCode,
      status: reg.status,
      checkedIn: reg.checkedIn,
      guests: reg.guests,
      event: {
        title: reg.event.title,
        startsAt: reg.event.startsAt,
        venue: reg.event.venue,
        address: reg.event.address,
      },
      seat: reg.seat ? { table: reg.seat.table.label, number: reg.seat.number } : null,
      holder: reg.user.name,
      qr,
    },
  });
}
