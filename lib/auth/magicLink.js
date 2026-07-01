// ===========================================================================
//  Magic-link для B2B-входа без пароля (подписанный одноразовый токен).
// ===========================================================================
import jwt from "jsonwebtoken";

const SECRET = process.env.MAGIC_LINK_SECRET || "dev-insecure-magic-secret";

/** Создаёт magic-link токен (15 минут). */
export function signMagicLink(email) {
  return jwt.sign({ email, t: "magic" }, SECRET, { expiresIn: "15m" });
}

/** Проверяет magic-link токен из письма. */
export function verifyMagicLink(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.t !== "magic") return { ok: false, reason: "wrong_type" };
    return { ok: true, email: payload.email };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/** Сессионный токен B2B-пользователя после успешного входа (30 дней). */
export function signSession(userId) {
  return jwt.sign({ uid: userId, t: "session" }, SECRET, { expiresIn: "30d" });
}

export function verifySession(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.t !== "session") return { ok: false, reason: "wrong_type" };
    return { ok: true, userId: payload.uid };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
