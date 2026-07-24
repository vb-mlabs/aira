import * as React from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { goBackTo } from "./goBackTo";

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
 * The tap-based BackButton uses `router.dismissTo(from)` (see
 * components/nav/BackButton.tsx), which pops the current stack back
 * to `from` if it's present, or navigates to `from` as a fresh screen
 * if not. iOS edge-swipe / Android hardware back fire the raw stack
 * `goBack` instead — bypassing the button — which can pop across a
 * cross-tab entry (e.g. Home → Post → subcategory → detail, where a
 * naive goBack pops detail to subcategory, but a second unintended
 * swipe would pop to Post). Intercept those OS gestures so they also
 * go through dismissTo(from) and honour the intended origin.
 *
 * ─── Loop guard ──────────────────────────────────────────────────────
 * Calling `router.dismissTo` inside the listener triggers the current
 * screen to unmount — which fires beforeRemove a second time as the
 * screen is being removed. We guard with a local `intercepted` flag so
 * the second fire falls through to the default action (the removal
 * caused by our dismissTo) instead of re-dispatching.
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
      // Route through the same helper as BackButton so tab-root
      // origins cross tabs via router.replace instead of failing
      // silently through dismissTo.
      goBackTo(from);
    });
    return unsub;
  }, [navigation, from]);
}
