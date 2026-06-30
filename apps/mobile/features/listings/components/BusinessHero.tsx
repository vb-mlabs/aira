import * as React from "react";
import { Image, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import { brand } from "@aira/config";
import { getCategoryMeta } from "../category-meta";
import { RatingPill } from "./RatingPill";
import { FavoriteHeart } from "./FavoriteHeart";
import { TierPill } from "./TierPill";

interface BusinessHeroProps {
  business: Business;
  /** Resolved by the detail screen from useFavoriteIds(). Defaults
   *  false so callers that don't yet pipe the Set through render the
   *  heart as outline (no breakage). */
  isFavorited?: boolean;
}

// Same constants as BusinessCard — NativeWind doesn't reach into
// @expo/vector-icons' `color` prop, so literal hex values are passed
// directly. Keep both files in sync if design tokens shift.
const MUTED_FOREGROUND_HEX = "#66503f";
const VERIFIED_BLUE_HEX = "#3B82F6";
// muted bg-color for the placeholder hero — eyedropped from the
// regenerated `muted` token (#e1d6c2).
const HERO_PLACEHOLDER_BG = "#e1d6c2";

/** Top section of the detail screen — image, name + verified badge,
 *  category label, AIRA Stars rating row. P1 ships a placeholder
 *  background when image_url is null; P3 may swap to expo-image with
 *  a blur-up. */
export function BusinessHero({
  business,
  isFavorited = false,
}: BusinessHeroProps) {
  const category = getCategoryMeta(business.category);

  return (
    <View>
      <View
        style={{
          width: "100%",
          aspectRatio: 16 / 9,
          backgroundColor: HERO_PLACEHOLDER_BG,
        }}
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
              color={MUTED_FOREGROUND_HEX}
            />
          </View>
        )}
      </View>

      <View className="px-5 pt-4">
        <View className="flex-row items-start" style={{ gap: 12 }}>
          <View className="flex-1">
            {/* Name + verified tick rendered inside a single <Text> so the tick
                reflows inline with the text. numberOfLines={3} caps very long
                names without surprising the user — hero is the primary
                identifier on this screen, so we let it breathe more than the
                card's 2-line cap. MaterialCommunityIcons composes as an
                icon-font glyph inside Text. */}
            <Text
              numberOfLines={3}
              className="font-display text-2xl font-bold text-foreground"
            >
              {business.name}
              {business.verified ? (
                <Text>
                  {" "}
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color={VERIFIED_BLUE_HEX}
                    accessibilityLabel="Verified"
                  />
                </Text>
              ) : null}
            </Text>
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
          <View className="items-end pt-1" style={{ gap: 6 }}>
            <FavoriteHeart
              businessId={business.id}
              isFavorited={isFavorited}
            />
            <TierPill tier={business.tier} />
          </View>
        </View>
      </View>
    </View>
  );
}
