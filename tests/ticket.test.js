import { describe, it, expect } from "vitest";
import { makeTicketCode, signTicket, verifyTicket } from "../lib/auth/ticket.js";

describe("ticket", () => {
  it("makeTicketCode даёт формат RAKI-XXXXXXXX", () => {
    expect(makeTicketCode()).toMatch(/^RAKI-[0-9A-F]{8}$/);
  });

  it("sign/verify билета — корректный round-trip", () => {
    const token = signTicket({ registrationId: "r1", eventId: "e1", userId: "u1" });
    const res = verifyTicket(token);
    expect(res.ok).toBe(true);
    expect(res.payload.rid).toBe("r1");
    expect(res.payload.eid).toBe("e1");
    expect(res.payload.uid).toBe("u1");
  });

  it("отклоняет битый токен", () => {
    expect(verifyTicket("not.a.jwt").ok).toBe(false);
  });
});
