"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { slugify } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { createTeamAction } from "@/server/actions/onboarding";

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeamAction, initialFormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // The URL follows the name until the user edits it directly.
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <TextField
          name="name"
          label="Team name"
          required
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="slug"
          label="Team URL"
          required
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          description={`Your team lives at /${slug || "your-team"}`}
          errors={state.fieldErrors?.slug}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
