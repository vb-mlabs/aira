import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/listings/* routes — gives [category] and
 * [category]/[id] proper headers with back navigation.
 *
 * Registered as a hidden tab in (app)/_layout.tsx (href: null) so the
 * route exists but doesn't add a 5th icon to the bar; the Categories
 * tab routes here via router.push.
 */
export default function ListingsLayout() {
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
