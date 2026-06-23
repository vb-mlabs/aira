// F21 — push token registration utility.
//
// Single entrypoint requestPermissionAndRegister() does the full
// permission → token → POST flow. Called from the post-login pre-prompt
// (the first time) and from the always-visible account-hub row (manual
// re-trigger). secure-store flags drive the pre-prompt gating in
// app/(app)/_layout.tsx.

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiPost } from "./api/client";

export const PUSH_REGISTRATION_COMPLETED_KEY = "push.registrationCompleted";
export const PUSH_PRE_PROMPT_DISMISSED_KEY = "push.prePromptDismissed";

export interface RegisterResult {
  granted: boolean;
  /** Set on the rare failure paths (token fetch / API call). UI shows a
   *  small toast; the secure-store flag stays false so the user can retry. */
  error?: string;
}

function getEasProjectId(): string | undefined {
  // Expo recommends `Constants.expoConfig?.extra?.eas?.projectId`. The
  // EAS-build runtime exposes it under `easConfig.projectId` too; check
  // both for resilience.
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function setFlag(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // SecureStore can throw on the Expo web preview; the flag persists for
    // the session via the in-memory shim used by the api/client layer.
  }
}

export async function requestPermissionAndRegister(): Promise<RegisterResult> {
  let perms = await Notifications.getPermissionsAsync();
  if (perms.status !== "granted") {
    if (!perms.canAskAgain) {
      return {
        granted: false,
        error: "Notifications are off for AIRA in Settings.",
      };
    }
    perms = await Notifications.requestPermissionsAsync();
  }
  if (perms.status !== "granted") {
    return { granted: false };
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    return {
      granted: false,
      error: "Missing EAS project id — push registration unavailable.",
    };
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiPost("/api/v1/profile/push-token", {
      expo_push_token: tokenResult.data,
      platform: Platform.OS === "android" ? "android" : "ios",
    });
    await setFlag(PUSH_REGISTRATION_COMPLETED_KEY, "1");
    return { granted: true };
  } catch (err) {
    return {
      granted: false,
      error:
        err instanceof Error ? err.message : "Could not register for push.",
    };
  }
}

export async function dismissPushPrePrompt(): Promise<void> {
  await setFlag(PUSH_PRE_PROMPT_DISMISSED_KEY, "1");
}

export async function hasSeenPushPrePrompt(): Promise<boolean> {
  try {
    const [completed, dismissed] = await Promise.all([
      SecureStore.getItemAsync(PUSH_REGISTRATION_COMPLETED_KEY),
      SecureStore.getItemAsync(PUSH_PRE_PROMPT_DISMISSED_KEY),
    ]);
    return !!completed || !!dismissed;
  } catch {
    return false;
  }
}
