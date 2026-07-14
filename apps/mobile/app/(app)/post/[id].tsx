import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { CommentThread } from "../../../features/community/components/CommentThread";
import { ContactReveal } from "../../../features/community/components/ContactReveal";
import { PostStatusBanner } from "../../../features/community/components/PostStatusBanner";
import { ReportButton } from "../../../features/community/components/ReportButton";
import { usePost } from "../../../features/community/hooks";
import { relativeTime } from "../../../features/community/relative-time";

/**
 * Community post detail screen — mirrors web's /community/[id]. T4
 * ships read-only (title + body + status banner + contact reveal +
 * Report). T5 layers the comment thread + composer on top.
 */
export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const detail = usePost(id);

  const post = detail.data?.post ?? null;
  const headerTitle = post?.title ?? "";

  if (detail.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <TopBar title="Loading…" left={<BackButton />} />
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          <Skeleton width="80%" height={28} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={120} borderRadius={12} />
          <Skeleton width="100%" height={80} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <TopBar title="Not found" left={<BackButton />} />
        <EmptyState
          title="Post not found."
          description="It may have been removed or is no longer visible to you."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title={headerTitle} left={<BackButton />} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Author + relative time. Title lives in the Stack header
            (line above) — the earlier in-body title was a duplicate
            of it and Radha flagged the visual repeat 2026-07-06. */}
        <Text className="text-xs text-mutedForeground">
          {post.author_name} · {relativeTime(post.created_at)}
        </Text>

        {/* Status banner — renders nothing for approved */}
        <View className="mt-4">
          <PostStatusBanner status={post.status} />
        </View>

        {/* Body */}
        {post.body ? (
          <Text className="mt-4 text-sm leading-relaxed text-foreground">
            {post.body}
          </Text>
        ) : null}

        {/* Contact rows — always visible per the locked review decision */}
        <View className="mt-5">
          <ContactReveal phone={post.phone} email={post.email} />
        </View>

        {/* Report affordance — Apple Guideline 1.2 minimum bar */}
        <View className="mt-6 flex-row justify-end">
          <ReportButton kind="post" id={post.id} />
        </View>

        {/* Threaded comments. Composer pinned at top; oldest below. */}
        <View className="mt-8">
          <CommentThread
            postId={post.id}
            acceptsComments={post.status === "approved"}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
