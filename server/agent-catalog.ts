export const defaultAgentTools: Record<string, readonly { toolKey: string; requiresApproval: boolean }[]> = {
  "orchestration-supervisor": [{ toolKey: "record_support_case", requiresApproval: true }],
  "backoffice-operations": [{ toolKey: "list_partners", requiresApproval: false }, { toolKey: "list_coupons", requiresApproval: false }, { toolKey: "explain_coupon_rules", requiresApproval: false }, { toolKey: "simulate_redemption", requiresApproval: true }, { toolKey: "pause_coupon", requiresApproval: true }],
  "consumer-support": [{ toolKey: "list_coupons", requiresApproval: false }, { toolKey: "explain_coupon_rules", requiresApproval: false }, { toolKey: "record_support_case", requiresApproval: false }],
  "partner-success": [{ toolKey: "list_coupons", requiresApproval: false }, { toolKey: "create_coupon_draft", requiresApproval: true }, { toolKey: "record_support_case", requiresApproval: false }],
  "content-publication": [{ toolKey: "explain_coupon_rules", requiresApproval: false }, { toolKey: "publish_coupon", requiresApproval: true }, { toolKey: "send_notification", requiresApproval: true }],
  "benefits-recommendations": [{ toolKey: "list_coupons", requiresApproval: false }, { toolKey: "explain_coupon_rules", requiresApproval: false }],
  "risk-trust": [{ toolKey: "list_coupons", requiresApproval: false }, { toolKey: "block_partner", requiresApproval: true }, { toolKey: "record_support_case", requiresApproval: true }],
  "training-quality": [{ toolKey: "record_support_case", requiresApproval: true }],
};

export const defaultAgentProfiles = [
  { agentKey: "orchestration-supervisor", name: "Supervisor de Orquestração", audience: "internal", status: "active", autonomy: "A0", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "backoffice-operations", name: "Operações do Backoffice", audience: "admin", status: "active", autonomy: "A1", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "consumer-support", name: "Atendimento do Consumidor", audience: "consumer", status: "active", autonomy: "A0", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "partner-success", name: "Sucesso do Parceiro", audience: "partner", status: "active", autonomy: "A1", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "content-publication", name: "Publicação e Conteúdo", audience: "publisher", status: "active", autonomy: "A1", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "benefits-recommendations", name: "Benefícios e Recomendações", audience: "internal", status: "active", autonomy: "A0", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "risk-trust", name: "Risco, LGPD e Confiança", audience: "internal", status: "active", autonomy: "A0", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
  { agentKey: "training-quality", name: "Treinamento e Qualidade", audience: "internal", status: "active", autonomy: "A0", policyVersion: "policy-v1.0", promptVersion: "prompt-v1.0" },
] as const;
