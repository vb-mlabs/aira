import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { brand } from "@aira/config";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { EmptyNotificationsIllustration } from "../../../lib/illustrations/empty-notifications";
import {
  useNotifications,
  useMarkAllRead,
} from "../../../features/notifications/hooks";
import type { NotificationRow } from "../../../features/notifications/api";
import { requestPermissionAndRegister } from "../../../lib/push";

// Every notification opens the shared notification-detail modal at
// /account/notification/<id>. The modal reads its notification straight
// from the useNotifications cache (no downstream fetch) and hosts the
// per-kind CTA — "View Post" for post_comment/post_interest, "View
// Listings" for business_broadcast, none for message. This replaces
// the previous per-kind straight-to-target routing which stranded
// users on a "Post not found." empty state whenever the community-post
// visibility filter refused the target ID.

/**
 * Moved from apps/mobile/app/(app)/notifications.tsx in P2c T2. The
 * old path was orphaned in P1 (registered as a hidden Tabs.Screen
 * with href:null after the messages-tab cleanup); P2c gives it its
 * home under the Account hub.
 *
 * NOTE for P3 push deep-link routing: tap a notification → land at
 * /account/notifications, NOT the old /notifications path. The old
 * path no longer resolves.
 */

/** Resolve the row's body to a short display string. The wire shape is a
 *  discriminated union (generic | message | post_interest | post_comment);
 *  every kind carries enough copy to fit in the list-row preview slot. */
function renderPreview(body: NotificationRow["body"]): string {
  switch (body.kind) {
    case "generic":
      return body.title;
    case "message":
      return `${body.sender_name}: ${body.preview}`;
    case "post_interest":
      return `${body.responder_name} is interested in your post`;
    case "post_comment":
      return body.is_reply
        ? `${body.commenter_name} replied to your comment`
        : `${body.commenter_name} commented on your post`;
    case "business_broadcast":
      return `${brand.name} team: ${body.title}`;
  }
}

function formatDay(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface Row {
  kind: "header" | "item";
  key: string;
  label?: string;
  notification?: NotificationRow;
}

function groupByDay(items: NotificationRow[]): Row[] {
  const rows: Row[] = [];
  // unread first, then grouped by day
  const unread = items.filter((n) => n.read_at === null);
  const read = items.filter((n) => n.read_at !== null);
  if (unread.length) {
    rows.push({ kind: "header", key: "h-unread", label: "Unread" });
    for (const n of unread) rows.push({ kind: "item", key: n.id, notification: n });
  }
  let currentDay = "";
  for (const n of read) {
    const label = formatDay(new Date(n.created_at));
    if (label !== currentDay) {
      currentDay = label;
      rows.push({ kind: "header", key: `h-${label}-${n.id}`, label });
    }
    rows.push({ kind: "item", key: n.id, notification: n });
  }
  return rows;
}

// Banner shown when iOS/Android has not granted notification permission.
// Second entry point (beyond the one-shot post-login pre-prompt) into
// lib/push.ts's requestPermissionAndRegister, so users who tapped "Maybe
// later" — or never saw the pre-prompt — can still register the app with
// the OS. Without this, iOS never lists AIRA under Settings → Notifications
// and no lock-screen push is delivered. Re-polls permission on focus so
// the banner disappears once the user grants permission (in-app or via
// Settings).
function EnablePushBanner() {
  const [status, setStatus] = React.useState<
    Notifications.PermissionStatus | null
  >(null);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();

  const refresh = React.useCallback(async () => {
    const perms = await Notifications.getPermissionsAsync();
    setStatus(perms.status);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function handleEnable() {
    if (busy) return;
    setBusy(true);
    const result = await requestPermissionAndRegister();
    // iOS-only case: user denied earlier and canAskAgain is false, so no
    // OS prompt will fire. lib/push.ts surfaces this specific message;
    // route the user to Settings so they can flip the toggle themselves.
    if (result.error === "Notifications are off for AIRA in Settings.") {
      try {
        await Linking.openSettings();
      } catch {
        toast.show({ message: "Couldn't open Settings", kind: "error" });
      }
    } else if (result.error) {
      toast.show({ message: result.error, kind: "error" });
    }
    await refresh();
    setBusy(false);
  }

  if (status === null || status === "granted") return null;

  return (
    <View className="mx-5 mt-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
      <Text className="text-sm text-foreground">
        Turn on lock-screen notifications to get updates about your listings
        and posts.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enable notifications"
        disabled={busy}
        onPress={handleEnable}
        className="mt-2 self-start rounded-full bg-primary px-4 py-1.5"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#EAE0CB" />
        ) : (
          <Text className="text-sm font-semibold text-primaryForeground">
            Enable
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function NotificationsScreen() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const toast = useToast();

  const rows = React.useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar
        title="Notifications"
        left={<BackButton />}
        right={
          rows.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={12}
              onPress={async () => {
                try {
                  await markAllRead.mutateAsync();
                } catch {
                  toast.show({
                    message: "Couldn't mark all read",
                    kind: "error",
                  });
                }
              }}
              style={{
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Explicit text label — clearer than a lone check icon.
                  TopBar's right slot uses minWidth (not fixed width)
                  so this expands past the 44pt icon-sized tap target
                  without clipping. */}
              <Text className="text-sm font-semibold text-foreground">
                Read all
              </Text>
            </Pressable>
          ) : null
        }
      />
      <EnablePushBanner />
      {isLoading ? (
        <View className="px-5 pt-4" style={{ gap: 12 }}>
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="text-mutedForeground">
            <EmptyNotificationsIllustration size={160} />
          </View>
          <Text className="mt-4 text-lg font-semibold text-foreground">
            You&apos;re all caught up.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <Text className="mt-5 mb-1 px-5 text-xs uppercase tracking-wider text-mutedForeground">
                  {item.label}
                </Text>
              );
            }
            const n = item.notification!;
            const isRead = n.read_at !== null;
            const href = `/account/notification/${n.id}`;
            const rowChildren = (
              <>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isRead ? "transparent" : "#3b82f6",
                    marginRight: 12,
                  }}
                />
                <View className="flex-1">
                  <Text
                    className={
                      isRead
                        ? "text-base text-foreground"
                        : "text-base font-semibold text-foreground"
                    }
                    numberOfLines={2}
                  >
                    {renderPreview(n.body)}
                  </Text>
                </View>
              </>
            );
            // Every row opens the shared notification-detail modal —
            // the modal handles per-kind CTAs internally so this
            // screen doesn't need to know whether a kind has a
            // downstream target.
            return (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={renderPreview(n.body)}
                onPress={() => router.push(href as never)}
                className="flex-row items-center border-b border-border px-5 py-4"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {rowChildren}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
