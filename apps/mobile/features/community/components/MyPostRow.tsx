import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { AdminPostRow } from "@aira/validators";
import { relativeTime } from "../relative-time";

interface MyPostRowProps {
  post: AdminPostRow;
}

// Status pill colors mirror PostStatusBanner (see
// features/community/components/PostStatusBanner.tsx). Inline hex
// because NativeWind className doesn't reach into background-color
// switches per-status.
const STATUS_STYLES: Record<
  AdminPostRow["status"],
  { bg: string; fg: string; label: string }
> = {
  pending: { bg: "#E1D6C2", fg: "#735239", label: "Pending review" },
  approved: { bg: "#496036", fg: "#F3EBDD", label: "Approved" },
  expired: { bg: "#E1D6C2", fg: "#735239", label: "Expired" },
  rejected: { bg: "#FBE2E2", fg: "#D40C1A", label: "Rejected" },
};

// Same CARD_SHADOW pattern as BusinessCard / PostCard.
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

/** Author's own post row on /account/posts. Includes the per-status
 *  pill + (for rejected rows) the rejected_reason. Tap routes to
 *  /account/posts/edit/<id>. Same chrome standard as BusinessCard
 *  + PostCard. */
export function MyPostRow({ post }: MyPostRowProps) {
  const status = STATUS_STYLES[post.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit post: ${post.title}`}
      onPress={() => {
        router.push(`/account/posts/edit/${post.id}` as never);
      }}
    >
      <View
        className="rounded-xl bg-card p-4"
        style={[{ gap: 8 }, CARD_SHADOW]}
      >
        <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: status.bg }}
          >
            <Text
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: status.fg }}
            >
              {status.label}
            </Text>
          </View>
          <Text className="text-xs text-mutedForeground">
            {relativeTime(post.created_at)}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          className="font-display text-base leading-tight text-foreground"
        >
          {post.title}
        </Text>

        {post.body ? (
          <Text
            numberOfLines={1}
            className="text-xs leading-snug text-foreground"
            style={{ opacity: 0.85 }}
          >
            {post.body}
          </Text>
        ) : null}

        {post.status === "rejected" && post.rejected_reason ? (
          <Text className="mt-1 text-xs font-semibold text-destructive">
            Reason: {post.rejected_reason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
