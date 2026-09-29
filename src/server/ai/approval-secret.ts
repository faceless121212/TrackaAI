import "server-only";
import { randomBytes } from "node:crypto";

const globalForSecret = globalThis as typeof globalThis & { __toolApprovalSecret?: string };

/**
 * Signs copilot tool approvals, so a client can't send back a forged
 * "approved" in the chat history. Set TOOL_APPROVAL_SECRET wherever more than
 * one server instance runs; without it each process makes its own (fine for
 * one dev server, but approvals won't survive a restart).
 */
export function toolApprovalSecret(): string {
  if (process.env.TOOL_APPROVAL_SECRET) return process.env.TOOL_APPROVAL_SECRET;
  globalForSecret.__toolApprovalSecret ??= randomBytes(32).toString("base64url");
  return globalForSecret.__toolApprovalSecret;
}
