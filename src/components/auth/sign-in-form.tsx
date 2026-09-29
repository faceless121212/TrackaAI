"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_UP_PATH } from "@/lib/auth/routes";
import { initialFormState } from "@/lib/forms";
import { signInAction } from "@/server/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialFormState);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          errors={state.fieldErrors?.email}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
      </FieldGroup>
      <FormError message={state.formError} />
      <Button type="submit" className="w-full" disabled={pending}>
        Sign in
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        No account yet?{" "}
        <Link href={SIGN_UP_PATH} className="text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
