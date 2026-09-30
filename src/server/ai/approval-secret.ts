import "server-only";
import { randomBytes } from "node:crypto";

const globalForSecret = globalThis as typeof globalThis & { __toolApprovalSecret?: string };

/**
 * Signs copilot tool approvals, so a client can't send back a forged
 * "approved" in the chat history. Production needs TOOL_APPROVAL_SECRET (at
 * least 32 characters, shared by every instance): a per-process secret would
 * break approvals across instances and restarts. Elsewhere each process makes
 * its own. Returns null when production isn't configured.
 */
/** Whether toolApprovalSecret() will return a secret (without logging). */
export function approvalSecretConfigured(): boolean {
  const configured = process.env.TOOL_APPROVAL_SECRET;
  return (configured !== undefined && configured.length >= 32) || process.env.NODE_ENV !== "production";
}

export function toolApprovalSecret(): string | null {
  const configured = process.env.TOOL_APPROVAL_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    console.error("[ai] TOOL_APPROVAL_SECRET is missing or shorter than 32 characters; the copilot is off.");
    return null;
  }
  globalForSecret.__toolApprovalSecret ??= randomBytes(32).toString("base64url");
  return globalForSecret.__toolApprovalSecret;
}
