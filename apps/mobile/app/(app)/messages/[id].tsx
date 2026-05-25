import * as React from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useMe } from "../../../features/auth/hooks";
import {
  useMessages,
  useSendMessage,
} from "../../../features/messages/hooks";
import type { Message } from "../../../features/messages/api";

export default function MessageThread() {
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = (params.id as string | undefined) ?? null;
  const me = useMe();
  const { data, isLoading } = useMessages(conversationId);
  const send = useSendMessage(conversationId ?? "");
  const toast = useToast();
  const [body, setBody] = React.useState("");
  const listRef = React.useRef<FlatList<Message>>(null);

  React.useEffect(() => {
    // Auto-scroll to bottom when new messages arrive.
    if (data && data.length > 0) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true })
      );
    }
  }, [data]);

  const onSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !conversationId) return;
    setBody("");
    try {
      await send.mutateAsync(trimmed);
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Couldn't send",
        kind: "error",
      });
      setBody(trimmed);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Conversation" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <View className="flex-1 px-4 pt-4" style={{ gap: 12 }}>
            <Skeleton height={40} />
            <Skeleton width="60%" height={40} />
            <Skeleton height={40} />
            <Skeleton width="80%" height={40} />
            <Skeleton width="50%" height={40} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={data ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item }: { item: Message }) => {
              const mine = item.senderId === me.data?.id;
              return (
                <View
                  className={
                    mine
                      ? "self-end rounded-2xl bg-primary px-3 py-2"
                      : "self-start rounded-2xl bg-muted px-3 py-2"
                  }
                  style={{ maxWidth: "78%" }}
                >
                  <Text
                    className={
                      mine
                        ? "text-base text-primaryForeground"
                        : "text-base text-foreground"
                    }
                  >
                    {item.body}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center pt-24">
                <Text className="text-base text-mutedForeground">
                  Say hello.
                </Text>
              </View>
            )}
          />
        )}
        <View
          className="flex-row items-end border-t border-border bg-background px-3 py-2"
          style={{ gap: 8 }}
        >
          <TextInput
            className="max-h-32 flex-1 rounded-2xl border border-input bg-background px-3 py-2 text-base text-foreground"
            value={body}
            onChangeText={setBody}
            placeholder="Message"
            placeholderTextColor="#8e8e8e"
            multiline
            accessibilityLabel="Message input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !body.trim() || send.isPending }}
            disabled={!body.trim() || send.isPending}
            onPress={onSend}
            className={`h-11 items-center justify-center rounded-full px-4 ${
              body.trim() ? "bg-primary" : "bg-muted"
            }`}
          >
            <Text className="text-base font-semibold text-primaryForeground">
              Send
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
