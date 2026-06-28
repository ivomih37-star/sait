// ===========================================================================
//  Серверная валидация Telegram Mini App initData (HMAC-SHA256).
//  Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ===========================================================================
import crypto from "crypto";

/**
 * Проверяет подпись initData от Telegram WebApp.
 * @param {string} initData  raw-строка window.Telegram.WebApp.initData
 * @param {string} botToken  токен бота
 * @param {number} maxAgeSec максимальный возраст auth_date (защита от replay)
 * @returns {{ ok: boolean, user?: object, reason?: string }}
 */
export function validateInitData(initData, botToken, maxAgeSec = 3600) {
  if (!initData) return { ok: false, reason: "empty" };
  if (!botToken) return { ok: false, reason: "no_bot_token" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };

  // Собираем data_check_string: все пары кроме hash, отсортированные по ключу
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  // secret = HMAC_SHA256(key="WebAppData", message=botToken)
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  // Сравнение в постоянном времени
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_hash" };
  }

  // Проверка свежести
  const authDate = Number(params.get("auth_date") || 0);
  if (maxAgeSec > 0 && authDate > 0) {
    const ageSec = Math.floor(Date.now() / 1000) - authDate;
    if (ageSec > maxAgeSec) return { ok: false, reason: "expired" };
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }

  return { ok: true, user, authDate };
}
