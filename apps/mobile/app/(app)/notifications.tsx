import * as React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { EmptyNotificationsIllustration } from "../../lib/illustrations/empty-notifications";
import {
  useNotifications,
  useMarkAllRead,
} from "../../features/notifications/hooks";
import type { Notification } from "../../features/notifications/api";

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
  notification?: Notification;
}

function groupByDay(items: Notification[]): Row[] {
  const rows: Row[] = [];
  // unread first, then grouped by day
  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);
  if (unread.length) {
    rows.push({ kind: "header", key: "h-unread", label: "Unread" });
    for (const n of unread) rows.push({ kind: "item", key: n.id, notification: n });
  }
  let currentDay = "";
  for (const n of read) {
    const label = formatDay(new Date(n.createdAt));
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
                    backgroundColor: n.read ? "transparent" : "#3b82f6",
                    marginRight: 12,
                  }}
                />
                <View className="flex-1">
                  <Text
                    className={
                      n.read
                        ? "text-base text-foreground"
                        : "text-base font-semibold text-foreground"
                    }
                    numberOfLines={2}
                  >
                    {n.body}
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
