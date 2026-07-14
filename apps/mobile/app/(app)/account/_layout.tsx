import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/account/*.
 *
 * Native header is hidden — every screen renders <TopBar /> at the top
 * of its JSX. The account hub (index.tsx) uses HamburgerButton on the
 * left; sub-screens (favorites, profile, notifications, etc.) use
 * BackButton. The notifications screen additionally passes a "Mark
 * all" affordance to TopBar's right slot.
 */
export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
