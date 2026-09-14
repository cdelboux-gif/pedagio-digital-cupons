import { createHash } from "node:crypto";

export type ExperimentArm = "control" | "exposed";

export type CampaignExperimentConfig = {
  campaignId: number;
  holdoutPercent: number;
  entitlementTtlMinutes: number;
};

function normalizeHoldoutPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Deterministic assignment keeps the same user/vehicle in the same experiment arm
 * for a campaign, avoiding cross-contamination between control and exposed groups.
 */
export function assignExperimentArm(campaignId: number, subjectReference: string, holdoutPercent: number): ExperimentArm {
  const normalized = normalizeHoldoutPercent(holdoutPercent);
  if (normalized <= 0) return "exposed";
  if (normalized >= 100) return "control";
  const digest = createHash("sha256").update(`${campaignId}:${subjectReference.trim().toLowerCase()}`).digest();
  const bucket = digest.readUInt32BE(0) % 10_000;
  return bucket < Math.round(normalized * 100) ? "control" : "exposed";
}

export function entitlementExpiresAt(issuedAt: Date, ttlMinutes: number) {
  const safeTtl = Number.isFinite(ttlMinutes) ? Math.max(1, Math.min(24 * 60, Math.floor(ttlMinutes))) : 30;
  return new Date(issuedAt.getTime() + safeTtl * 60_000);
}

export function buildEntitlementIdempotencyKey(campaignId: number, passageEventId: number, subjectReference: string) {
  const subjectHash = createHash("sha256").update(subjectReference.trim().toLowerCase()).digest("hex").slice(0, 24);
  return `entitlement:${campaignId}:${passageEventId}:${subjectHash}`;
}
