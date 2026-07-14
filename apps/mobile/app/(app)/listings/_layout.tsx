import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/listings/*.
 *
 * Hidden tab (href: null in (app)/_layout.tsx) — reached via router.push
 * into a specific /listings/<slug> or /listings/<slug>/<id> route.
 *
 * Native header is hidden — every screen renders <TopBar /> at the top
 * of its JSX. Fixes iOS 26 UINavigationBar bar-button "Liquid Glass"
 * capsule on custom headerLeft/headerRight views.
 */
export default function ListingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
