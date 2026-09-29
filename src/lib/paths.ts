// Every in-app URL is built here so routes can move without hunting strings.
export const ONBOARDING_PATH = "/onboarding";

export const teamPath = (teamSlug: string) => `/${teamSlug}`;
export const boardPath = (teamSlug: string, boardId: string) => `/${teamSlug}/board/${boardId}`;
export const onboardingWorkspacePath = (teamSlug: string) => `${ONBOARDING_PATH}/${teamSlug}/workspace`;
export const onboardingInvitePath = (teamSlug: string, boardId: string) =>
  `${ONBOARDING_PATH}/${teamSlug}/invite?board=${encodeURIComponent(boardId)}`;

export type SettingsSection = "general" | "members" | "labels" | "profile";
export const settingsPath = (teamSlug: string, section: SettingsSection = "general") =>
  section === "general" ? `/${teamSlug}/settings` : `/${teamSlug}/settings/${section}`;
export const invitePath = (token: string) => `/invite/${token}`;
