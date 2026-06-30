import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { PostRow } from "@aira/validators";
import { initialsOf } from "../initials";
import { relativeTime } from "../relative-time";

interface PostCardProps {
  post: PostRow;
}

// Same CARD_SHADOW pattern as BusinessCard. NativeWind shadow utilities
// are inconsistent across iOS/Android so we pin the values inline.
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

/** Compact community post card — mirrors apps/web/src/features/community/
 *  components/post-card.tsx. Same chrome standard as BusinessCard (no
 *  border, soft shadow, bg-card). Tap routes to /post/<id>. */
export function PostCard({ post }: PostCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View request: ${post.title}`}
      onPress={() => {
        router.push(`/post/${post.id}` as never);
      }}
    >
      <View
        className="flex-row rounded-xl bg-card p-4"
        style={[{ gap: 12 }, CARD_SHADOW]}
      >
        {/* Initials avatar — primary green bg, cream text */}
        <View
          className="items-center justify-center rounded-full bg-primary"
          style={{ width: 36, height: 36 }}
          accessibilityElementsHidden
        >
          <Text className="text-[11px] font-bold text-primaryForeground">
            {initialsOf(post.author_name)}
          </Text>
        </View>

        {/* Identity column */}
        <View className="flex-1">
          <Text
            numberOfLines={2}
            className="font-display text-base leading-tight text-foreground"
          >
            {post.title}
          </Text>
          <Text className="mt-0.5 text-xs text-mutedForeground" numberOfLines={1}>
            {post.author_name ?? "AIRA user"} · {relativeTime(post.created_at)}
          </Text>
          {post.body ? (
            <Text
              numberOfLines={1}
              className="mt-1 text-xs leading-snug text-foreground"
              style={{ opacity: 0.85 }}
            >
              {post.body}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
