import { randomUUID } from "node:crypto";
import { createWebhookSignature, verifyWebhookSignature } from "./security";

export const COUPON_WEBHOOK_EVENTS = [
  "coupon.created",
  "coupon.published",
  "coupon.activated",
  "coupon.redeemed",
] as const;

export type CouponWebhookEvent = (typeof COUPON_WEBHOOK_EVENTS)[number];

export type CouponWebhookPayload = {
  id: string;
  event: CouponWebhookEvent;
  version: "2026-01";
  occurredAt: string;
  source: "backoffice" | "partner";
  coupon: {
    id: string;
    code: string;
    partnerId: string;
  };
  data: Record<string, unknown>;
};

export function createCouponWebhookPayload(
  event: CouponWebhookEvent,
  overrides: Partial<CouponWebhookPayload> = {},
): CouponWebhookPayload {
  return {
    id: overrides.id ?? `evt_${randomUUID()}`,
    event,
    version: "2026-01",
    occurredAt: new Date().toISOString(),
    source: "backoffice",
    coupon: {
      id: "coupon_test_001",
      code: "TESTE10",
      partnerId: "partner_test_001",
    },
    data: {},
    ...overrides,
  };
}

export class LocalWebhookHarness {
  private readonly receivedIds = new Set<string>();
  readonly sent: Array<{ payload: CouponWebhookPayload; signature: string }> = [];
  readonly received: CouponWebhookPayload[] = [];

  constructor(private readonly secret: string) {}

  send(payload: CouponWebhookPayload, timestamp = 1_755_000_000) {
    const rawBody = JSON.stringify(payload);
    const signature = createWebhookSignature(rawBody, this.secret, timestamp);
    this.sent.push({ payload, signature });
    return { rawBody, signature };
  }

  simulateTransientFailure() {
    return { accepted: false as const, retryable: true as const, status: 503 as const, reason: "temporary_failure" as const };
  }

  receive(rawBody: string, signature: string, nowSeconds = 1_755_000_010) {
    const verification = verifyWebhookSignature({
      rawBody,
      signature,
      secret: this.secret,
      nowSeconds,
    });
    if (!verification.valid) return { accepted: false as const, duplicate: false, reason: verification.reason };

    let payload: CouponWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as CouponWebhookPayload;
    } catch {
      return { accepted: false as const, duplicate: false, reason: "invalid_payload" as const };
    }
    if (this.receivedIds.has(payload.id)) {
      return { accepted: true as const, duplicate: true, eventId: payload.id };
    }

    this.receivedIds.add(payload.id);
    this.received.push(payload);
    return { accepted: true as const, duplicate: false, eventId: payload.id };
  }
}
