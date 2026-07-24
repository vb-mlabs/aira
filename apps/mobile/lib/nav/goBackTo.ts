import { router } from "expo-router";

// Tab-root paths — Home is the raw root "/" (or "/(app)"); Categories/
// Post/Account are single-segment routes under (app). A URL like
// "/categories?foo=1" still counts (strip the query before matching).
// Kept in sync with the Tabs.Screen entries in apps/mobile/app/(app)/_layout.tsx.
const TAB_ROOT_RE = /^\/(?:(?:\(app\)\/?)?)?(?:categories|post|account)?$/;

function isTabRootPath(href: string): boolean {
  const pathnameOnly = href.split("?")[0]!;
  return TAB_ROOT_RE.test(pathnameOnly);
}

/**
 * Route the user "back" to `from`, or fall back to the standard pop
 * sequence when `from` isn't set. Shared between BackButton and the
 * biz-detail bottom Go-back button so both round-trip the same way.
 *
 * ─── Why the two branches ────────────────────────────────────────────
 * `router.dismissTo(from)` is the correct primitive when `from` is
 * inside the current tab's stack — it pops the stack back to that
 * screen preserving state, or replaces the current screen with it if
 * the stack has drifted. BUT dismissTo can only walk the current
 * stack; a `from` on a different tab (e.g. "/" pointing at the Home
 * tab, when the user is now inside the hidden Listings tab because
 * they tapped a business card from Home) is unreachable and dismissTo
 * silently does nothing.
 *
 * `router.replace(from)` resolves the target through the router's tab
 * registry, which crosses tabs cleanly — but breaks nested-path
 * "return to origin" cases because it drops any stack state deeper
 * than the resolved route.
 *
 * The split: tab-root paths (single segment or bare "/") go through
 * replace (cross-tab); everything else through dismissTo (same-tab
 * pop).
 */
export function goBackTo(from: string | undefined): void {
  if (from) {
    if (isTabRootPath(from)) {
      router.replace(from as never);
    } else {
      router.dismissTo(from as never);
    }
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(app)" as never);
}
