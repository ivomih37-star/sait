import { webhookCallback } from "grammy";
import { createBot } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Вебхук Telegram → grammY. Альтернатива long polling для serverless/прода.
let handler = null;
function getHandler() {
  if (!handler) {
    const bot = createBot();
    handler = webhookCallback(bot, "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
    });
  }
  return handler;
}

export async function POST(req) {
  try {
    return await getHandler()(req);
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
