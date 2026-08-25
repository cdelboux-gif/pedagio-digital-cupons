import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    appendAuditLog: vi.fn().mockResolvedValue(undefined),
    createEmailSender: vi.fn(),
    createEmailTemplate: vi.fn(),
    createEmailRule: vi.fn(),
    updateEmailRule: vi.fn(),
    enqueueEmailRules: vi.fn(),
    getCouponById: vi.fn(),
    updateCouponStatus: vi.fn(),
    getPartnerById: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(accessLevel: "admin" | "manager" | "operator" | "viewer" = "admin"): TrpcContext {
  return { user: { id: 7, openId: "email-test", email: "admin@example.com", name: "Admin", loginMethod: "test", role: "user", accessLevel, entityId: null, partnerId: null, storeId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("email router", () => {
  it("blocks Consulta from managing email configuration", async () => {
    const caller = appRouter.createCaller(context("viewer"));
    await expect(caller.admin.emails.senders.create({ name: "Origem", fromName: "Pedágio Digital", fromEmail: "noreply@example.com", status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.createEmailSender).not.toHaveBeenCalled();
  });

  it("creates a sender and audits the operation", async () => {
    vi.mocked(db.createEmailSender).mockResolvedValue({ id: 3, name: "Origem", fromName: "Pedágio Digital", fromEmail: "noreply@example.com", replyTo: null, status: "active" } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.admin.emails.senders.create({ name: "Origem", fromName: "Pedágio Digital", fromEmail: " NOREPLY@EXAMPLE.COM ", status: "active" })).resolves.toMatchObject({ id: 3, fromEmail: "noreply@example.com" });
    expect(db.createEmailSender).toHaveBeenCalledWith(expect.objectContaining({ fromEmail: "noreply@example.com", createdByUserId: 7 }));
    expect(db.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "create", resourceType: "email_sender", resourceId: 3 }));
  });

  it("validates templates before persistence and renders a safe preview", async () => {
    vi.mocked(db.createEmailTemplate).mockResolvedValue({ id: 8, templateKey: "coupon.redeemed" } as never);
    const caller = appRouter.createCaller(context());
    const base = { templateKey: "coupon.redeemed", name: "Resgate", status: "draft" as const, version: 1, senderId: null, subject: "Olá {{user.name}}", preheader: null, bodyHtml: "<p>{{coupon.code}}</p><script>alert(1)</script>", bodyText: "{{coupon.code}}", allowedVariables: ["user.name", "coupon.code"] };
    await expect(caller.admin.emails.templates.create(base)).resolves.toMatchObject({ id: 8 });
    expect(db.createEmailTemplate).toHaveBeenCalledWith(expect.objectContaining({ bodyHtml: "<p>{{coupon.code}}</p>" }));
    const preview = await caller.admin.emails.templates.preview({ ...base, variables: { "user.name": "<Cliente>", "coupon.code": "CAFE10" } });
    expect(preview.html).not.toContain("script");
    expect(preview.subject).toContain("<Cliente>");
    expect(preview.html).toContain("CAFE10");
  });

  it("creates and updates an email rule through the managed procedure", async () => {
    vi.mocked(db.createEmailRule).mockResolvedValue({ id: 12, name: "Regra de resgate", eventName: "coupon.redeemed", enabled: 1, cooldownSeconds: 0 } as never);
    vi.mocked(db.updateEmailRule).mockResolvedValue({ id: 12, name: "Regra atualizada", eventName: "coupon.redeemed", enabled: 0, cooldownSeconds: 60 } as never);
    const caller = appRouter.createCaller(context());
    await expect(caller.admin.emails.rules.create({ templateId: 8, name: "Regra de resgate", eventName: "coupon.redeemed", conditions: [{ field: "coupon.status", operator: "equals", value: "active" }], enabled: true, cooldownSeconds: 0 })).resolves.toMatchObject({ id: 12 });
    await expect(caller.admin.emails.rules.update({ id: 12, data: { templateId: 8, name: "Regra atualizada", eventName: "coupon.redeemed", conditions: [], enabled: false, cooldownSeconds: 60 } })).resolves.toMatchObject({ enabled: 0 });
    expect(db.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ resourceType: "email_rule" }));
  });

  it("passes a matching event to the idempotent enqueue helper", async () => {
    vi.mocked(db.enqueueEmailRules).mockResolvedValue([{ row: { id: 11, recipientEmail: "cliente@example.com", renderedSubject: "Aviso", status: "queued" }, duplicate: false }] as never);
    const caller = appRouter.createCaller(context());
    const result = await caller.admin.emails.outbox.enqueue({ eventName: "coupon.redeemed", recipientEmail: "cliente@example.com", eventKey: "use-11", variables: { "coupon.status": "active" } });
    expect(result).toHaveLength(1);
    expect(db.enqueueEmailRules).toHaveBeenCalledWith(expect.objectContaining({ eventName: "coupon.redeemed", eventKey: "use-11", createdByUserId: 7 }));
    expect(db.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({ resourceType: "email_outbox", resourceId: 11 }));
  });
});
