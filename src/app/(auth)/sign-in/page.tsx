import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDataBackend } from "@/server/data/backend";
import { DEMO_USER } from "@/server/data/mock/seed";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, confirm } = await searchParams;
  const isMock = resolveDataBackend(process.env.DATA_BACKEND) === "mock";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Sign in to TrackaAI</h1>
        </CardTitle>
        {isMock && (
          <CardDescription>
            Mock mode: try <code>{DEMO_USER.email}</code> / <code>{DEMO_USER.password}</code>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {confirm === "failed" && (
          <p role="alert" className="text-destructive text-sm">
            That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link.
          </p>
        )}
        <SignInForm next={typeof next === "string" ? next : "/"} />
      </CardContent>
    </Card>
  );
}
