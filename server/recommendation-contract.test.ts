import { describe, expect, it } from "vitest";
import { buildTollPassedIdempotencyKey, recommendationContractVersion, recommendationResponseSchema, tollPassedEventSchema } from "../shared/recommendation-contract";

describe("recommendation contract", () => {
  it("accepts a versioned toll passage event", () => {
    const event = tollPassedEventSchema.parse({
      version: recommendationContractVersion,
      eventName: "toll.passed",
      idempotencyKey: "recommendations.v1:toll:user-1:5:2026-08-25T12:00",
      userReference: "user-1",
      tollPlazaId: 5,
      occurredAt: "2026-08-25T12:00:00.000Z",
      accuracyMeters: 80,
      consentPersonalization: true,
      source: "app_geofence",
    });
    expect(event.source).toBe("app_geofence");
  });

  it("builds a stable key for the same user, plaza and minute", () => {
    const now = new Date("2026-08-25T12:00:20.000Z");
    expect(buildTollPassedIdempotencyKey("user-1", 5, now)).toBe("recommendations.v1:toll:user-1:5:2026-08-25T12:00");
    expect(buildTollPassedIdempotencyKey("user-1", 5, now)).toBe(buildTollPassedIdempotencyKey("user-1", 5, now));
  });

  it("rejects an unversioned or low-precision payload", () => {
    expect(() => tollPassedEventSchema.parse({ eventName: "toll.passed", idempotencyKey: "short", userReference: "u", tollPlazaId: 0, occurredAt: new Date(), accuracyMeters: 9000, consentPersonalization: false, source: "app_geofence" })).toThrow();
  });

  it("validates the response contract and preserves sponsorship disclosure", () => {
    const response = recommendationResponseSchema.parse({ version: recommendationContractVersion, eventId: 10, idempotent: false, recommendations: [{ id: 1, couponId: 2, mode: "sponsored", score: 0.72, explanation: "Oferta patrocinada nesta região", sponsorshipLabel: "Patrocinado" }] });
    expect(response.recommendations[0]?.sponsorshipLabel).toBe("Patrocinado");
  });
});
