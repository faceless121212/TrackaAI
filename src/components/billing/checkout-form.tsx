"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/domain";
import { initialFormState } from "@/lib/forms";
import { completeCheckoutAction } from "@/server/actions/billing";

export function CheckoutForm({ teamSlug, plan, cancelHref }: { teamSlug: string; plan: Plan; cancelHref: string }) {
  const [state, action, pending] = useActionState(completeCheckoutAction, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="plan" value={plan} />
      <FormError message={state.formError} />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Confirming…" : "Confirm and subscribe"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
