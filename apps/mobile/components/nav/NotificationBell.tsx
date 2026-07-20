import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUnreadCount } from "../../features/notifications/hooks";

const HEADER_TINT = "#3D2814";
const BADGE_BG = "#d40c1a"; // destructive red — same as sign-out row on account hub
const BADGE_FG = "#ffffff";

/**
 * Home headerRight — mirrors the notification bell on the web mobile top
 * bar. Reads useUnreadCount (already cache-warmed by (app)/_layout.tsx)
 * and renders a small red-dot badge with the count when > 0. Tap
 * navigates to /account/notifications (the existing screen); cross-tab
 * jump uses router.push so the back stack works the way the account
 * sub-screens expect.
 *
 * Count clamped to "9+" for display so double-digit counts don't blow up
 * the badge width. Web sidebar uses the same convention.
 */
export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data ?? 0;
  const showBadge = count > 0;
  const label = count > 9 ? "9+" : String(count);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        showBadge
          ? `Notifications, ${count} unread`
          : "Notifications, none unread"
      }
      onPress={() => router.push("/account/notifications" as never)}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
      hitSlop={8}
    >
      <View>
        <MaterialCommunityIcons
          name="bell-outline"
          size={22}
          color={HEADER_TINT}
        />
        {showBadge ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: BADGE_BG,
              paddingHorizontal: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: BADGE_FG,
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 14,
              }}
            >
              {label}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
