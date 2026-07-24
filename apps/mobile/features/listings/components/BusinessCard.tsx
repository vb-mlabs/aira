import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import { brand } from "@aira/config";
import { useBuildBackHref } from "../../../lib/nav/useBuildBackHref";
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
  const category = getCategoryMeta(business.category, business.category_name);
  // Build the origin href (pathname + genuine query params, excluding
  // route segments) so the business detail screen's "Go back" button
  // can return the user to exactly where they came from — Home, the
  // filtered Listings tab, a category detail page — instead of a
  // URL-hierarchical parent. See lib/nav/buildBackHref.ts for why
  // route segments must be excluded.
  const from = useBuildBackHref();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${business.name}`}
      onPress={() => {
        router.push({
          pathname: "/listings/[category]/[id]",
          params: {
            category: business.category,
            id: business.id,
            from,
          },
        } as never);
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
          {/* Name + verified tick rendered inside a single <Text> so the tick
              reflows inline with the text. With numberOfLines={2}, long names
              wrap to two lines and the tick sits attached to the last word of
              the last line — never alone on its own row. MaterialCommunityIcons
              renders as an icon-font glyph, which Text composes natively. */}
          <Text
            numberOfLines={2}
            className="font-display text-base leading-tight text-foreground"
          >
            {business.name}
            {business.verified ? (
              <Text>
                {" "}
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={16}
                  color={VERIFIED_BLUE_HEX}
                  accessibilityLabel="Verified"
                />
              </Text>
            ) : null}
          </Text>
          {(showCategory ||
            (business.rating !== null && business.rating > 0)) && (
            <View
              className="mt-0.5 flex-row items-center"
              style={{ gap: 8 }}
            >
              {/* Category + AIRA Stars sized at 12 so the row fits
                  alongside the actions column's sponsored chip on
                  tighter cards. AIRA Stars keeps its semibold weight
                  as a deliberate emphasis; category stays regular.
                  text-xs class would put both back at 14 after the
                  Option A scale bump — explicit fontSize keeps them
                  below the scale without a mobile-only token. */}
              {showCategory ? (
                <Text
                  className="text-mutedForeground"
                  style={{ fontSize: 12 }}
                  numberOfLines={1}
                >
                  {category.displayName}
                </Text>
              ) : null}
              {business.rating !== null && business.rating > 0 ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text
                    className="font-semibold text-mutedForeground"
                    style={{ fontSize: 12 }}
                  >
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

        {/* Action column — heart at top, tier badge in the middle (web
            puts it above the More Info chevron analogue), More Info
            pill at bottom. Sponsored pill only renders when the business
            has a top/mid slot sponsorship — regular-slot + unsponsored
            businesses render no badge. */}
        <View className="items-end justify-between" style={{ gap: 6 }}>
          <FavoriteHeart
            businessId={business.id}
            isFavorited={isFavorited}
          />
          <SponsoredPill slot={business.sponsored_slot} />
          <Text className="text-xs font-bold uppercase tracking-wide text-primary">
            More Info
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SponsoredPill({ slot }: { slot: Business["sponsored_slot"] }) {
  if (slot === null || slot === "regular") return null;
  const bgClass =
    slot === "top" ? "rounded-full bg-sponsoredTop px-1.5" : "rounded-full bg-sponsoredMid px-1.5";
  const textClass =
    slot === "top" ? "text-sponsoredTopForeground" : "text-sponsoredMidForeground";
  return (
    <View
      className={bgClass}
      style={{ paddingVertical: 1 }}
      accessibilityLabel="Sponsored listing"
    >
      <Text
        className={textClass}
        style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}
      >
        Sponsored
      </Text>
    </View>
  );
}
