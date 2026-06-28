import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { validateInitData } from "../lib/telegram/validateInitData.js";

const TOKEN = "123456:UNIT_TEST_TOKEN";

function buildInitData(user, { authDate } = {}) {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify(user));
  params.set("auth_date", String(authDate ?? Math.floor(Date.now() / 1000)));
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateInitData", () => {
  it("принимает валидную подпись и парсит пользователя", () => {
    const res = validateInitData(buildInitData({ id: 7, first_name: "Иван" }), TOKEN);
    expect(res.ok).toBe(true);
    expect(res.user.id).toBe(7);
  });

  it("отклоняет подделанный hash", () => {
    const bad = buildInitData({ id: 7 }).replace(/hash=\w+/, "hash=deadbeef");
    expect(validateInitData(bad, TOKEN).ok).toBe(false);
  });

  it("отклоняет чужой токен", () => {
    const res = validateInitData(buildInitData({ id: 7 }), "999:OTHER");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("bad_hash");
  });

  it("отклоняет просроченный auth_date", () => {
    const old = buildInitData({ id: 7 }, { authDate: Math.floor(Date.now() / 1000) - 7200 });
    expect(validateInitData(old, TOKEN, 3600).reason).toBe("expired");
  });

  it("отклоняет пустые данные", () => {
    expect(validateInitData("", TOKEN).ok).toBe(false);
  });
});
