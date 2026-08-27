import { describe, expect, it } from "vitest";
import { agentRejectionInput } from "./routers/admin";

describe("agent rejection input", () => {
  it("requires a meaningful justification", () => {
    expect(() => agentRejectionInput.parse({ id: 12, justification: "curta" })).toThrow();
    expect(() => agentRejectionInput.parse({ id: 12, justification: "   " })).toThrow();
  });

  it("accepts a bounded justification", () => {
    const parsed = agentRejectionInput.parse({ id: 12, justification: "A ação altera a campanha sem aprovação comercial." });
    expect(parsed.id).toBe(12);
    expect(parsed.justification).toBe("A ação altera a campanha sem aprovação comercial.");
  });

  it("rejects an oversized justification", () => {
    expect(() => agentRejectionInput.parse({ id: 12, justification: "x".repeat(4001) })).toThrow();
  });
});
