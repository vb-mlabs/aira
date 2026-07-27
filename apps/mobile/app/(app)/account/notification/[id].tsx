import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { brand } from "@aira/config";
import { TopBar } from "../../../../components/nav/TopBar";
import { BackButton } from "../../../../components/nav/BackButton";
import { EmptyState } from "../../../../features/listings/components/EmptyState";
import {
  useMarkNotificationRead,
  useNotifications,
} from "../../../../features/notifications/hooks";
import { relativeTime } from "../../../../features/community/relative-time";
import type { NotificationRow } from "../../../../features/notifications/api";

// Notification detail modal — reads its notification straight from the
// cached list (useNotifications keeps that list warm at 5s intervals
// while the app is foregrounded). Because the render only uses the
// notification body itself, this screen never depends on a downstream
// post/business/message fetch — the previous straight-to-post flow
// broke ("Post not found.") whenever the community-post visibility
// filter refused the target ID, and users saw a dead end rather than
// the notification they were trying to inspect.
//
// This is a read-only view: no CTA button. The notification says
// what happened + who did it + when; if the user wants to see the
// post itself they navigate there manually. Keeps the sheet quick
// to scan and removes the "View Post" round-trip that could also
// dead-end on the same visibility filter.

type Body = NotificationRow["body"];

function actorName(body: Body): string {
  switch (body.kind) {
    case "post_comment":
      return body.commenter_name;
    case "post_interest":
      return body.responder_name;
    case "message":
      return body.sender_name;
    case "business_broadcast":
      return `${brand.name} team`;
    case "generic":
      return brand.name;
  }
}

function actionSentence(body: Body): string {
  switch (body.kind) {
    case "post_comment":
      return body.is_reply
        ? "replied to your comment on a community post."
        : "commented on your community post.";
    case "post_interest":
      return "is interested in your community post.";
    case "business_broadcast":
      return body.title;
    case "generic":
      return body.title;
    case "message":
      return "sent you a message.";
  }
}

/** Second line — the specific content (comment excerpt / message
 *  preview / broadcast body). Empty string when the notification kind
 *  has no dedicated preview slot. */
function contextExcerpt(body: Body): string {
  switch (body.kind) {
    case "post_comment":
      return body.body_preview;
    case "post_interest":
      return body.message ?? "";
    case "message":
      return body.preview;
    case "business_broadcast":
      return body.message;
    case "generic":
      return body.message;
  }
}

/** "on '<post title>'" caption — only for post-related notifications
 *  where the post title adds useful context. */
function subjectLine(body: Body): string | null {
  switch (body.kind) {
    case "post_comment":
    case "post_interest":
      return `on "${body.post_title}"`;
    case "message":
    case "business_broadcast":
    case "generic":
      return null;
  }
}

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const { data, isLoading } = useNotifications();
  const notification = React.useMemo(
    () => data?.find((n) => n.id === id) ?? null,
    [data, id],
  );

  // Mark as read once per mount — covers both the bell-tap and
  // push-tap entry paths, since both routes end on this modal. The
  // server-side markRead is idempotent (returns changed: 0 on a
  // no-op) so re-mounting for the same id is safe. Fires
  // best-effort — a failure just leaves the row unread for the next
  // interaction to clear.
  const markRead = useMarkNotificationRead();
  React.useEffect(() => {
    if (!id) return;
    markRead.mutate(id);
    // Intentional: markRead is stable across renders (useMutation),
    // and re-running for the same id is idempotent on the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !notification) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <TopBar title="Notification" left={<BackButton />} />
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <TopBar title="Notification" left={<BackButton />} />
        <EmptyState
          title="Notification not found."
          description="It may have been cleared from your inbox."
        />
      </SafeAreaView>
    );
  }

  const body = notification.body;
  const excerpt = contextExcerpt(body);
  const subject = subjectLine(body);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="Notification" left={<BackButton />} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        {/* Actor + relative time */}
        <View className="flex-row items-baseline justify-between">
          <Text className="text-lg font-semibold text-foreground">
            {actorName(body)}
          </Text>
          <Text className="text-xs text-mutedForeground">
            {relativeTime(notification.created_at)}
          </Text>
        </View>

        {/* Action */}
        <Text className="mt-2 text-base leading-relaxed text-foreground">
          {actionSentence(body)}
        </Text>

        {/* Subject (post title) */}
        {subject && (
          <Text className="mt-1 text-sm italic text-mutedForeground">
            {subject}
          </Text>
        )}

        {/* Content excerpt — comment body, message preview, broadcast body */}
        {excerpt ? (
          <View className="mt-5 rounded-xl bg-card p-4">
            <Text className="text-sm leading-relaxed text-foreground">
              {excerpt}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
