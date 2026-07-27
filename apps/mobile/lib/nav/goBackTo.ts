import { router } from "expo-router";

// Visible tab roots, mirroring the Tabs.Screen name= entries at
// apps/mobile/app/(app)/_layout.tsx:141-222 (index, categories, post,
// account). The hidden `listings` tab (`href: null` at :224) is
// deliberately absent — cross-tab flows that ORIGINATE from a
// visible-tab screen and END inside a hidden tab must still stay in
// the current stack on back; leaking the hidden tab into this set
// would break that.
const VISIBLE_TABS = ["index", "categories", "post", "account"] as const;
type VisibleTab = (typeof VISIBLE_TABS)[number];

// Tab-root paths — Home is the raw root "/" (or "/(app)"); Categories/
// Post/Account are single-segment routes under (app). A URL like
// "/categories?foo=1" still counts (strip the query before matching).
const TAB_ROOT_RE = /^\/(?:(?:\(app\)\/?)?)?(?:categories|post|account)?$/;

function stripQuery(href: string): string {
  return href.split("?")[0]!;
}

function isTabRootPath(href: string): boolean {
  return TAB_ROOT_RE.test(stripQuery(href));
}

/**
 * Which visible tab (if any) does `href` belong to?
 *
 * - Bare "/" or "/(app)"           → "index" (Home tab)
 * - "/categories" or "/categories/…" → "categories"
 * - "/post" or "/post/…"            → "post"
 * - "/account" or "/account/…"      → "account"
 * - Anything else (including /listings/… — hidden tab)  → null
 *
 * Callers use `null` as "stay in the current stack" — the shape used
 * by same-tab-nested pops AND by nested paths under a hidden tab.
 * Both cases route through `router.dismissTo` further down.
 */
export function getTargetTab(href: string): VisibleTab | null {
  const pathnameOnly = stripQuery(href).replace(/^\/\(app\)\/?/, "/");
  if (pathnameOnly === "" || pathnameOnly === "/") return "index";
  const [, first] = pathnameOnly.split("/");
  if (first && (VISIBLE_TABS as readonly string[]).includes(first)) {
    return first as VisibleTab;
  }
  return null;
}

/**
 * Route the user "back" to `from`, or fall back to the standard pop
 * sequence when `from` isn't set. Shared between BackButton and the
 * biz-detail bottom Go-back button so both round-trip the same way.
 *
 * ─── Three-way branch ────────────────────────────────────────────────
 * The primitive to reach a given `from` depends on whether that origin
 * lives in the current tab's stack, a different tab's stack, or is a
 * bare tab-root swap:
 *
 * 1. Bare tab-root (`/`, `/categories`, `/post`, `/account`) →
 *    `router.replace(from)`. Swaps the visible tab shell cleanly;
 *    replace's "resolves through the tab registry" behaviour is
 *    exactly what we want for a shell-level move.
 *
 * 2. Nested inside a visible tab OTHER than the current one →
 *    `router.navigate(from)`. expo-router's tab-aware navigation
 *    brings the target tab's screen forward if it exists in that
 *    stack, else pushes a fresh screen inside it. This is the branch
 *    that broke before the 2026-07-27 fix — `dismissTo` was silently
 *    called and no-op'd because it can't cross tabs. See
 *    .mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/report.md.
 *
 * 3. Everything else — same-tab nested paths (the historic
 *    Categories → subcategory → detail flow) AND nested paths under
 *    the hidden `listings` tab — `router.dismissTo(from)`. dismissTo
 *    is correct here because it pops the current stack back to the
 *    target, preserving screen state. The two sub-cases collapse into
 *    the same branch because the goBackTo caller CAN'T reliably tell
 *    which stack it's in from a plain string; getTargetTab's `null`
 *    return is our "stay in the current stack" signal for both.
 *
 * ─── Why not just router.replace for cross-tab-nested? ───────────────
 * `.claude/memory/expo-router-cross-tab-replace.md`: replace on a
 * nested cross-tab target replaces the CURRENT tab's screen with the
 * target's content instead of switching tab shells. We'd get "My
 * Listings" rendered inside the Listings tab shell — same visual
 * effect as "back button broken". Navigate is the correct primitive
 * for the shell-switch + push into the target's stack.
 */
export function goBackTo(from: string | undefined): void {
  if (from) {
    if (isTabRootPath(from)) {
      router.replace(from as never);
      return;
    }
    // getTargetTab returns non-null only for nested paths under a
    // visible tab. Same-tab pops and hidden-tab pops both fall
    // through to the `dismissTo` branch below via a null return.
    if (getTargetTab(from) !== null) {
      router.navigate(from as never);
      return;
    }
    router.dismissTo(from as never);
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(app)" as never);
}
