// ===========================================================================
//  Оркестратор публикации одобренного контента:
//  Web (флаг в БД) + Telegram-канал + Facebook Page.
// ===========================================================================
import prisma from "./prisma.js";
import { sendMessage } from "./telegram/api.js";
import { publishToFacebook } from "./facebook/graph.js";

/**
 * Публикует запись NewsQueue во все каналы и проставляет флаги/ошибки.
 * @param {string} newsId
 */
export async function publishApproved(newsId) {
  const news = await prisma.newsQueue.findUnique({ where: { id: newsId } });
  if (!news) throw new Error("news_not_found");

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID;
  const fails = [];

  // 1) Web — пост становится виден на сайте (флаг публикации)
  let publishedWeb = true;

  // 2) Telegram-канал — живой вариант с эмодзи
  let publishedTelegram = false;
  let telegramPostId = null;
  if (token && channel && news.contentInformal) {
    try {
      const res = await sendMessage(token, channel, news.contentInformal);
      publishedTelegram = true;
      telegramPostId = String(res.message_id);
    } catch (e) {
      fails.push(`telegram: ${e.message}`);
    }
  }

  // 3) Facebook — аналитический вариант
  let publishedFacebook = false;
  let facebookPostId = null;
  if (news.contentFormal) {
    const fb = await publishToFacebook(news.contentFormal);
    if (fb.ok) {
      publishedFacebook = true;
      facebookPostId = fb.id;
    } else if (fb.error !== "facebook_not_configured") {
      fails.push(`facebook: ${fb.error}`);
    }
  }

  const updated = await prisma.newsQueue.update({
    where: { id: newsId },
    data: {
      status: fails.length ? "FAILED" : "PUBLISHED",
      publishedWeb,
      publishedTelegram,
      publishedFacebook,
      telegramPostId,
      facebookPostId,
      failReason: fails.length ? fails.join("; ") : null,
      publishedAt: new Date(),
    },
  });

  return { ok: !fails.length, news: updated, fails };
}
