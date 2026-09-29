"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { suggestKeyPrefix } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { createWorkspaceAction } from "@/server/actions/onboarding";

export function CreateWorkspaceForm({ teamSlug }: { teamSlug: string }) {
  const [state, action, pending] = useActionState(createWorkspaceAction, initialFormState);
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
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
