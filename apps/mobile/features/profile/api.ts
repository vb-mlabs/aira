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

export async function deleteAccount(): Promise<void> {
  await apiDelete("/api/v1/profile");
}
