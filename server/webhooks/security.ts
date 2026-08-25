import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerificationResult =
  | { valid: true; timestamp: number }
  | { valid: false; reason: "missing_signature" | "malformed_signature" | "missing_timestamp" | "stale_timestamp" | "invalid_signature" };

const SIGNATURE_PREFIX = "sha256=";
const DEFAULT_TOLERANCE_SECONDS = 300;

function digest(rawBody: string, secret: string, timestamp: number) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

export function createWebhookSignature(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  return `${SIGNATURE_PREFIX}${timestamp}.${digest(rawBody, secret, timestamp)}`;
}

export function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: {
  rawBody: string;
  signature?: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): WebhookVerificationResult {
  if (!signature) return { valid: false, reason: "missing_signature" };
  if (!secret) return { valid: false, reason: "invalid_signature" };

  const match = /^sha256=(\d+)\.([a-f0-9]{64})$/.exec(signature);
  if (!match) return { valid: false, reason: "malformed_signature" };

  const timestamp = Number(match[1]);
  const providedDigest = Buffer.from(match[2], "hex");
  if (!Number.isSafeInteger(timestamp)) return { valid: false, reason: "malformed_signature" };
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { valid: false, reason: "stale_timestamp" };
  }

  const expectedDigest = Buffer.from(digest(rawBody, secret, timestamp), "hex");
  const valid = providedDigest.length === expectedDigest.length && timingSafeEqual(providedDigest, expectedDigest);
  return valid ? { valid: true, timestamp } : { valid: false, reason: "invalid_signature" };
}
