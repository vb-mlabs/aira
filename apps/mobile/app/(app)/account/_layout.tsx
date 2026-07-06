import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/account/* routes — gives sub-screens like
 * /account/favorites their own headers + back navigation.
 *
 * Registered as the visible "Account" tab in (app)/_layout.tsx. The
 * bottom tab resolves to account/index.tsx (the hub) via expo-router's
 * directory-as-tab semantics; router.push pushes into the stack for
 * sub-pages.
 *
 * Header chrome matches listings/_layout.tsx and post/_layout.tsx so
 * the app reads consistently across stacks. The index screen sets
 * headerShown:false so the Account tab landing has no header (matches
 * the pre-restructure behavior).
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#EAE0CB" },
        headerTintColor: "#3D2814",
        headerTitleStyle: { fontWeight: "600" },
        headerBackVisible: false,
      }}
    />
  );
}
