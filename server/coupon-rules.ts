export type CouponDiscountType = "percentage" | "fixed";
export type CouponStackingPolicy = "stackable" | "non_stackable";
export type CouponValidationMode = "code" | "qr" | "automatic";

export type CouponRuleDefinition = {
  discountType: CouponDiscountType;
  discountValue: number;
  minimumPurchaseAmount: number;
  maxRedemptionsPerCustomer: number;
  maxRedemptionsPerVehicle: number;
  maxRedemptionsPerPlate: number;
  allowedWeekdays: number[];
  allowedStartTime: string | null;
  allowedEndTime: string | null;
  timezone: string;
  audience: { requiredSegments?: string[]; excludedSegments?: string[] } | null;
  radiusMeters: number;
  latitude: number | null;
  longitude: number | null;
  financialLimit: number | null;
  financialUsed: number;
  maxRedemptions: number;
  newCustomerOnly: boolean;
  validationMode: CouponValidationMode;
  stackingPolicy: CouponStackingPolicy;
};

export type CouponRuleContext = {
  now: Date;
  purchaseAmount: number;
  customerReference?: string | null;
  vehicleReference?: string | null;
  plateReference?: string | null;
  customerRedemptions: number;
  vehicleRedemptions: number;
  plateRedemptions: number;
  totalRedemptions: number;
  isNewCustomer: boolean;
  audienceSegments?: string[];
  storeId?: number | null;
  participatingStoreIds?: number[];
  latitude?: number | null;
  longitude?: number | null;
  presentedCredential?: string | null;
  existingAppliedCouponIds?: number[];
};

export type CouponRuleDecision = {
  eligible: boolean;
  reasons: string[];
  discountAmount: number;
  remainingFinancialLimit: number | null;
};

function localTimeParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find(part => part.type === "weekday")?.value ?? "");
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
  return { weekday, minutes: hour * 60 + minute };
}

function parseTime(value: string | null) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return Number.isInteger(hour) && Number.isInteger(minute) ? hour * 60 + minute : null;
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function evaluateCouponRules(rule: CouponRuleDefinition, context: CouponRuleContext): CouponRuleDecision {
  const reasons: string[] = [];
  if (!Number.isFinite(rule.discountValue) || rule.discountValue <= 0) reasons.push("discount_value_invalid");
  if (rule.discountType === "percentage" && rule.discountValue > 100) reasons.push("discount_percentage_above_100");
  if (context.purchaseAmount < rule.minimumPurchaseAmount) reasons.push("minimum_purchase_not_met");
  if (rule.maxRedemptionsPerCustomer > 0 && (!context.customerReference || context.customerRedemptions >= rule.maxRedemptionsPerCustomer)) reasons.push("customer_limit_reached");
  if (rule.maxRedemptionsPerVehicle > 0 && (!context.vehicleReference || context.vehicleRedemptions >= rule.maxRedemptionsPerVehicle)) reasons.push("vehicle_limit_reached");
  if (rule.maxRedemptionsPerPlate > 0 && (!context.plateReference || context.plateRedemptions >= rule.maxRedemptionsPerPlate)) reasons.push("plate_limit_reached");
  if (rule.maxRedemptions > 0 && context.totalRedemptions >= rule.maxRedemptions) reasons.push("campaign_redemption_limit_reached");
  if (rule.newCustomerOnly && !context.isNewCustomer) reasons.push("new_customer_only");
  if (rule.allowedWeekdays.length > 0 || rule.allowedStartTime || rule.allowedEndTime) {
    const local = localTimeParts(context.now, rule.timezone);
    if (rule.allowedWeekdays.length > 0 && !rule.allowedWeekdays.includes(local.weekday)) reasons.push("weekday_not_allowed");
    const start = parseTime(rule.allowedStartTime);
    const end = parseTime(rule.allowedEndTime);
    if (start !== null && end !== null && (local.minutes < start || local.minutes > end)) reasons.push("time_window_not_allowed");
  }
  if (context.participatingStoreIds?.length && (!context.storeId || !context.participatingStoreIds.includes(context.storeId))) reasons.push("store_not_participating");
  if (rule.audience?.requiredSegments?.some(segment => !context.audienceSegments?.includes(segment))) reasons.push("audience_not_eligible");
  if (rule.audience?.excludedSegments?.some(segment => context.audienceSegments?.includes(segment))) reasons.push("audience_excluded");
  if (rule.radiusMeters > 0 && rule.latitude !== null && rule.longitude !== null) {
    if (context.latitude == null || context.longitude == null || distanceInMeters(rule.latitude, rule.longitude, context.latitude, context.longitude) > rule.radiusMeters) reasons.push("outside_geographic_radius");
  }
  if (rule.financialLimit !== null && rule.financialUsed >= rule.financialLimit) reasons.push("financial_limit_reached");
  if (rule.validationMode !== "automatic" && !context.presentedCredential) reasons.push("validation_credential_required");
  if (rule.stackingPolicy === "non_stackable" && (context.existingAppliedCouponIds?.length ?? 0) > 0) reasons.push("coupon_not_stackable");

  const rawDiscount = rule.discountType === "percentage" ? context.purchaseAmount * rule.discountValue / 100 : rule.discountValue;
  const discountAmount = Math.max(0, Math.min(context.purchaseAmount, Number(rawDiscount.toFixed(2))));
  if (rule.financialLimit !== null && rule.financialUsed + discountAmount > rule.financialLimit) reasons.push("financial_limit_would_be_exceeded");
  return { eligible: reasons.length === 0, reasons, discountAmount: reasons.length === 0 ? discountAmount : 0, remainingFinancialLimit: rule.financialLimit === null ? null : Math.max(0, Number((rule.financialLimit - rule.financialUsed - (reasons.length === 0 ? discountAmount : 0)).toFixed(2))) };
}
