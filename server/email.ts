import { createHash } from "node:crypto";

export const emailEventValues = [
  "user.access_changed",
  "login_invite.created",
  "login_invite.accepted",
  "login_invite.revoked",
  "coupon.created",
  "coupon.published",
  "coupon.activated",
  "coupon.redeemed",
  "store.created",
  "partner.created",
] as const;

export type EmailEventName = (typeof emailEventValues)[number];

export type EmailVariables = Record<string, string | number | boolean | null | undefined>;

const variablePattern = /{{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*}}/g;
const forbiddenMarkup = /<\s*(script|iframe|object|embed|form|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|on[a-z]+\s*=|javascript\s*:/gi;

export function extractEmailVariables(value: string) {
  return Array.from(value.matchAll(variablePattern)).map(match => match[1]).filter((name, index, all) => all.indexOf(name) === index);
}

export function sanitizeEmailHtml(html: string) {
  const sanitized = html.replace(forbiddenMarkup, "").replace(/<\s*(script|iframe|object|embed|form|style)[^>]*\/?>/gi, "");
  return sanitized.trim();
}

export function validateEmailTemplate<T extends { subject: string; preheader?: string | null; bodyHtml: string; allowedVariables: string[] }>(input: T): T {
  if (!input.subject.trim()) throw new Error("O assunto do e-mail é obrigatório");
  if (input.subject.length > 240) throw new Error("O assunto excede 240 caracteres");
  if (input.preheader && input.preheader.length > 240) throw new Error("O preheader excede 240 caracteres");
  const html = sanitizeEmailHtml(input.bodyHtml);
  if (!html) throw new Error("O corpo do e-mail é obrigatório");
  const used = [
    ...extractEmailVariables(input.subject),
    ...extractEmailVariables(input.preheader ?? ""),
    ...extractEmailVariables(html),
  ];
  const allowed = new Set(input.allowedVariables);
  const unknown = used.filter(name => !allowed.has(name));
  if (unknown.length) throw new Error(`Variáveis não permitidas: ${unknown.join(", ")}`);
  return { ...input, bodyHtml: html, allowedVariables: Array.from(new Set(input.allowedVariables)) };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderEmail(value: string, variables: EmailVariables) {
  return value.replace(variablePattern, (_, name: string) => escapeHtml(String(variables[name] ?? "")));
}

export function renderEmailText(value: string, variables: EmailVariables) {
  return value.replace(variablePattern, (_, name: string) => String(variables[name] ?? ""));
}

export type EmailCondition = { field: string; operator: "equals" | "not_equals" | "contains" | "gt" | "gte" | "lt" | "lte"; value: string | number | boolean };

export function matchEmailConditions(conditions: EmailCondition[], variables: EmailVariables) {
  return conditions.every(condition => {
    const actual = variables[condition.field];
    if (actual == null) return false;
    if (condition.operator === "contains") return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    if (condition.operator === "equals") return String(actual) === String(condition.value);
    if (condition.operator === "not_equals") return String(actual) !== String(condition.value);
    const left = Number(actual);
    const right = Number(condition.value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (condition.operator === "gt") return left > right;
    if (condition.operator === "gte") return left >= right;
    if (condition.operator === "lt") return left < right;
    return left <= right;
  });
}

export function buildEmailIdempotencyKey(eventName: string, recipientEmail: string, ruleId: number | null, eventKey: string) {
  return createHash("sha256").update(`${eventName}|${recipientEmail.trim().toLowerCase()}|${ruleId ?? "manual"}|${eventKey}`).digest("hex");
}

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export type EmailTransport = {
  send: (message: { to: string; from: string; replyTo?: string | null; subject: string; html: string; text?: string | null }) => Promise<{ providerMessageId?: string }>;
};

/** Outbox-only transport. It never leaves the application; a real provider can implement EmailTransport later. */
export const outboxOnlyTransport: EmailTransport = {
  async send() {
    throw new Error("Nenhum provedor externo de e-mail está conectado; use a simulação do outbox");
  },
};
