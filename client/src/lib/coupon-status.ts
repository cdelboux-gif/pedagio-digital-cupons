export type CouponStatus = "draft" | "active" | "paused" | "ended";

export function requiresCouponStatusConfirmation(status: CouponStatus) {
  return status === "paused" || status === "ended";
}
