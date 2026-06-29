import * as React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface FavoriteHeartProps {
  /** Currently a no-op stub. P2 wires the toggle through the favorites
   *  service + adds optimistic state. */
  isFavorited?: boolean;
}

/** Visual-only outline heart for P1. P2 wires the favorites toggle action,
 *  optimistic state, and the post-mutation invalidation. Rendered on the
 *  BusinessCard top-right and the BusinessHero (detail screen) header. */
export function FavoriteHeart({ isFavorited = false }: FavoriteHeartProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? "Unfavorite (P2)" : "Favorite (P2)"}
      accessibilityHint="Favorites wire up in the next update"
      // Tappable target but does nothing in P1.
      onPress={() => {}}
      hitSlop={8}
    >
      <View className="size-7 items-center justify-center">
        <MaterialCommunityIcons
          name={isFavorited ? "heart" : "heart-outline"}
          size={20}
          color={isFavorited ? "#dc2626" : "#735239"}
        />
      </View>
    </Pressable>
  );
}
