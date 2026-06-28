// ===========================================================================
//  Standalone-процесс Telegram-бота (long polling) для PM2 / Docker.
//  Запуск: node bot/index.js  (или npm run bot)
// ===========================================================================
import { createBot } from "../lib/telegram/bot.js";

const bot = createBot();

bot.catch((err) => {
  console.error("Ошибка бота:", err);
});

console.log("🤖 РакияКлуб-бот запущен (long polling)…");
bot.start({
  onStart: (info) => console.log(`Бот @${info.username} готов.`),
});

// Корректное завершение
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.once(sig, () => bot.stop());
}
