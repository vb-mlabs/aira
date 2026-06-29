import * as React from "react";
import { Image, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import { brand } from "@aira/config";
import { getCategoryMeta } from "../category-meta";
import { RatingPill } from "./RatingPill";
import { FavoriteHeart } from "./FavoriteHeart";

interface BusinessHeroProps {
  business: Business;
}

/** Top section of the detail screen — image, name + verified badge,
 *  category label, AIRA Stars rating row. P1 ships a placeholder
 *  background when image_url is null; P3 may swap to expo-image with
 *  a blur-up. */
export function BusinessHero({ business }: BusinessHeroProps) {
  const category = getCategoryMeta(business.category);

  return (
    <View>
      <View
        style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#E2D5BC" }}
      >
        {business.image_url ? (
          <Image
            source={{ uri: business.image_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            accessibilityLabel={`${business.name} hero image`}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons
              name={category.iconName}
              size={64}
              color="#735239"
            />
          </View>
        )}
      </View>

      <View className="px-5 pt-4">
        <View className="flex-row items-start" style={{ gap: 12 }}>
          <View className="flex-1">
            <View
              className="flex-row flex-wrap items-center"
              style={{ gap: 8 }}
            >
              <Text className="font-display text-2xl font-bold text-foreground">
                {business.name}
              </Text>
              {business.verified ? (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={22}
                  color="#3B82F6"
                  accessibilityLabel="Verified"
                />
              ) : null}
            </View>
            <View
              className="mt-1 flex-row items-center"
              style={{ gap: 10 }}
            >
              <Text className="text-sm text-mutedForeground">
                {category.displayName}
              </Text>
              {business.rating !== null && business.rating > 0 ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text className="text-xs font-semibold text-mutedForeground">
                    {brand.name} Stars
                  </Text>
                  <RatingPill rating={business.rating} />
                </View>
              ) : null}
            </View>
          </View>
          <View className="pt-1">
            <FavoriteHeart />
          </View>
        </View>
      </View>
    </View>
  );
}
