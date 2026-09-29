import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { devSignIn } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <form action={devSignIn} className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in to TrackaAI</h1>
          <p className="text-muted-foreground text-sm">
            Development sign-in. Real accounts arrive in M1.
          </p>
        </div>
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <Button type="submit" className="w-full">
          Continue as dev user
        </Button>
      </form>
    </main>
  );
}
