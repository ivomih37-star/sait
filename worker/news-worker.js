// ===========================================================================
//  AI-воркер: ингест рыночных обновлений → генерация 2 вариантов →
//  запись в NewsQueue (PENDING) → отправка админу с кнопками апрува.
//  Запуск разово (системный cron на Beget) или вручную: node worker/news-worker.js
// ===========================================================================
import prisma from "../lib/prisma.js";
import { generatePostVariants } from "../lib/ai/generate.js";
import { sendForApproval } from "../lib/telegram/api.js";

/**
 * Получить свежее рыночное обновление.
 * В проде сюда подключается RSS/новостной источник по болгарскому алкорынку.
 * Пока — заглушка из переменных окружения или дефолт.
 */
async function fetchMarketUpdate() {
  return {
    title: process.env.SAMPLE_NEWS_TITLE || "Новый урожай и тренды болгарской ракии",
    summary:
      process.env.SAMPLE_NEWS_SUMMARY ||
      "Производители Тракии сообщают о сильном урожае винограда и росте интереса к выдержанным баррель-сериям.",
    url: process.env.SAMPLE_NEWS_URL || null,
  };
}

export async function runNewsCycle() {
  const update = await fetchMarketUpdate();
  console.log("📰 Источник:", update.title);

  const variants = await generatePostVariants({
    sourceTitle: update.title,
    sourceSummary: update.summary,
    sourceUrl: update.url,
  });

  const news = await prisma.newsQueue.create({
    data: {
      sourceTitle: update.title,
      sourceUrl: update.url,
      rawSummary: update.summary,
      contentFormal: variants.formal,
      contentInformal: variants.informal,
      status: "PENDING",
    },
  });
  console.log("✅ Сгенерировано, NewsQueue id:", news.id);

  // Отправляем админу на модерацию
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (token && adminChat) {
    const preview =
      `<b>${variants.title}</b>\n\n` +
      `<i>Telegram-вариант:</i>\n${variants.informal}\n\n` +
      `<i>Web/FB-вариант:</i>\n${variants.formal}`;
    const msg = await sendForApproval(token, adminChat, news.id, preview);
    await prisma.newsQueue.update({
      where: { id: news.id },
      data: { adminChatId: BigInt(adminChat), adminMessageId: BigInt(msg.message_id) },
    });
    console.log("📨 Отправлено админу на апрув.");
  } else {
    console.warn("⚠️ Не задан админ-чат/токен — пропускаю отправку на апрув.");
  }

  return news;
}

// Прямой запуск как скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  runNewsCycle()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Ошибка воркера:", e);
      process.exit(1);
    });
}
