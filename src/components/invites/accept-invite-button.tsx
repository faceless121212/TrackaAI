"use client";

import { useActionState } from "react";
import { FormError } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/forms";
import { acceptInviteAction } from "@/server/actions/invites";

export function AcceptInviteButton({ token, teamName }: { token: string; teamName: string }) {
  const [state, action, pending] = useActionState(() => acceptInviteAction(token), initialFormState);
  return (
    <form action={action} className="space-y-3">
      <Button type="submit" className="w-full" disabled={pending}>
        Join {teamName}
      </Button>
      <FormError message={state.formError} />
    </form>
  );
}
