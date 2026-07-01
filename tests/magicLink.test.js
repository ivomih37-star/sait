import { describe, it, expect } from "vitest";
import {
  signMagicLink,
  verifyMagicLink,
  signSession,
  verifySession,
} from "../lib/auth/magicLink.js";

describe("magicLink", () => {
  it("magic-link round-trip с email", () => {
    const token = signMagicLink("bar@horeca.ru");
    const res = verifyMagicLink(token);
    expect(res.ok).toBe(true);
    expect(res.email).toBe("bar@horeca.ru");
  });

  it("сессия не проходит проверку magic-link (разные типы)", () => {
    const session = signSession("u1");
    expect(verifyMagicLink(session).ok).toBe(false);
  });

  it("session round-trip", () => {
    const res = verifySession(signSession("u42"));
    expect(res.ok).toBe(true);
    expect(res.userId).toBe("u42");
  });

  it("magic-link не проходит как сессия", () => {
    expect(verifySession(signMagicLink("x@y.z")).ok).toBe(false);
  });
});
