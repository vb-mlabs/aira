// Mobile auth API. Hits Better Auth's canonical paths directly via the bearer
// plugin (no custom wrappers on the server) and chains sign-in → refresh so
// the screen gets both tokens in one logical step:
//
//   POST /api/auth/sign-in/email   → { token: <session>, user }
//   POST /api/auth/refresh         → { accessToken: <JWT>, expiresIn }
//
// On sign-up, Better Auth requires email verification first; the response has
// no usable token yet, so we land on the check-email screen rather than
// chasing a refresh.

import {
  apiPost,
  setTokens,
  clearTokens,
  getRefreshToken,
  API_BASE_URL,
  ApiError,
} from "../../lib/api/client";
import type {
  SignUpInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@mlabs/validators";

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
}

interface BetterAuthSignInResponse {
  token: string;
  user: User;
}

interface BetterAuthSignUpResponse {
  // Better Auth doesn't return a token on sign-up when emailVerification
  // is required (our case — auth/index.ts: requireEmailVerification: true).
  // The user must verify before signing in.
  user: User;
  token: string | null;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Sign up. Server returns the user but no usable token (verification flow
 * required). Caller navigates to the "check email" screen.
 */
export async function signUpRequest(
  input: SignUpInput,
): Promise<{ user: User }> {
  const data = await apiPost<BetterAuthSignUpResponse>(
    "/api/auth/sign-up/email",
    input,
  );
  return { user: data.user };
}

/**
 * Sign in + immediate JWT refresh. Stores both tokens in SecureStore on success.
 */
export async function loginRequest(
  input: LoginInput,
): Promise<{ user: User }> {
  const signIn = await apiPost<BetterAuthSignInResponse>(
    "/api/auth/sign-in/email",
    input,
  );

  // Stash refresh first so performRefresh() can read it.
  // setTokens requires both — we'll write access right after.
  await setTokens({ access: "", refresh: signIn.token });

  // Now mint a JWT access token. Don't go through the apiPost client wrapper
  // because we explicitly want to send the refresh-as-bearer header.
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "X-Client": "mobile", Authorization: `Bearer ${signIn.token}` },
  });
  if (!res.ok) {
    await clearTokens();
    throw new ApiError(
      res.status,
      "auth.refresh_failed",
      "Could not establish session",
    );
  }
  const refresh = (await res.json()) as RefreshResponse;
  await setTokens({ access: refresh.accessToken, refresh: signIn.token });

  return { user: signIn.user };
}

export async function forgotPasswordRequest(
  input: ForgotPasswordInput,
): Promise<{ ok: true }> {
  // Better Auth's email-link reset flow lives at /request-password-reset.
  await apiPost("/api/auth/request-password-reset", {
    email: input.email,
    // Optional — Better Auth uses BETTER_AUTH_URL as the base. Forks can
    // override per-environment by setting this field; deep-link redirector
    // back to mobile reset-password screen is handled by the universal link.
  });
  return { ok: true };
}

export async function resetPasswordRequest(
  input: ResetPasswordInput,
): Promise<{ ok: true }> {
  await apiPost("/api/auth/reset-password", {
    token: input.token,
    newPassword: input.password,
  });
  return { ok: true };
}

export async function verifyEmailRequest(
  token: string,
): Promise<{ ok: true }> {
  await apiPost("/api/auth/verify-email", { token });
  return { ok: true };
}

export async function resendVerifyRequest(
  email: string,
): Promise<{ ok: true }> {
  await apiPost("/api/auth/send-verification-email", { email });
  return { ok: true };
}

export async function signOutRequest(): Promise<void> {
  // Best-effort: invalidate server-side, then always clear local tokens.
  try {
    const refresh = await getRefreshToken();
    if (refresh) {
      await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
        method: "POST",
        headers: {
          "X-Client": "mobile",
          Authorization: `Bearer ${refresh}`,
        },
      });
    }
  } finally {
    await clearTokens();
  }
}

export async function meRequest(): Promise<User> {
  // Better Auth exposes get-session as GET; the client wrapper used POST.
  // Pull it off-path with an explicit GET via the wrapper.
  const refresh = await getRefreshToken();
  const headers: Record<string, string> = { "X-Client": "mobile" };
  if (refresh) headers.Authorization = `Bearer ${refresh}`;
  const res = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
    method: "GET",
    headers,
  });
  if (!res.ok) {
    throw new ApiError(res.status, "auth.no_session", "No active session");
  }
  const data = (await res.json()) as { user: User } | null;
  if (!data?.user) {
    throw new ApiError(401, "auth.no_session", "No active session");
  }
  return data.user;
}
