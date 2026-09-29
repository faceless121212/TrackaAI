import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AcceptInviteButton } from "@/components/invites/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGN_OUT_PATH, withNext } from "@/lib/auth/routes";
import { invitePath, teamPath } from "@/lib/paths";
import { requireUser } from "@/server/auth/session";
import { getRepositories } from "@/server/data";

export const metadata: Metadata = { title: "Join a team" };

function InviteCard({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </main>
  );
}

// Signed-out visitors never get here: proxy.ts sends them to sign-in (or sign-up) with ?next= this page.
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const user = await requireUser();
  const repos = getRepositories();
  const invite = await repos.invites.getByToken(token);
  const team = invite ? await repos.teams.get(invite.teamId) : null;

  if (!invite || !team) {
    return (
      <InviteCard title="Invite not found" description="This link is invalid or was revoked. Ask for a new invite.">
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Go to TrackaAI</Link>
        </Button>
      </InviteCard>
    );
  }

  const membership = await repos.memberships.get(team.id, user.id);
  if (membership) {
    return (
      <InviteCard title={`You're in ${team.name}`} description="You're already a member of this team.">
        <Button asChild className="w-full">
          <Link href={teamPath(team.slug)}>Open {team.name}</Link>
        </Button>
      </InviteCard>
    );
  }

  if (invite.acceptedAt || invite.expiresAt <= new Date().toISOString()) {
    return (
      <InviteCard
        title={invite.acceptedAt ? "This invite was already used" : "This invite has expired"}
        description={`Ask someone in ${team.name} to send you a new invite.`}
      />
    );
  }

  if (invite.email !== user.email) {
    return (
      <InviteCard
        title="Wrong account"
        description={
          <>
            This invite was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
            <strong>{user.email}</strong>.
          </>
        }
      >
        <Button asChild variant="outline" className="w-full">
          {/* Plain link: /sign-out is a route handler that clears the session. */}
          <a href={withNext(SIGN_OUT_PATH, invitePath(token))}>Sign out and switch account</a>
        </Button>
      </InviteCard>
    );
  }

  const inviter = await repos.users.getById(invite.invitedBy);
  return (
    <InviteCard
      title={`Join ${team.name}`}
      description={`${inviter?.name ?? "A teammate"} invited you to join as ${invite.role === "admin" ? "an admin" : "a member"}.`}
    >
      <AcceptInviteButton token={token} teamName={team.name} />
    </InviteCard>
  );
}
