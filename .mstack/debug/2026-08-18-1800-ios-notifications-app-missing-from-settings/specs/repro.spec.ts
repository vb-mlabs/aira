// Pinpoints the *cause* of "AIRA not visible under iOS Settings → Notifications
// on some phones" (and, downstream, "no lock-screen push on those phones").
//
// On iOS, an app only appears under Settings → Notifications once it has
// called UNUserNotificationCenter.requestAuthorization() at least once (via
// Notifications.requestPermissionsAsync() in expo-notifications). If nothing
// in the app ever calls that API on a given install, the OS never registers
// AIRA as a notifications-capable app and the row is absent — which is
// exactly the symptom the user reported.
//
// AIRA's push permission is requested inside lib/push.ts's
// requestPermissionAndRegister(). That function has TWO expected callers:
//
//   1. NotificationsPrePrompt.tsx — the soft pre-prompt shown once after
//      first sign-in. Its "Enable notifications" button calls it. Its
//      "Maybe later" button does NOT (it only flips a SecureStore flag via
//      dismissPushPrePrompt()). After "Maybe later", the pre-prompt never
//      appears again (see hasSeenPushPrePrompt gate in
//      apps/mobile/app/(app)/_layout.tsx).
//
//   2. A manual re-trigger surface (previously an "Enable notifications"
//      row on Account → Privacy & Security), so users who tapped "Maybe
//      later" — or who first-signed-in on a build that predated the plugin
//      — can still opt in later.
//
// Commit c9e43c0 (2026-08-04, feat(mobile/privacy)) removed the manual
// re-trigger row and explicitly flagged "Follow-up needed to place it
// somewhere sensible — most natural home is the /account/notifications
// inbox as a 'notifications aren't enabled — turn them on' banner." The
// follow-up never landed. Since then, the pre-prompt is the ONLY code path
// in the app that can call Notifications.requestPermissionsAsync(), and any
// user who ever tapped "Maybe later" is stuck: OS was never asked, so the
// app never appears in Settings → Notifications, and no lock-screen push
// ever arrives.
//
// This test asserts the invariant: at least one file OTHER than
// NotificationsPrePrompt.tsx (i.e. a manual re-trigger surface) references
// requestPermissionAndRegister(). Currently 0 → test fails. After the fix
// (banner or Account row that calls it), count ≥ 1 → test passes.

import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const MOBILE_APP_ROOT = resolve(__dirname, "../../../../apps/mobile");

function grepCallers(symbol: string): string[] {
  try {
    const out = execSync(
      `grep -rln --include='*.ts' --include='*.tsx' ${JSON.stringify(symbol)} .`,
      { cwd: MOBILE_APP_ROOT, encoding: "utf8" },
    );
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => !p.includes("/node_modules/"))
      .filter((p) => !p.includes("/.expo/"))
      .filter((p) => !p.includes("/dist/"));
  } catch {
    return [];
  }
}

describe("iOS notification-permission entry points", () => {
  it("has a manual re-trigger surface beyond the one-shot pre-prompt", () => {
    // Every file that calls requestPermissionAndRegister() from lib/push.ts.
    const callers = grepCallers("requestPermissionAndRegister(");
    // Filter down to *call sites* (not the definition and not the pre-prompt).
    const manualEntryPoints = callers.filter(
      (path) =>
        !path.endsWith("lib/push.ts") &&
        !path.endsWith("components/NotificationsPrePrompt.tsx"),
    );
    expect(
      manualEntryPoints,
      "After 'Maybe later' is tapped once, the pre-prompt never fires again " +
        "(hasSeenPushPrePrompt flag). Without a second entry point that calls " +
        "requestPermissionAndRegister(), the OS is never asked for permission, " +
        "so AIRA is absent from Settings → Notifications and no lock-screen " +
        "pushes are delivered. Add a re-trigger surface (e.g. a banner on " +
        "/account/notifications, or an Account hub row).",
    ).not.toEqual([]);
  });
});
