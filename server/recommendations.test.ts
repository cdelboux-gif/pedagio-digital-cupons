import { describe, expect, it } from "vitest";
import { buildPassageIdempotencyKey, rankRecommendationCandidates } from "./recommendations";

const now = new Date("2026-08-25T12:00:00.000Z");
const coupon = (overrides: Record<string, unknown> = {}) => ({
  id: 10, partnerId: 1, storeId: null, code: "CAFE10", title: "Café na rota", benefit: "10% de desconto", terms: null,
  status: "active" as const, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-08-26T00:00:00.000Z", usageLimit: 100, usageCount: 2,
  itemImageKey: null, itemImageUrl: null, createdAt: now, updatedAt: now, ...overrides,
});
const campaign = (overrides: Record<string, unknown> = {}) => ({
  campaign: {
    id: 20, partnerId: 1, couponId: 10, tollPlazaId: 5, name: "Café pós-pedágio", mode: "activated_benefit" as const,
    sponsorshipLabel: null, startsAt: "2026-08-01T00:00:00.000Z", endsAt: "2026-08-26T00:00:00.000Z", budgetLimit: null,
    bidAmount: null, spentAmount: "0", frequencyCap: 1, status: "active" as const, createdByUserId: 1, createdAt: now, updatedAt: now, ...overrides,
  },
  coupon: coupon(),
});

describe("recommendation engine", () => {
  it("keeps only eligible active candidates and explains the event context", () => {
    const ranked = rankRecommendationCandidates([campaign(), campaign({ id: 21, status: "paused" })], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: false });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.explanation).toContain("passagem");
  });

  it("does not expose personalized offers without consent", () => {
    const ranked = rankRecommendationCandidates([campaign({ mode: "personalized" })], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: false });
    expect(ranked).toEqual([]);
  });

  it("limits the sponsored boost and labels the recommendation", () => {
    const ranked = rankRecommendationCandidates([campaign({ mode: "sponsored", bidAmount: "9999", sponsorshipLabel: "Patrocinado" })], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: true });
    expect(ranked[0]?.score).toBeLessThanOrEqual(1);
    expect(ranked[0]?.explanation).toBe("Patrocinado");
  });

  it("blocks repeated exposure, exhausted budgets and excluded partners", () => {
    const repeated = rankRecommendationCandidates([campaign()], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: true, campaignExposureCounts: { 20: 1 } });
    const exhausted = rankRecommendationCandidates([campaign({ budgetLimit: 10, spentAmount: "10" })], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: true });
    const excluded = rankRecommendationCandidates([campaign()], { now, userReference: "user-1", tollPlazaId: 5, consentPersonalization: true, excludedPartnerIds: [1] });
    expect(repeated).toEqual([]);
    expect(exhausted).toEqual([]);
    expect(excluded).toEqual([]);
  });

  it("builds a stable idempotency key per user, toll and minute", () => {
    const key = buildPassageIdempotencyKey("user-1", 5, now);
    expect(key).toBe("toll:user-1:5:2026-08-25T12:00");
    expect(buildPassageIdempotencyKey("user-1", 5, now)).toBe(key);
  });
});
