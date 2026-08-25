import { describe, expect, it } from "vitest";
import { decodeImageUpload, resolveUserAccessLevel } from "./db";

describe("user access level resolution", () => {
  it("keeps an existing elevated access level when OAuth omits it", () => {
    expect(resolveUserAccessLevel({ existingAccessLevel: "manager", role: "user", isOwner: false })).toBe("manager");
  });

  it("promotes the owner and legacy admins to administrator access", () => {
    expect(resolveUserAccessLevel({ existingAccessLevel: "viewer", role: "admin", isOwner: false })).toBe("admin");
    expect(resolveUserAccessLevel({ existingAccessLevel: "viewer", role: "user", isOwner: true })).toBe("admin");
  });
});

describe("image upload validation", () => {
  it("accepts a PNG data URL and returns binary metadata", () => {
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
    const result = decodeImageUpload({ fileName: "logo.png", dataUrl: `data:image/png;base64,${pngHeader}` });
    expect(result.mimeType).toBe("image/png");
    expect(result.safeName).toBe("logo.png");
  });

  it("rejects unsupported formats and content spoofing", () => {
    expect(() => decodeImageUpload({ fileName: "logo.svg", dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).toThrow("Formato de imagem não suportado");
    expect(() => decodeImageUpload({ fileName: "logo.png", dataUrl: "data:image/png;base64,anVzdCB0ZXh0" })).toThrow("não corresponde");
  });
});
