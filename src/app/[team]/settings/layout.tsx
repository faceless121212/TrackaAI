import { SettingsNav } from "@/components/settings/settings-nav";
import { requireTeamMember } from "@/server/auth/guards";

export default async function SettingsLayout({ children, params }: LayoutProps<"/[team]/settings">) {
  const { team } = await requireTeamMember((await params).team);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">{team.name}</p>
      </div>
      <SettingsNav teamSlug={team.slug} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
