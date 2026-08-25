import { describe, expect, it } from "vitest";
import { resolveUserRole } from "./db";

describe("resolveUserRole", () => {
  it("preserves an existing administrator role when OAuth provides no role", () => {
    expect(
      resolveUserRole({ incomingRole: undefined, existingRole: "admin", isOwner: false }),
    ).toBe("admin");
  });

  it("assigns administrator to the project owner on first login", () => {
    expect(
      resolveUserRole({ incomingRole: undefined, existingRole: undefined, isOwner: true }),
    ).toBe("admin");
  });

  it("keeps a regular account as user when no elevated role exists", () => {
    expect(
      resolveUserRole({ incomingRole: undefined, existingRole: "user", isOwner: false }),
    ).toBe("user");
  });
});

