import { requireUser } from "@/server/auth/session";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  await requireUser();
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
