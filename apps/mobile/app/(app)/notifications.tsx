import * as React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { brand } from "@aira/config";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { EmptyNotificationsIllustration } from "../../lib/illustrations/empty-notifications";
import {
  useNotifications,
  useMarkAllRead,
} from "../../features/notifications/hooks";
import type { NotificationRow } from "../../features/notifications/api";

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
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () =>
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
              >
                <Text className="pr-2 text-base text-foreground">Mark all</Text>
              </Pressable>
            ) : null,
        }}
      />
      {isLoading ? (
        <View className="px-4 pt-4" style={{ gap: 12 }}>
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
            You're all caught up.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <Text className="ml-4 mt-4 text-xs uppercase tracking-wider text-mutedForeground">
                  {item.label}
                </Text>
              );
            }
            const n = item.notification!;
            const isRead = n.read_at !== null;
            return (
              <View
                className="flex-row items-center border-b border-border px-4"
                style={{ minHeight: 60 }}
              >
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
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
