// ===========================================================================
//  grammY-бот РакияКлуб: основной + админ-модерация AI-контента.
//  Используется и standalone-процессом (bot/index.js), и вебхуком.
//  Импорты — относительные с расширениями (для запуска через node).
// ===========================================================================
import { Bot, InlineKeyboard } from "grammy";
import prisma from "../prisma.js";
import { publishApproved } from "../publish.js";

const ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || "");
const TMA_URL = process.env.TMA_URL || "";

// Память о том, какой пост админ сейчас редактирует (для standalone-процесса).
const pendingEdits = new Map(); // adminId -> newsId

function isAdmin(ctx) {
  return ADMIN_CHAT_ID && String(ctx.from?.id) === ADMIN_CHAT_ID;
}

export function createBot(token = process.env.TELEGRAM_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const bot = new Bot(token);

  // --- Приветствие + кнопка открытия Mini App ---
  bot.command("start", async (ctx) => {
    const kb = TMA_URL
      ? new InlineKeyboard().webApp("🍇 Открыть РакияКлуб", TMA_URL)
      : undefined;
    await ctx.reply(
      "Добро пожаловать в Клуб любителей болгарской ракии! 🇧🇬\n" +
        "Дегустации, каталог и запись — в нашем мини-приложении.\n18+",
      { reply_markup: kb }
    );
  });

  // --- Решения админа по контенту (inline-кнопки) ---
  bot.callbackQuery(/^(approve|reject|edit):(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "Недостаточно прав", show_alert: true });
      return;
    }
    const [, action, newsId] = ctx.match;

    if (action === "approve") {
      await ctx.answerCallbackQuery({ text: "Публикую…" });
      try {
        const { ok, fails } = await publishApproved(newsId);
        await ctx.editMessageText(
          ok
            ? "✅ Опубликовано: сайт + Telegram + Facebook."
            : `⚠️ Опубликовано частично. Ошибки: ${fails.join("; ")}`
        );
      } catch (e) {
        await ctx.editMessageText(`❌ Ошибка публикации: ${e.message}`);
      }
      return;
    }

    if (action === "reject") {
      await prisma.newsQueue.update({
        where: { id: newsId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
      await ctx.answerCallbackQuery({ text: "Отклонено" });
      await ctx.editMessageText("🗑 Пост отклонён.");
      return;
    }

    if (action === "edit") {
      pendingEdits.set(ctx.from.id, newsId);
      await ctx.answerCallbackQuery();
      await ctx.reply(
        "✏️ Пришлите исправленный текст для Telegram-варианта одним сообщением.\n" +
          "Он заменит сгенерированный, после чего нажмите «Одобрить»."
      );
      return;
    }
  });

  // --- Приём исправленного текста от админа ---
  bot.on("message:text", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const newsId = pendingEdits.get(ctx.from.id);
    if (!newsId) return;
    pendingEdits.delete(ctx.from.id);

    const news = await prisma.newsQueue.update({
      where: { id: newsId },
      data: { contentInformal: ctx.message.text, status: "PENDING" },
    });

    const kb = new InlineKeyboard()
      .text("✅ Одобрить и опубликовать", `approve:${news.id}`)
      .row()
      .text("🗑 Отклонить", `reject:${news.id}`);
    await ctx.reply("Обновлённый текст сохранён:\n\n" + news.contentInformal, {
      reply_markup: kb,
    });
  });

  return bot;
}
