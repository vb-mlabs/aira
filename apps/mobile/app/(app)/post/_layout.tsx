import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/post/* routes — gives index, [id], and new
 * proper headers with back navigation.
 *
 * Registered as the visible "Post" tab in (app)/_layout.tsx. The bottom
 * tab resolves to post/index.tsx (the board); router.push pushes into
 * the stack for /post/<id> and /post/new.
 *
 * Header colors match listings/_layout.tsx so the chrome reads
 * consistently across the app.
 */
export default function PostLayout() {
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
