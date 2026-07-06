import { apiPatch, apiPost, apiDelete } from "../../lib/api/client";

export interface Profile {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  avatarUrl: string | null;
}

export async function updateProfile(input: {
  name?: string;
}): Promise<Profile> {
  const data = await apiPatch<{ user: Profile }>("/api/v1/profile", input);
  return data.user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  return apiPost("/api/v1/profile/password", input);
}

// Kicks off Better Auth's changeEmail flow: POST here mails a confirmation
// link to the CURRENT address; the change only completes once the user
// clicks that link. `changed: false` means the new email matched the
// current one — a server-side no-op — so callers should NOT show the
// "check your inbox" copy in that branch.
export async function requestEmailChange(input: {
  email: string;
}): Promise<{ ok: true; changed: boolean }> {
  return apiPost("/api/v1/profile/email", input);
}

export async function deleteAccount(): Promise<void> {
  await apiDelete("/api/v1/profile");
}
