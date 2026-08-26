import { describe, expect, it } from "vitest";
import { buildConsentRevisionKey, consentPreferencesSchema, consentVersion } from "../shared/consent-contract";

describe("consent preferences contract", () => {
  it("accepts independent choices for each purpose", () => {
    const preferences = consentPreferencesSchema.parse({
      consentVersion,
      userReference: "user-rotating-1",
      capturedAt: "2026-08-26T12:00:00.000Z",
      source: "app",
      appVersion: "2.4.0",
      locale: "pt-BR",
      purposes: {
        journeyGeolocation: { status: "granted", scope: "approximate_route_context", decidedAt: "2026-08-26T12:00:00.000Z" },
        personalizedRecommendations: { status: "denied", scope: null, decidedAt: "2026-08-26T12:00:00.000Z" },
        sponsoredRecommendations: { status: "paused", scope: "contextual_offers", decidedAt: "2026-08-26T12:00:00.000Z" },
      },
    });
    expect(preferences.purposes.journeyGeolocation.status).toBe("granted");
    expect(preferences.purposes.personalizedRecommendations.status).toBe("denied");
    expect(preferences.purposes.sponsoredRecommendations.status).toBe("paused");
  });

  it("rejects an unknown version or missing purpose", () => {
    expect(() => consentPreferencesSchema.parse({ consentVersion: "consent-v0", userReference: "user", capturedAt: new Date(), source: "app", appVersion: "1.0", locale: "pt-BR", purposes: {} })).toThrow();
  });

  it("builds an idempotent key for a purpose revision", () => {
    const decidedAt = new Date("2026-08-26T12:00:00.000Z");
    const key = buildConsentRevisionKey("user-rotating-1", "journeyGeolocation", decidedAt);
    expect(key).toBe("consent-v1.0:user-rotating-1:journeyGeolocation:2026-08-26T12:00:00.000Z");
    expect(key).toBe(buildConsentRevisionKey("user-rotating-1", "journeyGeolocation", decidedAt));
  });
});
