import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/post/*.
 *
 * Native header is hidden — every screen renders <TopBar /> at the top
 * of its JSX. The new-post composer (post/new.tsx) keeps its own
 * Stack.Screen options for sheet presentation (pageSheet + detents),
 * but no longer relies on the native header for its title/Cancel.
 */
export default function PostLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
