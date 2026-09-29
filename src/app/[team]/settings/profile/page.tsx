import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <SettingsSection title="Profile" description="How you appear to your teammates, in every team.">
      <ProfileForm user={user} />
    </SettingsSection>
  );
}
