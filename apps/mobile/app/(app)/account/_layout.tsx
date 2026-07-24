import * as React from "react";
import { Stack } from "expo-router";

/**
 * Stack layout for /(app)/account/*.
 *
 * Native header is hidden — every screen renders <TopBar /> at the top
 * of its JSX. The account hub (index.tsx) uses HamburgerButton on the
 * left; sub-screens (favorites, profile, notifications, etc.) use
 * BackButton. The notifications screen additionally passes a "Read
 * all" affordance to TopBar's right slot.
 *
 * The notification detail screen (`notification/[id]`) is presented as
 * a modal so tapping a notification opens a sheet over the list —
 * dismiss returns straight to the notifications inbox without losing
 * scroll position. Its "View Post" CTA then pushes to /post/[id]
 * (also modal, from post/_layout.tsx), stacking on top.
 */
export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="notification/[id]"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}
