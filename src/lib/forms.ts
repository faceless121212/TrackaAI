// Shape returned by server actions used with useActionState.
export type FormState = {
  /** Set on success by actions that don't redirect, so dialogs know to close. */
  ok?: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  /** Set with ok: it worked, but something the user should know didn't (e.g. an AI run couldn't start). */
  warning?: string;
  /** Set when a plan limit blocked the action: where to upgrade. */
  upgradeHref?: string;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

/** Result of a server action called from an event handler (drag, select, delete…). */
export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };

export function formValues<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)?.toString() ?? ""])) as Record<
    K,
    string
  >;
}

/** Assignee pickers use "none", "<userId>" or "agent:<agentId>" as option values. */
export function parseAssigneeValue(value: string | undefined) {
  if (!value || value === "none") return null;
  if (value.startsWith("agent:")) return { kind: "agent" as const, agentId: value.slice("agent:".length) };
  return { kind: "user" as const, userId: value };
}

export function assigneeValue(assignee: { kind: "user"; userId: string } | { kind: "agent"; agentId: string } | null) {
  if (!assignee) return "none";
  return assignee.kind === "agent" ? `agent:${assignee.agentId}` : assignee.userId;
}
