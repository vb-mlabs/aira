import * as React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../../../components/ui/Avatar";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Button } from "../../../components/ui/Button";
import { EmptyInboxIllustration } from "../../../lib/illustrations/empty-inbox";
import { useConversations } from "../../../features/messages/hooks";

export default function MessagesInbox() {
  const { data, isLoading } = useConversations();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "Messages",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compose new message"
              hitSlop={12}
              onPress={() => {
                /* compose flow — v2 */
              }}
            >
              <Text className="pr-2 text-base text-foreground">＋</Text>
            </Pressable>
          ),
        }}
      />
      {isLoading ? (
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="text-mutedForeground">
            <EmptyInboxIllustration size={160} />
          </View>
          <Text className="mt-4 text-lg font-semibold text-foreground">
            No messages yet
          </Text>
          <Text className="mt-1 text-base text-mutedForeground">
            When someone messages you, they'll show up here.
          </Text>
          <View className="mt-6 w-full max-w-xs">
            <Button
              fullWidth
              onPress={() => {
                /* compose */
              }}
            >
              Send your first DM
            </Button>
          </View>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${item.peer.name}`}
              onPress={() => router.push(`/(app)/messages/${item.id}`)}
              className="flex-row items-center border-b border-border px-4"
              style={{ minHeight: 72 }}
            >
              <Avatar
                src={item.peer.avatarUrl}
                name={item.peer.name}
                userId={item.peer.id}
                size={44}
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={
                      item.unread
                        ? "text-base font-semibold text-foreground"
                        : "text-base text-foreground"
                    }
                    numberOfLines={1}
                  >
                    {item.peer.name}
                  </Text>
                  {item.unread ? (
                    <View
                      accessibilityLabel="Unread"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#3b82f6",
                      }}
                    />
                  ) : null}
                </View>
                <Text
                  className="text-sm text-mutedForeground"
                  numberOfLines={1}
                >
                  {item.lastMessagePreview}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
