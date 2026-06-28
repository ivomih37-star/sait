// ===========================================================================
//  AI-генерация контента через Anthropic Claude (официальный SDK).
//  По рыночной выжимке создаёт ДВА варианта поста:
//   1) formal   — аналитический, для Web и Facebook
//   2) informal — живой, с эмодзи, для Telegram
//  Модель по умолчанию — claude-opus-4-8 (переопределяется AI_MODEL).
// ===========================================================================
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

const SYSTEM = `Ты — контент-редактор «Клуба любителей болгарской ракии» (РакияКлуб.рф, Москва).
Пишешь по-русски про культуру болгарской ракии: дегустации, производители, сорта, гастрономия.
Тон: премиальный, современный, без этно-клише. Всегда добавляй пометку 18+ и не призывай к
злоупотреблению алкоголем. Никогда не выдумывай факты — опирайся только на присланную выжимку.`;

// Просим строго JSON, чтобы надёжно распарсить два варианта на любой версии SDK.
const INSTRUCTION = `Сделай два варианта поста по новости.
Ответь ТОЛЬКО валидным JSON-объектом без markdown-обрамления, со строковыми полями:
{"title": "...", "formal": "аналитический пост для сайта и Facebook, без эмодзи",
 "informal": "живой пост для Telegram с уместными эмодзи и призывом к обсуждению"}`;

function extractText(message) {
  return (message.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJsonLoose(text) {
  let t = text.trim();
  // Срезаем возможные ```json ... ``` ограждения
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

/**
 * Генерирует два варианта поста по рыночной новости.
 * @param {{ sourceTitle?: string, sourceSummary: string, sourceUrl?: string }} input
 * @returns {Promise<{title:string, formal:string, informal:string}>}
 */
export async function generatePostVariants({ sourceTitle, sourceSummary, sourceUrl }) {
  const client = new Anthropic(); // ANTHROPIC_API_KEY из окружения

  const userText = [
    "Новость/обновление рынка болгарской ракии:",
    sourceTitle ? `Заголовок: ${sourceTitle}` : null,
    `Суть: ${sourceSummary}`,
    sourceUrl ? `Источник: ${sourceUrl}` : null,
    "",
    INSTRUCTION,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("AI отклонил генерацию (refusal)");
  }

  const parsed = parseJsonLoose(extractText(message));
  if (!parsed.formal || !parsed.informal) {
    throw new Error("AI вернул неполный результат");
  }
  return {
    title: parsed.title || sourceTitle || "Новость клуба",
    formal: parsed.formal,
    informal: parsed.informal,
  };
}
