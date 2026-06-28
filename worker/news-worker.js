// ===========================================================================
//  AI-воркер: ингест рыночных обновлений → генерация 2 вариантов →
//  запись в NewsQueue (PENDING) → отправка админу с кнопками апрува.
//  Запуск разово (системный cron на Beget) или вручную: node worker/news-worker.js
// ===========================================================================
import prisma from "../lib/prisma.js";
import { generatePostVariants } from "../lib/ai/generate.js";
import { sendForApproval } from "../lib/telegram/api.js";
import { fetchLatestUnseen, DEFAULT_FEEDS } from "../lib/ai/rss.js";

/**
 * Получить свежее рыночное обновление из RSS-лент по болгарскому алкорынку.
 * Дедуп по уже обработанным sourceUrl в NewsQueue.
 * Список лент — в RSS_FEEDS (через запятую) или дефолтный.
 */
async function fetchMarketUpdate() {
  const feeds = (process.env.RSS_FEEDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const recent = await prisma.newsQueue.findMany({
    where: { sourceUrl: { not: null } },
    select: { sourceUrl: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const seen = new Set(recent.map((r) => r.sourceUrl));

  const item = await fetchLatestUnseen({
    feeds: feeds.length ? feeds : DEFAULT_FEEDS,
    seenUrls: seen,
  });
  if (item) return item;

  // Явный фолбэк-источник (если ленты недоступны/пусты и задан в env)
  if (process.env.SAMPLE_NEWS_SUMMARY) {
    return {
      title: process.env.SAMPLE_NEWS_TITLE || "Новость клуба",
      summary: process.env.SAMPLE_NEWS_SUMMARY,
      url: process.env.SAMPLE_NEWS_URL || null,
    };
  }
  return null;
}

export async function runNewsCycle() {
  const update = await fetchMarketUpdate();
  if (!update) {
    console.log("ℹ️ Новых новостей в лентах нет — пропускаю цикл.");
    return null;
  }
  console.log("📰 Источник:", update.title, update.url ? `(${update.url})` : "");

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
