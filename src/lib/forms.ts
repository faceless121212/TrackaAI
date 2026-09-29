// Shape returned by server actions used with useActionState.
export type FormState = {
  /** Set on success by actions that don't redirect, so dialogs know to close. */
  ok?: boolean;
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  /** Set when a plan limit blocked the action: where to upgrade. */
  upgradeHref?: string;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

/** Result of a server action called from an event handler (drag, select, delete…). */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function formValues<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)?.toString() ?? ""])) as Record<
    K,
    string
  >;
}
