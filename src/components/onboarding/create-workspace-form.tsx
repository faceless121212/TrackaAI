"use client";

import { useActionState, useState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { suggestKeyPrefix } from "@/lib/domain";
import { initialFormState, type FormState } from "@/lib/forms";

/** Used by onboarding (→ invite step) and the sidebar (→ new board); each passes its own action. */
export function CreateWorkspaceForm({
  teamSlug,
  action: workspaceAction,
  submitLabel = "Continue",
}: {
  teamSlug: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(workspaceAction, initialFormState);
  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <FieldGroup>
        <TextField
          name="name"
          label="Workspace name"
          placeholder="Engineering"
          required
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!prefixTouched) setKeyPrefix(suggestKeyPrefix(event.target.value));
          }}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="keyPrefix"
          label="Key prefix"
          required
          maxLength={5}
          value={keyPrefix}
          onChange={(event) => {
            setKeyPrefix(event.target.value.toUpperCase());
            setPrefixTouched(true);
          }}
          description={`Task IDs will look like ${keyPrefix || "ENG"}-1`}
          errors={state.fieldErrors?.keyPrefix}
        />
      </FieldGroup>
      <FormError message={state.formError} upgradeHref={state.upgradeHref} />
      <Button type="submit" className="w-full" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
