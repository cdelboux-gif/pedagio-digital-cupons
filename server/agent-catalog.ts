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
