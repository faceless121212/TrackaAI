import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGN_IN_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Check your inbox" };

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <MailCheck aria-hidden className="text-muted-foreground mb-2 size-6" />
        <CardTitle>
          <h1 className="text-xl">Check your inbox</h1>
        </CardTitle>
        <CardDescription>
          We sent you a link to confirm your email. Open it on this device to finish signing up. It can take a
          minute to arrive; check your spam folder too.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Already confirmed?{" "}
        <Link href={SIGN_IN_PATH} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </CardContent>
    </Card>
  );
}
