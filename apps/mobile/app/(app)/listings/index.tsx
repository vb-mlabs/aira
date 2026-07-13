import { Redirect } from "expo-router";

/**
 * `/listings` bare-path fallback. The listings tab is hidden
 * (href: null in (app)/_layout.tsx) and only reached via router.push
 * into a specific /listings/<slug> or /listings/<slug>/<id> route.
 * If stack back-navigation ever lands on `/listings` with no slug
 * (e.g. after popping a business detail whose subcategory was renamed
 * out from under it), redirect to the All-Listings tab so the user
 * doesn't hit an unmatched-route screen.
 */
export default function ListingsIndex() {
  return <Redirect href="/(app)/categories" />;
}
