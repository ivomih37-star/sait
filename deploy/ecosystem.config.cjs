// ===========================================================================
//  PM2 ecosystem — альтернатива Docker (нативный деплой на Beget).
//  Файл .cjs, т.к. проект в режиме ESM ("type":"module").
//  Запуск: pm2 start deploy/ecosystem.config.cjs
// ===========================================================================
module.exports = {
  apps: [
    {
      // Веб-сервер Next (standalone)
      name: "raki-web",
      script: ".next/standalone/server.js",
      env: { NODE_ENV: "production", PORT: 3000 },
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
    },
    {
      // Telegram-бот (long polling)
      name: "raki-bot",
      script: "bot/index.js",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_memory_restart: "200M",
    },
    {
      // AI-воркер: генерация контента по расписанию (каждый день в 10:00)
      name: "raki-worker",
      script: "worker/news-worker.js",
      env: { NODE_ENV: "production" },
      autorestart: false,
      cron_restart: "0 10 * * *",
    },
  ],
};
