import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { AskChat } from "@/components/ask/ask-chat";
import { StatusScreen } from "@/components/shell/status-screen";
import { aiAvailable } from "@/server/ai/model";
import { requireTeamMember } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Ask AI" };

export default async function AskPage({ params }: PageProps<"/[team]/ask">) {
  const { team } = await requireTeamMember((await params).team);
  if (!aiAvailable()) {
    return (
      <StatusScreen icon={Sparkles} title="Ask AI isn't set up yet">
        This server has no AI key configured. Once it has one, you can ask about your team&apos;s issues here.
      </StatusScreen>
    );
  }
  return <AskChat teamSlug={team.slug} />;
}
