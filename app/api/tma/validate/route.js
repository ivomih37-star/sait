import prisma from "@/lib/prisma";
import { validateInitData } from "@/lib/telegram/validateInitData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Валидация Telegram initData + upsert пользователя
export async function POST(req) {
  const { initData } = await req.json().catch(() => ({}));
  const res = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!res.ok) {
    return Response.json({ ok: false, reason: res.reason }, { status: 401 });
  }
  const tg = res.user;
  if (!tg?.id) return Response.json({ ok: false, reason: "no_user" }, { status: 401 });

  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(tg.id) },
    update: {
      username: tg.username || null,
      name: [tg.first_name, tg.last_name].filter(Boolean).join(" ") || null,
      avatarUrl: tg.photo_url || null,
    },
    create: {
      telegramId: BigInt(tg.id),
      username: tg.username || null,
      name: [tg.first_name, tg.last_name].filter(Boolean).join(" ") || null,
      avatarUrl: tg.photo_url || null,
      role: "USER",
    },
  });

  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
}
