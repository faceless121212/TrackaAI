// Every in-app URL is built here so routes can move without hunting strings.
export const ONBOARDING_PATH = "/onboarding";

export const teamPath = (teamSlug: string) => `/${teamSlug}`;
export const boardPath = (teamSlug: string, boardId: string) => `/${teamSlug}/board/${boardId}`;
export const onboardingWorkspacePath = (teamSlug: string) => `${ONBOARDING_PATH}/${teamSlug}/workspace`;
export const onboardingInvitePath = (teamSlug: string, boardId: string) =>
  `${ONBOARDING_PATH}/${teamSlug}/invite?board=${encodeURIComponent(boardId)}`;
