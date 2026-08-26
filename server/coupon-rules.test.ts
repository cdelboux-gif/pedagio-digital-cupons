import { describe, expect, it } from "vitest";
import { evaluateCouponRules, type CouponRuleDefinition, type CouponRuleContext } from "./coupon-rules";

const rule = (overrides: Partial<CouponRuleDefinition> = {}): CouponRuleDefinition => ({
  discountType: "percentage", discountValue: 10, minimumPurchaseAmount: 50,
  maxRedemptionsPerCustomer: 1, maxRedemptionsPerVehicle: 0, maxRedemptionsPerPlate: 0,
  allowedWeekdays: [], allowedStartTime: null, allowedEndTime: null, timezone: "America/Sao_Paulo",
  audience: null, radiusMeters: 0, latitude: null, longitude: null, financialLimit: 1000,
  financialUsed: 0, maxRedemptions: 100, newCustomerOnly: false, validationMode: "code",
  stackingPolicy: "non_stackable", ...overrides,
});

const context = (overrides: Partial<CouponRuleContext> = {}): CouponRuleContext => ({
  now: new Date("2026-08-26T15:00:00.000Z"), purchaseAmount: 100, customerReference: "customer-hash",
  vehicleReference: "vehicle-hash", plateReference: "plate-hash", customerRedemptions: 0,
  vehicleRedemptions: 0, plateRedemptions: 0, totalRedemptions: 1, isNewCustomer: true,
  audienceSegments: ["frequent-traveler"], storeId: 10, participatingStoreIds: [10],
  latitude: -23.55, longitude: -46.63, presentedCredential: "QR-SIGNED", existingAppliedCouponIds: [], ...overrides,
});

describe("coupon rules engine", () => {
  it("calculates percentage and fixed discounts", () => {
    expect(evaluateCouponRules(rule(), context()).discountAmount).toBe(10);
    expect(evaluateCouponRules(rule({ discountType: "fixed", discountValue: 25 }), context()).discountAmount).toBe(25);
  });

  it("enforces minimum purchase, customer limit and campaign limit", () => {
    const decision = evaluateCouponRules(rule(), context({ purchaseAmount: 20, customerRedemptions: 1 }));
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(["minimum_purchase_not_met", "customer_limit_reached"]));
    expect(evaluateCouponRules(rule({ maxRedemptions: 1 }), context()).reasons).toContain("campaign_redemption_limit_reached");
  });

  it("enforces weekday and local time windows", () => {
    const decision = evaluateCouponRules(rule({ allowedWeekdays: [2], allowedStartTime: "13:00", allowedEndTime: "14:00" }), context());
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(["weekday_not_allowed", "time_window_not_allowed"]));
  });

  it("enforces participating stores, radius and audience", () => {
    const decision = evaluateCouponRules(rule({ audience: { requiredSegments: ["vip"] }, radiusMeters: 100, latitude: -23.55, longitude: -46.63 }), context({ storeId: 99, latitude: -23.6, longitude: -46.7 }));
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining(["store_not_participating", "audience_not_eligible", "outside_geographic_radius"]));
  });

  it("enforces new customer, credential and stacking rules", () => {
    const decision = evaluateCouponRules(rule({ newCustomerOnly: true, validationMode: "qr", stackingPolicy: "non_stackable" }), context({ isNewCustomer: false, presentedCredential: null, existingAppliedCouponIds: [5] }));
    expect(decision.reasons).toEqual(expect.arrayContaining(["new_customer_only", "validation_credential_required", "coupon_not_stackable"]));
  });

  it("enforces financial limit without granting a partial discount", () => {
    const decision = evaluateCouponRules(rule({ financialLimit: 5, financialUsed: 0 }), context());
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toContain("financial_limit_would_be_exceeded");
    expect(decision.discountAmount).toBe(0);
  });
});
