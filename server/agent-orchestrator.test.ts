import { describe, expect, it } from "vitest";
import { routeAgentIntent } from "./agent-orchestrator";

describe("agent orchestrator", () => {
  it("routes a consumer rule question to the support agent", () => {
    expect(routeAgentIntent("explicar_regra", "consumer")).toMatchObject({
      allowed: true,
      route: { agentKey: "consumer-support", toolKey: "explain_coupon_rules" },
      approvalRequired: true,
      risk: "low",
    });
  });

  it("blocks unsupported audience/tool combinations", () => {
    expect(routeAgentIntent("publicar_oferta", "consumer")).toEqual({ allowed: false, reason: "audience_not_allowed", route: { agentKey: "content-publication", toolKey: "publish_coupon", risk: "high" } });
    expect(routeAgentIntent("unknown_intent", "admin")).toEqual({ allowed: false, reason: "intent_not_supported" });
  });

  it("keeps partner blocking behind approval even at the highest autonomy", () => {
    expect(routeAgentIntent("bloquear_parceiro", "admin", "A4")).toMatchObject({ allowed: true, approvalRequired: true, risk: "critical" });
  });
});
