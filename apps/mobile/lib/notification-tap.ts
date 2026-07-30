import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

// F20-community-push — mobile-side push tap handler.
//
// Called ONCE from apps/mobile/app/_layout.tsx during a useEffect on
// root mount. Installs two Expo Notifications wirings:
//
//   1. setNotificationHandler — controls what a push does WHILE the
//      app is foregrounded. Without this, iOS silently suppresses
//      foreground pushes (the whole notification chrome including
//      the sound + badge is skipped). We ask for banner + sound +
//      badge for every kind, matching what the OS would do if the
//      app were backgrounded — consistent UX regardless of app state.
//
//   2. addNotificationResponseReceivedListener — fires when the user
//      taps a push notification (foreground OR background). We route
//      them to /(app)/account/notification/[id] using
//      data.notification_id, matching the bell-tap pattern
//      (apps/mobile/app/(app)/account/notifications.tsx:173). The
//      target modal (apps/mobile/app/(app)/account/notification/[id].tsx)
//      renders from the cached notification list — no downstream
//      post fetch, so it never dead-ends on the community-post
//      visibility filter (the exact reason that route was
//      introduced in the first place; see the modal's header
//      comment for the trace).
//
// Cold-start via push:
//   When the app is fully killed and the user taps a push on the
//   lock screen, iOS/Android launch the app with the response
//   already delivered — the active listener above does NOT fire.
//   We check Notifications.getLastNotificationResponseAsync() once
//   on install to catch that case.
//
// Signed-out users:
//   Handled implicitly. If the tap routes to
//   /(app)/account/notification/[id] while the user is signed out,
//   the (auth) redirect gate kicks in and lands them on the
//   welcome / login screen. When they sign back in, the
//   notification tab is one tap away from the account hub. Simpler
//   than plumbing an auth-check inside the tap handler.

interface PushTapData {
  notification_id?: unknown;
}

/**
 * Route a tap to the notification detail modal if the payload
 * carries a valid notification_id. Matches the bell-tap href pattern
 * verbatim.
 */
function handleTap(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as
    | PushTapData
    | undefined;
  const notificationId =
    typeof data?.notification_id === "string" ? data.notification_id : null;
  if (!notificationId) return;
  // router.replace — not push — because a push tap starts a fresh
  // interaction; back should return to the tab-root, not to a
  // phantom pre-notification screen.
  router.replace(`/account/notification/${notificationId}` as never);
}

/**
 * Install foreground + tap wiring. Returns a cleanup fn so a test
 * or future teardown can remove the listener; production callers
 * mount once at root and never call it.
 */
export function installNotificationHandlers(): () => void {
  // Android channel — created idempotently at every launch. Without a
  // channel at IMPORTANCE_HIGH the OS auto-creates a `default` channel
  // at IMPORTANCE_DEFAULT, which suppresses heads-up + lock-screen wake
  // + reliable sound. Server callers (packages/services/src/notifications/
  // push*.ts) reference channelId: "aira_alerts_v1" — same name, so the
  // push lands on our HIGH channel.
  //
  // Why `_v1` suffix: Android does not let apps raise the importance of
  // an existing channel (only users can, from Settings). OTA #5 (2026-
  // 07-30) shipped a channel named "default" at HIGH, but users who had
  // AIRA installed before OTA #5 already had a "default" channel Expo
  // auto-created at IMPORTANCE_DEFAULT — our HIGH config was silently
  // ignored for them. Escaping the trap: use a fresh channel ID. Any
  // future config change that needs an importance bump gets `_v2`, etc.
  //
  // deleteNotificationChannelAsync on the old "default" channel is
  // best-effort cleanup so users don't see a stale entry in Settings >
  // Apps > AIRA > Notifications. Guarded — the delete throws on OS
  // versions or edge cases where the channel doesn't exist.
  //
  // iOS ignores notification channels entirely — safe to skip.
  //
  // Fire-and-forget: installNotificationHandlers stays synchronous (its
  // parent effect in _layout.tsx uses the returned cleanup fn as-is).
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("aira_alerts_v1", {
      name: "AIRA notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    void Notifications.deleteNotificationChannelAsync("default").catch(() => {
      // Channel might not exist (fresh install post-fix) or delete not
      // permitted on this OS version — safe to swallow.
    });
  }

  // Foreground behaviour: same as background — surface the banner,
  // play the sound, bump the badge. `shouldShowList: true` is the
  // Expo SDK 51+ replacement for the older shouldShowAlert prop.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Active listener — user taps while the app is running (foreground
  // or background but alive).
  const subscription =
    Notifications.addNotificationResponseReceivedListener(handleTap);

  // Cold-start listener — user tapped a push that launched the app
  // from a killed state. Fire once, best-effort. `.catch` swallows
  // because a failure here just means the user lands on the app's
  // default screen instead of the notification modal — a soft
  // degradation, not a crash.
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handleTap(response);
    })
    .catch(() => {
      /* noop */
    });

  return () => subscription.remove();
}
