"use client";

import { startTransition, useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";

/**
 * useActionState for dialog forms: runs `onSuccess` (e.g. close the dialog)
 * inside a transition so it lands in the same frame as the refreshed page.
 */
export function useFormAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  onSuccess?: () => void,
) {
  return useActionState(async (prev: FormState, formData: FormData) => {
    const next = await action(prev, formData);
    if (next.ok && onSuccess) startTransition(onSuccess);
    return next;
  }, initialFormState);
}
