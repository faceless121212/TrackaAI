// No "server-only" import: the repositories (and their tests) load this. It
// only reads the environment, which a browser bundle wouldn't have anyway.

/**
 * The app server's proof, to the database, that a step of an AI teammate run
 * comes from the server and not from a member's own client (see the
 * 20261001100000_agent_worker_token migration). At least 32 characters; the
 * database stores only its SHA-256. Null when the server isn't configured.
 */
export function agentWorkerToken(): string | null {
  const token = process.env.AGENT_WORKER_SECRET;
  return token && token.length >= 32 ? token : null;
}
