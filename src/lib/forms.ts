// Shape returned by server actions used with useActionState.
export type FormState = {
  fieldErrors?: Partial<Record<string, string[]>>;
  formError?: string;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

export function formValues<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key)?.toString() ?? ""])) as Record<
    K,
    string
  >;
}
