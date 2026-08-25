import { describe, expect, it } from "vitest";
import { requiresCouponStatusConfirmation } from "./coupon-status";

describe("requiresCouponStatusConfirmation", () => {
  it("requires an explicit confirmation for pause and end actions", () => {
    expect(requiresCouponStatusConfirmation("paused")).toBe(true);
    expect(requiresCouponStatusConfirmation("ended")).toBe(true);
  });

  it("keeps activation and draft transitions immediate", () => {
    expect(requiresCouponStatusConfirmation("active")).toBe(false);
    expect(requiresCouponStatusConfirmation("draft")).toBe(false);
  });
});

