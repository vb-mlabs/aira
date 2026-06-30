import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getCategoryMeta } from "../category-meta";

// Same shadow recipe as BusinessCard so both surfaces float off the
// cream background identically. Avoids the Card primitive (which bakes
// in a border the design doesn't want here).
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

interface CategoryTileProps {
  slug: string;
  /** DB-row name takes precedence over the curated displayName so admin
   *  edits show up. Mirrors web behavior. */
  name: string;
  /** Visible-business count for this category. Undefined hides the chip
   *  (so the row still renders before counts hydrate). */
  count?: number;
}

/** Category row on the Categories tab. Tap routes to /listings/<slug>. */
export function CategoryTile({ slug, name, count }: CategoryTileProps) {
  const meta = getCategoryMeta(slug);
  const countLabel = typeof count === "number" ? String(count) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        countLabel
          ? `Browse ${name} businesses, ${countLabel} listed`
          : `Browse ${name} businesses`
      }
      onPress={() => {
        router.push(`/listings/${slug}` as never);
      }}
    >
      <View
        className="flex-row items-center rounded-xl bg-card p-4"
        style={[{ gap: 16 }, CARD_SHADOW]}
      >
        <View
          className="items-center justify-center rounded-xl bg-muted"
          style={{ width: 48, height: 48 }}
        >
          <MaterialCommunityIcons
            name={meta.iconName}
            size={24}
            color="#4F653B"
          />
        </View>
        <View className="flex-1">
          <Text className="font-display text-base font-semibold text-foreground">
            {name}
          </Text>
          {meta.description ? (
            <Text
              className="mt-0.5 text-xs text-mutedForeground"
              numberOfLines={1}
            >
              {meta.description}
            </Text>
          ) : null}
        </View>
        {countLabel ? (
          <Text className="text-sm font-semibold text-mutedForeground">
            {countLabel}
          </Text>
        ) : null}
        <Text className="text-lg text-mutedForeground">›</Text>
      </View>
    </Pressable>
  );
}
