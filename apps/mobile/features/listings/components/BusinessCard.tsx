import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import { brand } from "@aira/config";
import { getCategoryMeta } from "../category-meta";
import { RatingPill } from "./RatingPill";
import { SocialIcons } from "./SocialIcons";
import { FavoriteHeart } from "./FavoriteHeart";

interface BusinessCardProps {
  business: Business;
  /** P1 hides this; P2 wires the favorites action. */
  isFavorited?: boolean;
  /** Show the category subtitle under the business name. Defaults true.
   *  /listings/[category] passes false because every row in the section is
   *  the same category — same prop name + semantics as web. */
  showCategory?: boolean;
}

// Web's --shadow-card is a soft drop on cream. RN doesn't read CSS vars; the
// equivalent goes through iOS shadow* + Android elevation. Keeps the card
// floating off bg-background the way the web does.
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

// Eyedropped from the regenerated tokens (#66503f = mutedForeground,
// #3B82F6 = info / verified-tick blue). NativeWind's className -> color
// pipeline doesn't reach into @expo/vector-icons' `color` prop, so we
// hand off literal hex values here. If design tokens shift, update both.
const MUTED_FOREGROUND_HEX = "#66503f";
const VERIFIED_BLUE_HEX = "#3B82F6";

/** Mobile BusinessCard — structural port of
 *  apps/web/src/features/listings/components/business-card.tsx. The outer
 *  surface mirrors web's <article> (rounded-xl + bg-card + shadow, NO
 *  border — the Card primitive was wrong because it adds border-border
 *  which web doesn't have). The inner row layout (avatar / identity /
 *  actions) follows web column-for-column. */
export function BusinessCard({
  business,
  isFavorited = false,
  showCategory = true,
}: BusinessCardProps) {
  const category = getCategoryMeta(business.category);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${business.name}`}
      onPress={() => {
        router.push(`/listings/${business.category}/${business.id}` as never);
      }}
    >
      <View
        className="flex-row rounded-xl bg-card p-4"
        style={[{ gap: 12 }, CARD_SHADOW]}
      >
        {/* Avatar — category icon or business image (image fallback in P3 polish) */}
        <View
          className="items-center justify-center rounded-xl bg-muted"
          style={{ width: 36, height: 36 }}
          accessibilityElementsHidden
        >
          <MaterialCommunityIcons
            name={category.iconName}
            size={16}
            color={MUTED_FOREGROUND_HEX}
          />
        </View>

        {/* Identity column */}
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center" style={{ gap: 6 }}>
            <Text className="font-display text-base leading-tight text-foreground">
              {business.name}
            </Text>
            {business.verified ? (
              <MaterialCommunityIcons
                name="check-decagram"
                size={18}
                color={VERIFIED_BLUE_HEX}
                accessibilityLabel="Verified"
              />
            ) : null}
          </View>
          {(showCategory ||
            (business.rating !== null && business.rating > 0)) && (
            <View
              className="mt-0.5 flex-row items-center"
              style={{ gap: 8 }}
            >
              {showCategory ? (
                <Text
                  className="text-xs text-mutedForeground"
                  numberOfLines={1}
                >
                  {category.displayName}
                </Text>
              ) : null}
              {business.rating !== null && business.rating > 0 ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text className="text-xs font-semibold text-mutedForeground">
                    {brand.name} Stars
                  </Text>
                  <RatingPill rating={business.rating} showValue={false} />
                </View>
              ) : null}
            </View>
          )}
          <View className="mt-2">
            <SocialIcons
              facebook_url={business.facebook_url}
              instagram_url={business.instagram_url}
              whatsapp_number={business.whatsapp_number}
              phone={business.phone}
              website={business.website}
            />
          </View>
        </View>

        {/* Action column */}
        <View className="items-end justify-between" style={{ gap: 6 }}>
          <FavoriteHeart isFavorited={isFavorited} />
          <View className="rounded-full bg-primary px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-primaryForeground">
              More Info
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
