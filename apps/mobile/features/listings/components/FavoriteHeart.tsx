import * as React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useToggleFavorite } from "../../favorites/hooks";

interface FavoriteHeartProps {
  businessId: string;
  /** Resolved by the parent screen from useFavoriteIds(). Caller-passes
   *  pattern mirrors web (apps/web/src/app/(app)/home/page.tsx) — keeps
   *  the duplicate-fetch concern out of the card and means TanStack's
   *  shared cache handles cross-screen sync for free. */
  isFavorited: boolean;
}

// Drift fix in P2b: outline color was #735239 (old hand-coded value
// pre-dating the oklch→hex regen); regenerated mutedForeground token
// is #66503f. Same drift we already caught on BusinessCard's category
// icon (55133d8) and BusinessHero placeholder (a02b05d).
const HEART_OUTLINE = "#66503f";
const HEART_FILLED = "#dc2626";

/** Tap-to-toggle favorite heart. Optimistic flip via useToggleFavorite
 *  — the parent's useFavoriteIds Set updates immediately, props flow
 *  the new state through, the icon re-renders. On network failure the
 *  Set rolls back. No disabled state during in-flight: server ops are
 *  idempotent + TanStack queues serial mutations. */
export function FavoriteHeart({
  businessId,
  isFavorited,
}: FavoriteHeartProps) {
  const toggle = useToggleFavorite();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? "Unfavorite" : "Favorite"}
      onPress={() => {
        toggle.mutate({ businessId, currentlyFavorited: isFavorited });
      }}
      hitSlop={8}
    >
      <View className="size-7 items-center justify-center">
        <MaterialCommunityIcons
          name={isFavorited ? "heart" : "heart-outline"}
          size={20}
          color={isFavorited ? HEART_FILLED : HEART_OUTLINE}
        />
      </View>
    </Pressable>
  );
}
