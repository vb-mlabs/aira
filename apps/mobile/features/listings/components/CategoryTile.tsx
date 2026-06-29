import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "../../../components/ui/Card";
import { getCategoryMeta } from "../category-meta";

interface CategoryTileProps {
  slug: string;
  /** DB-row name takes precedence over the curated displayName so admin
   *  edits show up. Mirrors web behavior. */
  name: string;
}

/** Category row on the Categories tab. Tap routes to /listings/<slug>. */
export function CategoryTile({ slug, name }: CategoryTileProps) {
  const meta = getCategoryMeta(slug);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${name} businesses`}
      onPress={() => {
        router.push(`/listings/${slug}` as never);
      }}
    >
      <Card className="p-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
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
          <Text className="text-lg text-mutedForeground">›</Text>
        </View>
      </Card>
    </Pressable>
  );
}
