// @vitest-environment node
import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { ConflictError } from "../errors";
import { createSupabaseRepositories } from "./repositories";

// Supabase rejections at sign-up/sign-in must reach the form as field errors,
// never crash the page ("Something went wrong").
function reposWith(auth: Record<string, unknown>) {
  return createSupabaseRepositories(async () => ({ auth }) as never);
}
const apiError = (code: string, message = code, status = 400) => new AuthApiError(message, status, code);
const SIGN_UP = { name: "Ada", email: "ada@example.com", password: "password123", redirectTo: "http://x/cb" };

describe("Supabase sign-up errors", () => {
  it.each([
    ["email_address_invalid", /can't be used/],
    ["email_address_not_authorized", /can't send a confirmation email/],
    ["over_email_send_rate_limit", /Too many sign-ups/],
    ["over_request_rate_limit", /Too many attempts/],
    ["signup_disabled", /Sign-ups are closed/],
    ["user_already_exists", /already exists/],
  ])("%s becomes a form error on the email field", async (code, message) => {
    const repos = reposWith({ signUp: async () => ({ data: { user: null, session: null }, error: apiError(code) }) });
    const failure = repos.auth.signUp(SIGN_UP);
    await expect(failure).rejects.toBeInstanceOf(ConflictError);
    await expect(failure).rejects.toMatchObject({ field: "email", message: expect.stringMatching(message) });
  });

  it("keeps weak passwords on the password field", async () => {
    const repos = reposWith({ signUp: async () => ({ data: { user: null, session: null }, error: apiError("weak_password", "Too weak") }) });
    await expect(repos.auth.signUp(SIGN_UP)).rejects.toMatchObject({ field: "password", message: "Too weak" });
  });
});

describe("Supabase sign-in errors", () => {
  const signInWith = (error: AuthApiError) =>
    reposWith({ signInWithPassword: async () => ({ data: { user: null, session: null }, error }) }).auth.signIn({
      email: "ada@example.com",
      password: "password123",
    });

  it("treats wrong credentials as a normal miss", async () => {
    expect(await signInWith(apiError("invalid_credentials"))).toBeNull();
  });

  it("explains an unconfirmed email and rate limits instead of 'invalid password'", async () => {
    await expect(signInWith(apiError("email_not_confirmed"))).rejects.toMatchObject({ message: expect.stringMatching(/Confirm your email/) });
    await expect(signInWith(apiError("over_request_rate_limit", "x", 429))).rejects.toMatchObject({ message: expect.stringMatching(/Too many attempts/) });
  });
});
