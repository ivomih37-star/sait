// ===========================================================================
//  Подпись и проверка QR-билетов (JWT).
// ===========================================================================
import jwt from "jsonwebtoken";
import crypto from "crypto";

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";

/** Короткий публичный код билета вида RAKI-XXXXXX. */
export function makeTicketCode() {
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `RAKI-${raw}`;
}

/** Подписанный токен, который кладётся в QR. */
export function signTicket({ registrationId, eventId, userId }) {
  return jwt.sign({ rid: registrationId, eid: eventId, uid: userId }, SECRET, {
    expiresIn: "180d",
  });
}

/** Проверка QR-токена при контроле на входе. */
export function verifyTicket(token) {
  try {
    return { ok: true, payload: jwt.verify(token, SECRET) };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
