// Route-segment param names — expo-router's useLocalSearchParams()
// merges dynamic route segments with query params into one object
// (verified in node_modules/expo-router/build/hooks.d.ts: "For dynamic
// routes, both the route parameters and the search parameters are
// returned"). When building a back-href from the current URL, these
// must be stripped — they're already encoded in `pathname`, and
// re-serializing them as query params yields a URL like
// `/listings/restaurants?category=restaurants` that router.replace
// fails to route reliably (falls back to the stack ancestor).
//
// If a new route with a new dynamic segment name gets added, extend
// this set — otherwise back-nav from a screen mounted at that route
// will silently produce a malformed back-href.
//
// See .mstack/debug/2026-07-20-1810-back-nav-skips-listings/report.md.
const ROUTE_SEGMENT_PARAMS = new Set(["category", "id"]);

/**
 * Pure computation. Given a pathname and the merged
 * useLocalSearchParams object, returns the back-href.
 *
 * Isolated from the hook in useBuildBackHref.ts so unit tests can
 * import it without dragging in expo-router at test time.
 *
 * Skips:
 * - `from` itself — nesting origins on top of each other would let a
 *   biz→related-biz→related-biz chain drag the origin through every
 *   hop, which isn't what any Back button consumer wants.
 * - Route-segment params (see ROUTE_SEGMENT_PARAMS above).
 *
 * Preserves genuine query params (e.g. `q` for search, `verified` for
 * filter) so returning to a filtered listings screen keeps the filter.
 */
export function buildBackHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "from") continue;
    if (ROUTE_SEGMENT_PARAMS.has(k)) continue;
    if (typeof v === "string" && v.length > 0) qs.set(k, v);
  }
  const query = qs.toString();
  return query ? `${pathname}?${query}` : pathname;
}
