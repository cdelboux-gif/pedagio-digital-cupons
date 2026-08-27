import { describe, expect, it } from "vitest";
import { recommendationContractVersion, recommendationResponseSchema, tollPassedEventSchema, buildTollPassedIdempotencyKey } from "../shared/recommendation-contract";

describe("app integration contract", () => {
  it("accepts a pseudonymized toll.passed event with granular consent", () => {
    const event = tollPassedEventSchema.parse({
      version: recommendationContractVersion,
      eventName: "toll.passed",
      idempotencyKey: "recommendations.v1:toll:user-demo-001:12:2026-08-27T14:30",
      userReference: "user-demo-001",
      tollPlazaId: 12,
      occurredAt: "2026-08-27T14:30:00.000Z",
      accuracyMeters: 80,
      consentPersonalization: true,
      source: "app_geofence",
    });

    expect(event.userReference).toBe("user-demo-001");
    expect(event.accuracyMeters).toBe(80);
  });

  it("keeps retries idempotent for the same user, plaza and minute", () => {
    const occurredAt = new Date("2026-08-27T14:30:42.000Z");
    const first = buildTollPassedIdempotencyKey("user-demo-001", 12, occurredAt);
    const retry = buildTollPassedIdempotencyKey("user-demo-001", 12, occurredAt);

    expect(retry).toBe(first);
    expect(first).toContain("user-demo-001:12:2026-08-27T14:30");
  });

  it("validates the response contract and preserves an empty personalized result", () => {
    const response = recommendationResponseSchema.parse({
      version: recommendationContractVersion,
      eventId: 42,
      idempotent: true,
      recommendations: [],
    });

    expect(response.idempotent).toBe(true);
    expect(response.recommendations).toEqual([]);
  });
});
