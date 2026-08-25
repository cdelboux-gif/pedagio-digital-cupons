import { describe, expect, it } from "vitest";
import { partnerInput } from "./routers/admin";

const basePartner = {
  displayName: "Ponto de teste",
  relationshipStatus: "active" as const,
};

describe("partnerInput location validation", () => {
  it("accepts a complete pair of Brazilian GPS coordinates", () => {
    const result = partnerInput.safeParse({
      ...basePartner,
      latitude: -23.55052,
      longitude: -46.633308,
      addressState: "sp",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.addressState).toBe("SP");
  });

  it("rejects a partial coordinate pair", () => {
    const result = partnerInput.safeParse({ ...basePartner, latitude: -23.55052 });
    expect(result.success).toBe(false);
  });

  it("rejects coordinates outside their geographic ranges", () => {
    const result = partnerInput.safeParse({ ...basePartner, latitude: -91, longitude: 0 });
    expect(result.success).toBe(false);
  });
});
