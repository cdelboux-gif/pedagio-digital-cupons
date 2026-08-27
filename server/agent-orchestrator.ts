import { agentIntentSchema, agentToolCatalog, canAgentUseTool, requiresHumanApproval, riskForTool, type AgentToolKey } from "./agent-policy";

export const agentRoute = {
  consultar_cupom: { agentKey: "backoffice-operations", toolKey: "list_coupons", risk: "low" },
  consultar_parceiro: { agentKey: "backoffice-operations", toolKey: "list_partners", risk: "low" },
  explicar_regra: { agentKey: "consumer-support", toolKey: "explain_coupon_rules", risk: "low" },
  simular_resgate: { agentKey: "backoffice-operations", toolKey: "simulate_redemption", risk: "medium" },
  criar_rascunho: { agentKey: "partner-success", toolKey: "create_coupon_draft", risk: "medium" },
  publicar_oferta: { agentKey: "content-publication", toolKey: "publish_coupon", risk: "high" },
  pausar_cupom: { agentKey: "backoffice-operations", toolKey: "pause_coupon", risk: "high" },
  bloquear_parceiro: { agentKey: "risk-trust", toolKey: "block_partner", risk: "critical" },
  enviar_notificacao: { agentKey: "content-publication", toolKey: "send_notification", risk: "high" },
  abrir_suporte: { agentKey: "consumer-support", toolKey: "record_support_case", risk: "low" },
  explicar_recomendacao: { agentKey: "benefits-recommendations", toolKey: "explain_coupon_rules", risk: "low" },
  revisar_consentimento: { agentKey: "risk-trust", toolKey: "record_support_case", risk: "medium" },
} as const satisfies Record<string, { agentKey: string; toolKey: AgentToolKey; risk: string }>;

export type AgentRoute = (typeof agentRoute)[keyof typeof agentRoute];

export function routeAgentIntent(intent: string, audience: string, autonomy = "A0") {
  const parsedIntent = agentIntentSchema.safeParse(intent);
  if (!parsedIntent.success) return { allowed: false as const, reason: "intent_not_supported" as const };
  const route = agentRoute[parsedIntent.data];
  if (!canAgentUseTool(audience, route.toolKey)) return { allowed: false as const, reason: "audience_not_allowed" as const, route };
  return { allowed: true as const, route, approvalRequired: requiresHumanApproval(autonomy, route.toolKey), risk: riskForTool(route.toolKey) };
}

export function listAgentTools() {
  return Object.entries(agentToolCatalog).map(([toolKey, definition]) => ({ toolKey, ...definition }));
}
