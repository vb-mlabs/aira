import * as React from "react";
import {
  router,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

/**
 * Install a `beforeRemove` listener that intercepts back navigation on
 * screens pushed with an origin-aware `?from=<href>` param, so iOS
 * edge-swipe, Android hardware back, and OS gestures all round-trip to
 * the origin — same behaviour as the app's BackButton / bottom "Go back"
 * button, which read the same param.
 *
 * The interceptor is a no-op when the screen has no `from` param, so it's
 * safe to call unconditionally from any nested screen.
 *
 * ─── Why ─────────────────────────────────────────────────────────────
 * Our BackButton uses router.replace(from) when the user taps it, which
 * jumps directly to the origin. But react-navigation's OS back handlers
 * (iOS `gestureEnabled: true`, Android BackHandler) fire the raw
 * `goBack()` stack action directly — they never see our custom button.
 * That's why users can hit "back" from a business detail via the header
 * arrow and land on Home, but swipe back and land on the URL-hierarchical
 * parent (a stale `/listings/<cat>` entry that redirects to the
 * All-Listings tab). This hook closes the gap by hooking beforeRemove,
 * which fires for BOTH tap-based back and OS gesture back.
 *
 * ─── Loop guard ──────────────────────────────────────────────────────
 * Calling `router.replace` inside the listener triggers the current
 * screen to unmount — which fires beforeRemove a second time as the
 * screen is being removed. We guard with a local `intercepted` flag so
 * the second fire falls through to the default action (the removal
 * caused by our replace) instead of re-dispatching.
 */
export function useOriginAwareBack(): void {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string }>();
  const from =
    typeof params.from === "string" && params.from.length > 0
      ? params.from
      : undefined;

  React.useEffect(() => {
    if (!from) return undefined;
    let intercepted = false;
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (intercepted) return;
      // Only intercept back-like actions (user gesture, hardware back,
      // header chevron pop). Programmatic REPLACE/PUSH-that-removes-this
      // has a different action.type and we should let those pass.
      const type = (e as unknown as { data?: { action?: { type?: string } } })
        .data?.action?.type;
      if (type !== "GO_BACK" && type !== "POP" && type !== "POP_TO_TOP") {
        return;
      }
      e.preventDefault();
      intercepted = true;
      router.replace(from as never);
    });
    return unsub;
  }, [navigation, from]);
}
