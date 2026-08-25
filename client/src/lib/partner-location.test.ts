import { describe, expect, it } from "vitest";
import { buildPartnerGpsUrl, formatPartnerAddress } from "./partner-location";

describe("partner location helpers", () => {
  it("uses the confirmed coordinates as a GPS destination", () => {
    expect(buildPartnerGpsUrl({ latitude: -23.55052, longitude: -46.633308 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-23.55052,-46.633308",
    );
  });

  it("builds a readable Brazilian address when coordinates are unavailable", () => {
    const location = { addressStreet: "Avenida Paulista", addressNumber: "1000", addressCity: "São Paulo", addressState: "SP", addressCountry: "BR" };
    expect(formatPartnerAddress(location)).toBe("Avenida Paulista, 1000, São Paulo - SP, Brasil");
    expect(buildPartnerGpsUrl(location)).toContain("query=Avenida%20Paulista%2C%201000%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%20Brasil");
  });

  it("does not offer a generic GPS destination without an address or coordinates", () => {
    expect(formatPartnerAddress({ addressCountry: "BR" })).toBe("");
    expect(buildPartnerGpsUrl({ addressCountry: "BR" })).toBeNull();
  });
});
