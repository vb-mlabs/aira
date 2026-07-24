import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/post/*.
 *
 * Native header is hidden — every screen renders <TopBar /> at the top
 * of its JSX. The new-post composer (post/new.tsx) keeps its own
 * Stack.Screen options for sheet presentation (pageSheet + detents),
 * but no longer relies on the native header for its title/Cancel.
 *
 * The post detail screen ([id]) is presented as a modal — both the
 * community-board tap and the notifications-screen tap open it that
 * way, so the user's original context (feed scroll position, active
 * tab, notifications list) stays intact behind the sheet and a
 * downward swipe / native back returns them exactly where they
 * were. The previous plain push produced a full-screen forward
 * transition and reads as leaving one place for another.
 */
export default function PostLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
