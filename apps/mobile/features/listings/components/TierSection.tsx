import * as React from "react";
import { ImageBackground, type ImageSourcePropType, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TIER_LABELS, type Business, type BusinessTier } from "@aira/validators";
import { BusinessCard } from "./BusinessCard";

/**
 * Grouped tier section on the level-2 listings screen. Mirrors
 * apps/web/src/features/listings/components/tier-section.tsx —
 * textured header + Icon + tier label ("Sponsored" / "Sponsored
 * Level 2" / "Regular"), followed by BusinessCards for that tier.
 *
 * Returns null when the tier has no businesses so empty groups don't
 * paint empty headers.
 *
 * Radha's 2026-07-06 UAT: the mobile level-2 listing was a flat
 * FlatList of cards with no visual grouping. This aligns the mobile
 * treatment with the web pattern so sponsored/regular businesses
 * read as distinct groups.
 */

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const TIER_PRESENTATION: Record<
  BusinessTier,
  { texture: ImageSourcePropType; iconName: IconName }
> = {
  tier1: {
    texture: require("../../../assets/textures/tier1-texture.webp") as ImageSourcePropType,
    iconName: "leaf",
  },
  tier2: {
    texture: require("../../../assets/textures/tier2-texture.webp") as ImageSourcePropType,
    iconName: "plus",
  },
  tier3: {
    texture: require("../../../assets/textures/tier3-texture.webp") as ImageSourcePropType,
    iconName: "leaf",
  },
};

interface TierSectionProps {
  tier: BusinessTier;
  businesses: Business[];
  favIds: ReadonlySet<string>;
}

export function TierSection({ tier, businesses, favIds }: TierSectionProps) {
  if (businesses.length === 0) return null;
  const { texture, iconName } = TIER_PRESENTATION[tier];
  const label = TIER_LABELS[tier];

  return (
    <View style={{ marginBottom: 24 }}>
      <ImageBackground
        source={texture}
        resizeMode="cover"
        imageStyle={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
        style={{
          height: 56,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          overflow: "hidden",
          justifyContent: "center",
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        <View
          className="flex-row items-center justify-between"
          style={{ gap: 12 }}
        >
          <Text
            className="font-display text-lg font-semibold text-white"
            style={{
              textShadowColor: "rgba(0,0,0,0.35)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {label}
          </Text>
          <MaterialCommunityIcons
            name={iconName}
            size={22}
            color="rgba(255,255,255,0.85)"
          />
        </View>
      </ImageBackground>

      <View style={{ gap: 12 }}>
        {businesses.map((business) => (
          <BusinessCard
            key={business.id}
            business={business}
            showCategory={false}
            isFavorited={favIds.has(business.id)}
          />
        ))}
      </View>
    </View>
  );
}
