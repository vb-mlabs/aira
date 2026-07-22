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
 * Screens can be reached two ways: (a) via in-app navigation (Home →
 * subcategory → detail), in which case the stack has real entries
 * underneath and natural back navigation pops to the correct place;
 * (b) via a deep-link entry (universal link, push notification, shared
 * URL), where the current screen is the ONLY entry in the stack and a
 * natural back would exit the app or dead-end. This hook handles (b)
 * only — when `canGoBack()` is false, intercept back-like actions and
 * route to `?from=<href>` so the user lands somewhere sensible.
 *
 * When `canGoBack()` is true we let the native gesture / hardware back
 * proceed unmodified — that's the fix for the "back goes to Home
 * instead of the previous subcategory" regression: pushing screens
 * with router.push builds the correct stack, and letting the natural
 * pop happen is more reliable than router.replace(from) (which can
 * mis-resolve against hidden-tab routes and reset to Home).
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
      // In-app navigation has a real stack to pop back to — let the
      // native handler do it. Only intercept for deep-link arrivals.
      if (router.canGoBack()) return;
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
