import { describe, expect, it } from "vitest";
import { buildNotificationIdempotencyKey, notificationV1Schema, validateNotificationContent } from "../shared/notification-contract";

describe("notification.v1", () => {
  it("accepts a structured app notification with deep link and consent context", () => {
    const result = notificationV1Schema.safeParse({ version: "notification.v1", notificationId: 10, eventName: "coupon.redeemed", recipientReference: "user-001", title: "Benefício pronto", body: "Veja seu cupom", deepLink: "pedagiodigital://cupons/10", consentContext: { required: true, purpose: "personalization" } });
    expect(result.success).toBe(true);
  });
  it("rejects unsafe or malformed deep links", () => {
    expect(validateNotificationContent({ title: "Título", body: "Texto", deepLink: "javascript:alert(1)", imageUrl: null }).success).toBe(false);
    expect(validateNotificationContent({ title: "", body: "Texto", deepLink: null, imageUrl: null }).success).toBe(false);
  });
  it("builds stable bounded idempotency keys", () => {
    const first = buildNotificationIdempotencyKey("coupon.redeemed", "user-1", 4, "event-9");
    expect(first).toBe("notification:coupon.redeemed:user-1:4:event-9");
    expect(first.length).toBeLessThanOrEqual(180);
  });
});
