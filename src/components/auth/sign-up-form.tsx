"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { initialFormState } from "@/lib/forms";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <TextField
          name="name"
          label="Name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          errors={state.fieldErrors?.name}
        />
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
          autoComplete="new-password"
          required
          description="At least 8 characters."
          errors={state.fieldErrors?.password}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={pending}>
        Create account
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href={SIGN_IN_PATH} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
