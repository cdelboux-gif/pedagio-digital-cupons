import { describe, expect, it } from "vitest";
import { createWebhookSignature, verifyWebhookSignature } from "./webhooks/security";

describe("webhook signing secret", () => {
  it("validates the configured local secret through the webhook verification contract", async () => {
    const secret = process.env.WEBHOOK_TEST_SIGNING_SECRET;
    expect(secret).toBeTruthy();
    expect(secret!.length).toBeGreaterThanOrEqual(32);

    const payload = JSON.stringify({
      event: "coupon.redeemed",
      id: "evt_local_secret_check",
      occurredAt: "2026-08-25T00:00:00.000Z",
    });
    const signature = createWebhookSignature(payload, secret!, 1_755_000_000);

    const response = verifyWebhookSignature({
      rawBody: payload,
      signature,
      secret: secret!,
      nowSeconds: 1_755_000_010,
    });

    expect(response).toMatchObject({ valid: true, timestamp: 1755000000 });
  });
});
