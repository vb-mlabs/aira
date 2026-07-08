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
 * Diverges from listings/categories/post stacks: those still keep the
 * Radha 2026-07-06 UAT `headerBackVisible: false` chrome. The account
 * stack restores the back chevron because its sub-screens' escape
 * hatch (tap Account tab) was broken by React Navigation's default
 * restore-state-on-cross-tab-return behavior. account/index.tsx
 * overrides with `headerBackVisible: false` so the tab's root doesn't
 * show a spurious back arrow.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#EAE0CB" },
        headerTintColor: "#3D2814",
        headerTitleStyle: { fontWeight: "600" },
      }}
    />
  );
}
