import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Create your account</h1>
        </CardTitle>
        <CardDescription>Set up your team in under three minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm next={typeof next === "string" ? next : "/"} />
      </CardContent>
    </Card>
  );
}
