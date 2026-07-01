import prisma from "@/lib/prisma";
import { signMagicLink, verifyMagicLink, signSession } from "@/lib/auth/magicLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// B2B-вход без пароля: запрос magic-link и его проверка
export async function POST(req) {
  const { action, email, token } = await req.json().catch(() => ({}));

  // 1) Запрос ссылки
  if (action === "request") {
    if (!email || !/.+@.+\..+/.test(email)) {
      return Response.json({ ok: false, reason: "bad_email" }, { status: 400 });
    }
    const link = signMagicLink(email);
    await prisma.magicLink.create({
      data: { token: link, email, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });
    const url = `${process.env.APP_BASE_URL || ""}/b2b/login?token=${encodeURIComponent(link)}`;
    // В проде ссылка уходит на email; в dev возвращаем напрямую.
    const dev = process.env.NODE_ENV !== "production";
    return Response.json({ ok: true, sent: true, ...(dev ? { devLink: url } : {}) });
  }

  // 2) Проверка ссылки → выдача сессии
  if (action === "verify") {
    const v = verifyMagicLink(token);
    if (!v.ok) return Response.json({ ok: false, reason: v.reason }, { status: 401 });

    const record = await prisma.magicLink.findUnique({ where: { token } });
    if (!record || record.usedAt) {
      return Response.json({ ok: false, reason: "used_or_missing" }, { status: 401 });
    }

    const user = await prisma.user.upsert({
      where: { email: v.email },
      update: { role: "B2B" },
      create: { email: v.email, role: "B2B" },
    });
    await prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date(), userId: user.id },
    });

    const session = signSession(user.id);
    const profile = await prisma.b2bProfile.findUnique({ where: { userId: user.id } });
    return Response.json({
      ok: true,
      session,
      user: { id: user.id, email: user.email },
      hasProfile: !!profile,
      profileStatus: profile?.status || null,
    });
  }

  return Response.json({ ok: false, reason: "unknown_action" }, { status: 400 });
}
