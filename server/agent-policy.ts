import { z } from "zod";

export const agentToolRiskValues = ["low", "medium", "high", "critical"] as const;
export type AgentToolRisk = (typeof agentToolRiskValues)[number];

export const agentToolCatalog = {
  list_partners: { risk: "low", audiences: ["admin", "partner"] },
  list_coupons: { risk: "low", audiences: ["admin", "partner", "consumer", "publisher"] },
  explain_coupon_rules: { risk: "low", audiences: ["admin", "partner", "consumer", "publisher"] },
  simulate_redemption: { risk: "medium", audiences: ["admin", "partner"] },
  create_coupon_draft: { risk: "medium", audiences: ["admin", "partner"] },
  publish_coupon: { risk: "high", audiences: ["admin", "partner"] },
  pause_coupon: { risk: "high", audiences: ["admin", "partner"] },
  block_partner: { risk: "critical", audiences: ["admin"] },
  send_notification: { risk: "high", audiences: ["admin", "partner", "publisher"] },
  record_support_case: { risk: "low", audiences: ["consumer", "partner", "publisher"] },
} as const satisfies Record<string, { risk: AgentToolRisk; audiences: readonly string[] }>;

export type AgentToolKey = keyof typeof agentToolCatalog;

const sensitiveKey = /(cpf|document|plate|placa|token|secret|password|senha|authorization|coordinates|latitude|longitude)/i;

export const agentIntentSchema = z.enum([
  "consultar_cupom",
  "consultar_parceiro",
  "explicar_regra",
  "simular_resgate",
  "criar_rascunho",
  "publicar_oferta",
  "pausar_cupom",
  "bloquear_parceiro",
  "enviar_notificacao",
  "abrir_suporte",
  "explicar_recomendacao",
  "revisar_consentimento",
]);

export type AgentIntent = z.infer<typeof agentIntentSchema>;

const highRisk = new Set<AgentToolRisk>(["high", "critical"]);

export function requiresHumanApproval(autonomy: string, toolKey: AgentToolKey) {
  const risk = agentToolCatalog[toolKey].risk;
  if (risk === "critical") return true;
  if (risk === "high") return autonomy !== "A3";
  if (risk === "medium") return autonomy === "A0" || autonomy === "A1";
  return autonomy === "A0";
}

export function canAgentUseTool(audience: string, toolKey: string) {
  const definition = agentToolCatalog[toolKey as AgentToolKey];
  return Boolean(definition && (definition.audiences as readonly string[]).includes(audience));
}

export function riskForTool(toolKey: AgentToolKey) {
  return agentToolCatalog[toolKey].risk;
}

export function redactAgentInput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAgentInput);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : redactAgentInput(nested)]));
}

export function isHighRiskTool(toolKey: AgentToolKey) {
  return highRisk.has(riskForTool(toolKey));
}
