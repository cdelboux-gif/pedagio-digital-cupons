import { outboxOnlyTransport, type EmailTransport } from "./email";

/**
 * Boundary for future providers. The application depends on this contract,
 * while provider-specific credentials and SDKs can be added behind it later.
 */
export type EmailTransportProvider = "outbox" | "resend" | "elastic-email";

export function getEmailTransport(provider: EmailTransportProvider = "outbox"): EmailTransport {
  // External providers remain intentionally disabled in the MVP. Keeping the
  // switch here prevents provider concerns from leaking into domain handlers.
  if (provider === "outbox" || provider === "resend" || provider === "elastic-email") return outboxOnlyTransport;
  return outboxOnlyTransport;
}
