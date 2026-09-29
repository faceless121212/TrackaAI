"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INVITES_PER_BATCH } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { sendInvitesAction } from "@/server/actions/onboarding";

export function InviteForm({ teamSlug, boardId, skipHref }: { teamSlug: string; boardId: string; skipHref: string }) {
  const [state, action, pending] = useActionState(sendInvitesAction, initialFormState);
  const errors = state.fieldErrors?.emails;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="boardId" value={boardId} />
      <Field data-invalid={Boolean(errors)}>
        <FieldLabel htmlFor="emails">Email addresses</FieldLabel>
        <Textarea
          id="emails"
          name="emails"
          rows={4}
          placeholder="ann@example.com, bob@example.com"
          defaultValue={state.values?.emails}
          aria-invalid={Boolean(errors)}
        />
        <FieldDescription>
          Separate with commas or new lines. Up to {MAX_INVITES_PER_BATCH} at a time.
        </FieldDescription>
        <FieldError>{errors?.[0]}</FieldError>
      </Field>
      <FormError message={state.formError} upgradeHref={state.upgradeHref} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          Send invites
        </Button>
        <Button variant="ghost" asChild>
          <Link href={skipHref}>Skip for now</Link>
        </Button>
      </div>
    </form>
  );
}
