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
        // Hide the back chevron. The bottom tab bar is always visible,
        // Android has hardware back, and iOS keeps its edge-swipe
        // gesture (React Navigation's default `gestureEnabled: true`
        // is unaffected). Radha 2026-07-06 UAT.
        headerBackVisible: false,
      }}
    />
  );
}
