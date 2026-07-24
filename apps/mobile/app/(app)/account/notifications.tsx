import * as React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

/** Resolve a notification body to a mobile route, or null if there's
 *  nowhere on the mobile app to go (e.g. `message` kind — mobile has
 *  no messages surface — or a generic notification whose href is a
 *  non-relative web URL). Mirrors the per-kind switch in
 *  apps/web/src/features/notifications/components/notification-item.tsx's
 *  renderBody, but rewritten for mobile routes: community posts live
 *  at /post/<id>, business broadcasts land on /account/listings. */
function hrefFor(body: NotificationRow["body"]): string | null {
  switch (body.kind) {
    case "post_interest":
    case "post_comment":
      return `/post/${body.post_id}`;
    case "business_broadcast":
      return "/account/listings";
    case "generic":
      // Only follow relative paths — an arbitrary https:// URL would
      // need Linking.openURL and isn't guaranteed to resolve inside
      // the app shell.
      return body.href && body.href.startsWith("/") ? body.href : null;
    case "message":
      // No messaging surface on mobile yet.
      return null;
  }
}

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

export default function NotificationsScreen() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const toast = useToast();

  const rows = React.useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <SafeAreaView className="flex-1 bg-background">
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
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Double-check glyph — the WhatsApp/Gmail "everything read"
                  convention. Fits the 44pt icon slot and stays consistent
                  with post/index's plus icon in the same TopBar right
                  slot. Text-based "Mark all read" clipped to two lines
                  inside the slot; users flagged the truncation. */}
              <MaterialCommunityIcons
                name="check-all"
                size={22}
                color="#3D2814"
              />
            </Pressable>
          ) : null
        }
      />
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
            const href = hrefFor(n.body);
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
            // Rows for notification kinds with a target route (post
            // interest/comment, business broadcast, relative-href
            // generic) become Pressable so tap navigates — matches the
            // web NotificationItem's <Link> wrapping. Rows with no
            // route (message kind on mobile) stay as plain View so
            // there's no false tap affordance.
            if (href) {
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
            }
            return (
              <View className="flex-row items-center border-b border-border px-5 py-4">
                {rowChildren}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
