import { describe, expect, it } from "vitest";
import * as db from "./db";
import { appendAuditLog, redactAuditValue } from "./db";
import {
  buildEmailIdempotencyKey,
  extractEmailVariables,
  matchEmailConditions,
  normalizeEmailAddress,
  renderEmail,
  sanitizeEmailHtml,
  validateEmailTemplate,
} from "./email";

describe("email safety and rule helpers", () => {
  it("removes executable markup and event handlers from HTML", () => {
    const sanitized = sanitizeEmailHtml('<p>Olá</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">link</a>');
    expect(sanitized).toContain("<p>Olá</p>");
    expect(sanitized).not.toMatch(/script|onerror|javascript/i);
  });

  it("rejects variables that are not explicitly allowed", () => {
    expect(() => validateEmailTemplate({ subject: "Olá {{user.name}}", preheader: null, bodyHtml: "<p>{{coupon.code}}</p>", allowedVariables: ["user.name"] })).toThrow("Variáveis não permitidas: coupon.code");
  });

  it("deduplicates variables and keeps only the sanitized body", () => {
    const result = validateEmailTemplate({ subject: "Olá {{user.name}}", preheader: "{{user.name}}", bodyHtml: "<p>{{user.name}}</p><style>bad</style>", allowedVariables: ["user.name", "user.name"] });
    expect(result.allowedVariables).toEqual(["user.name"]);
    expect(result.bodyHtml).toBe("<p>{{user.name}}</p>");
    expect(extractEmailVariables(result.bodyHtml)).toEqual(["user.name"]);
  });

  it("escapes rendered variable values instead of interpreting them as markup", () => {
    expect(renderEmail("Olá {{user.name}}", { "user.name": "<Admin> & equipe" })).toBe("Olá &lt;Admin&gt; &amp; equipe");
  });

  it("requires every rule condition to match", () => {
    expect(matchEmailConditions([{ field: "coupon.status", operator: "equals", value: "active" }, { field: "coupon.discount", operator: "gte", value: 10 }], { "coupon.status": "active", "coupon.discount": 20 })).toBe(true);
    expect(matchEmailConditions([{ field: "coupon.discount", operator: "gt", value: 10 }], { "coupon.discount": 10 })).toBe(false);
    expect(matchEmailConditions([{ field: "coupon.title", operator: "contains", value: "café" }], { "coupon.title": "Café especial" })).toBe(true);
  });

  it("normalizes recipients and creates deterministic idempotency keys", () => {
    expect(normalizeEmailAddress("  Cliente@Example.COM ")).toBe("cliente@example.com");
    const first = buildEmailIdempotencyKey("coupon.redeemed", " Cliente@Example.COM ", 4, "event-9");
    const second = buildEmailIdempotencyKey("coupon.redeemed", "cliente@example.com", 4, "event-9");
    const different = buildEmailIdempotencyKey("coupon.redeemed", "cliente@example.com", 4, "event-10");
    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });
});

describe("audit redaction", () => {
  it("stores a null actor id when the actor row no longer exists", async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const fakeDb = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async (value: Record<string, unknown>) => { inserted.push(value); } }),
    };
    db.setDbForTests(fakeDb);
    await appendAuditLog({ actorUserId: 999999, actorEmail: "removed@example.com", action: "update", resourceType: "access", resourceId: 1, after: { accessLevel: "viewer" } });
    db.clearDbForTests();
    expect(inserted[0]).toMatchObject({ actorUserId: null, actorEmail: "removed@example.com" });
  });

  it("removes secrets recursively while preserving operational context", () => {
    const result = redactAuditValue({ tokenHash: "token", user: { email: "admin@example.com", secretHash: "secret", scope: { partnerId: 4 } }, values: [{ dataUrl: "data", action: "update" }] });
    expect(result).toEqual({ user: { email: "admin@example.com", scope: { partnerId: 4 } }, values: [{ action: "update" }] });
  });
});
