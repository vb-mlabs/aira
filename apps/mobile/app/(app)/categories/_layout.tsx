import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/categories/* — gives the root list its cream
 * header AND a back-nav header on the [root] sub-cat drill-down screen.
 *
 * Registered as the visible "Categories" tab in (app)/_layout.tsx; the
 * tab resolves to categories/index.tsx via expo-router's directory-as-
 * tab semantics. router.push("/categories/<root-slug>") pushes the
 * sub-cat picker onto this stack.
 *
 * Header chrome matches listings/_layout.tsx + post/_layout.tsx +
 * account/_layout.tsx so the app reads consistently across stacks.
 */
export default function CategoriesLayout() {
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
