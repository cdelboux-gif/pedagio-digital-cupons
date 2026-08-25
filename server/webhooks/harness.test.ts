import { describe, expect, it } from "vitest";
import { LocalWebhookHarness, createCouponWebhookPayload } from "./harness";
import { createWebhookSignature, verifyWebhookSignature } from "./security";

const SECRET = "local_only_webhook_test_secret_32_chars";
const NOW = 1_755_000_010;

describe("local coupon webhook harness", () => {
  it.each(["coupon.created", "coupon.published", "coupon.activated", "coupon.redeemed"] as const)(
    "sends and receives %s without network access",
    event => {
      const harness = new LocalWebhookHarness(SECRET);
      const payload = createCouponWebhookPayload(event, { id: `evt_${event}` });
      const delivery = harness.send(payload);
      const result = harness.receive(delivery.rawBody, delivery.signature, NOW);

      expect(result).toEqual({ accepted: true, duplicate: false, eventId: payload.id });
      expect(harness.received).toHaveLength(1);
      expect(harness.received[0]?.event).toBe(event);
    },
  );

  it("accepts a duplicate idempotently without recording it twice", () => {
    const harness = new LocalWebhookHarness(SECRET);
    const delivery = harness.send(createCouponWebhookPayload("coupon.redeemed", { id: "evt_duplicate" }));

    expect(harness.receive(delivery.rawBody, delivery.signature, NOW).duplicate).toBe(false);
    expect(harness.receive(delivery.rawBody, delivery.signature, NOW).duplicate).toBe(true);
    expect(harness.received).toHaveLength(1);
  });

  it("rejects an old signature to prevent replay", () => {
    const payload = createCouponWebhookPayload("coupon.redeemed", { id: "evt_replay" });
    const rawBody = JSON.stringify(payload);
    const signature = createWebhookSignature(rawBody, SECRET, NOW - 301);
    const harness = new LocalWebhookHarness(SECRET);

    expect(harness.receive(rawBody, signature, NOW)).toEqual({
      accepted: false,
      duplicate: false,
      reason: "stale_timestamp",
    });
  });

  it("rejects an invalid signature and a malformed payload", () => {
    const harness = new LocalWebhookHarness(SECRET);
    const payload = createCouponWebhookPayload("coupon.created", { id: "evt_invalid" });
    const rawBody = JSON.stringify(payload);

    expect(harness.receive(rawBody, "sha256=invalid", NOW)).toMatchObject({
      accepted: false,
      reason: "malformed_signature",
    });
    const validSignature = createWebhookSignature("{broken", SECRET, NOW);
    expect(harness.receive("{broken", validSignature, NOW)).toEqual({
      accepted: false,
      duplicate: false,
      reason: "invalid_payload",
    });
  });

  it("marks a transient 503 as retryable without making an external call", () => {
    const harness = new LocalWebhookHarness(SECRET);

    expect(harness.simulateTransientFailure()).toEqual({
      accepted: false,
      retryable: true,
      status: 503,
      reason: "temporary_failure",
    });
    expect(harness.sent).toHaveLength(0);
    expect(harness.received).toHaveLength(0);
  });

  it("rejects verification when the secret is absent", () => {
    const payload = JSON.stringify(createCouponWebhookPayload("coupon.created", { id: "evt_missing_secret" }));
    const signature = createWebhookSignature(payload, SECRET, NOW);

    expect(verifyWebhookSignature({
      rawBody: payload,
      signature,
      secret: "",
      nowSeconds: NOW,
    })).toEqual({ valid: false, reason: "invalid_signature" });
  });

  it("does not expose the secret in signatures or event payloads", () => {
    const harness = new LocalWebhookHarness(SECRET);
    const delivery = harness.send(createCouponWebhookPayload("coupon.published", { id: "evt_secret" }));

    expect(delivery.rawBody).not.toContain(SECRET);
    expect(delivery.signature).not.toContain(SECRET);
  });
});
