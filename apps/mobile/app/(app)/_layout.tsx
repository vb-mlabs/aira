import * as React from "react";
import { Redirect, router, Tabs } from "expo-router";
import { Text } from "react-native";
import { useMe } from "../../features/auth/hooks";
import { useUnreadCount } from "../../features/notifications/hooks";
import { NotificationsPrePrompt } from "../../components/NotificationsPrePrompt";
import { HamburgerButton } from "../../components/nav/HamburgerButton";
import { NotificationBell } from "../../components/nav/NotificationBell";
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
          // Default ON so plain-screen tabs (Home, Categories) inherit
          // the cream header chrome. Post + Account override to OFF
          // below because their Stack children render their own header
          // — leaving headerShown true there would double-stack a
          // Tabs header on top of the Stack header.
          headerShown: true,
          headerStyle: { backgroundColor: "#EAE0CB" },
          headerTintColor: "#3D2814",
          headerTitleStyle: { fontWeight: "600" },
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11 },
          // Cream bg + dark-brown active tint mirror the Post/Listings
          // stack header chrome so the top and bottom edges read as one
          // continuous frame around the content. borderTopColor uses the
          // same brown at low opacity for a subtle hairline divider.
          tabBarStyle: {
            height: 64,
            backgroundColor: "#EAE0CB",
            borderTopColor: "rgba(61,40,20,0.12)",
          },
          tabBarActiveTintColor: "#3D2814",
          tabBarInactiveTintColor: "rgba(61,40,20,0.55)",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarAccessibilityLabel: "Home tab",
            // Home is the one tab that uses the Tabs-level shared header;
            // its hamburger + bell live here rather than on a per-screen
            // Stack.Screen. Sibling tabs (categories/post/account) wire
            // hamburger inside their own root screen's Stack.Screen.
            headerLeft: () => <HamburgerButton />,
            headerRight: () => <NotificationBell />,
            // Compress content area from the 44pt default to 40pt so the
            // cream between the safe-area (notch) and the title reads
            // tighter on big-notch devices. Safe-area itself is
            // untouched — the OS-mandated inset stays intact.
            headerStyle: {
              backgroundColor: "#EAE0CB",
              height: 40,
            },
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="⌂" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          listeners={{
            // Tapping the tab always lands on the tab's root, even from
            // a sub-cat drill-down. React Navigation's default restores
            // the deeper stack state on cross-tab return and only
            // popToTops on same-tab re-tap; router.replace covers both.
            tabPress: (e) => {
              e.preventDefault();
              router.replace("/(app)/categories");
            },
          }}
          options={{
            // categories/_layout.tsx is a Stack — let it render the
            // header so this tab picks up the drawer hamburger via the
            // root screen's own Stack.Screen options.
            headerShown: false,
            // Renamed from "Categories" — the tab is now the All-Listings
            // default surface (task 9). Filesystem route stays
            // /(app)/categories/ to avoid breaking deep links.
            title: "Listings",
            tabBarAccessibilityLabel: "Listings tab",
            tabBarIcon: ({ focused }) => (
              // ☰ (three horizontal lines) reads as a listings feed;
              // the old ▦ grid glyph read as "categories" which no
              // longer matches the tab's contents.
              <TabIcon glyph="☰" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.replace("/(app)/post");
            },
          }}
          options={{
            // post/_layout.tsx is a Stack — let it render the header.
            headerShown: false,
            title: "Post",
            tabBarAccessibilityLabel: "Post tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="✎" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.replace("/(app)/account");
            },
          }}
          options={{
            // account/_layout.tsx is a Stack — let it render the header.
            headerShown: false,
            title: "Account",
            tabBarAccessibilityLabel: "Account tab",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="◯" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            // Listings + business detail live under their own Stack
            // layout (see listings/_layout.tsx). Hidden from the tab
            // bar — the Categories tab is the entry point via
            // router.push("/listings/<slug>"). headerShown:false so
            // the Stack header is the only cream bar (otherwise the
            // Tabs-level header doubles up on top of it).
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
    </>
  );
}
