// ===========================================================================
//  Тонкие хелперы поверх Telegram Bot API (без зависимостей).
//  Используются для публикации в канал и ответов на callback из вебхука.
// ===========================================================================
const API = "https://api.telegram.org";

async function call(token, method, payload) {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

/** Отправить сообщение (в канал или личку). */
export function sendMessage(token, chatId, text, extra = {}) {
  return call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

/** Отправить админу пост на модерацию с inline-кнопками. */
export function sendForApproval(token, adminChatId, newsId, preview) {
  return sendMessage(token, adminChatId, preview, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Одобрить и опубликовать", callback_data: `approve:${newsId}` },
        ],
        [
          { text: "✏️ Править", callback_data: `edit:${newsId}` },
          { text: "🗑 Отклонить", callback_data: `reject:${newsId}` },
        ],
      ],
    },
  });
}

/** Ответить на нажатие inline-кнопки (убрать «часики»). */
export function answerCallback(token, callbackQueryId, text = "") {
  return call(token, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

/** Обновить текст ранее отправленного сообщения (после решения админа). */
export function editMessageText(token, chatId, messageId, text) {
  return call(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  });
}
