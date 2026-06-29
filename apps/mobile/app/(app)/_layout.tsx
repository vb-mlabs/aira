import * as React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useMe } from "../../features/auth/hooks";
import { useUnreadCount } from "../../features/notifications/hooks";
import { NotificationsPrePrompt } from "../../components/NotificationsPrePrompt";
import { hasSeenPushPrePrompt } from "../../lib/push";

/**
 * Bottom tab bar — 4 tabs, icon + label always visible.
 *
 * Tab inventory:
 *   1. Home        — /(app)/index.tsx
 *   2. Categories  — /(app)/categories.tsx
 *   3. Post        — /(app)/post.tsx          (P1 placeholder; P2 wires the
 *                                              Post on AIRA community board)
 *   4. Account     — /(app)/account.tsx
 *
 * Notifications screen ((app)/notifications.tsx) stays mounted as a route
 * so push deep-links resolve, but has no tab entry (href: null). P2 adds
 * a bell glyph to the Home header OR an entry under Account.
 *
 * useUnreadCount is still called here even though no badge currently
 * consumes it — keeps the cache warm so P2's bell badge mounts instantly.
 *
 * The V4 mockup originally locked the tab bar at 3 (Home/Categories/Account);
 * the 4-tab layout with Post is the deliberate user-locked override during
 * P1 consultation 2026-06-29 (see .mstack/learnings.jsonl + the plan/review).
 */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        opacity: focused ? 1 : 0.6,
        lineHeight: 26,
      }}
    >
      {glyph}
    </Text>
  );
}

export default function AppLayout() {
  // Session guard. Cold launch is splash-covered by app/index.tsx, so null
  // during the first-load isPending window is fine. On 401 / no session /
  // unverified, bounce to welcome — the gate is the single source of truth
  // for unauthenticated routing.
  const me = useMe();
  // Warm cache for P2's bell badge. No UI consumer in P1.
  useUnreadCount();
  const [prePromptVisible, setPrePromptVisible] = React.useState(false);

  // F21 push pre-prompt gate. Shows once after first sign-in. The manual
  // "Enable notifications" row on the Account screen re-triggers the flow
  // without touching this layout.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!me.data?.emailVerified) return;
      const seen = await hasSeenPushPrePrompt();
      if (!cancelled && !seen) setPrePromptVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [me.data?.emailVerified]);

  if (me.isPending && !me.isFetched) return null;
  if (me.isError || !me.data?.emailVerified) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <>
      <NotificationsPrePrompt
        visible={prePromptVisible}
        onClose={() => setPrePromptVisible(false)}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11 },
          tabBarStyle: { height: 64 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarAccessibilityLabel: "Home tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="⌂" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: "Categories",
            tabBarAccessibilityLabel: "Categories tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="▦" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            title: "Post",
            tabBarAccessibilityLabel: "Post tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="✎" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarAccessibilityLabel: "Account tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="◯" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            // Hide from the tab bar but keep the route navigable via
            // push-tap deep-links and (future) bell-icon in P2.
            href: null,
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            // Listings + business detail live under their own Stack
            // layout (see listings/_layout.tsx). Hidden from the tab
            // bar — the Categories tab is the entry point via
            // router.push("/listings/<slug>").
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}
