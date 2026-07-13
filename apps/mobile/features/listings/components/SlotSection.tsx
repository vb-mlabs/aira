import * as React from "react";
import {
  ImageBackground,
  type ImageSourcePropType,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Business } from "@aira/validators";
import { BusinessCard } from "./BusinessCard";

/**
 * Three user-facing sections on category listing screens, one per slot:
 *   - "Sponsored" — top slot, rendered with tier1 texture
 *   - "Sponsored" — mid slot, rendered with tier2 texture (same label,
 *                   distinguished by texture — top is above mid, so the
 *                   ordering + texture carry the hierarchy)
 *   - "Regular"   — regular slot + unsponsored, tier3 texture
 * Sections with zero items render nothing (SlotSection early-returns
 * null) so a data set with no top-slot sponsorships shows only mid +
 * regular without an empty header.
 */

interface SlotSectionProps {
  label: "Sponsored" | "Regular";
  texture: ImageSourcePropType;
  businesses: Business[];
  favIds: ReadonlySet<string>;
}

export function SlotSection({
  label,
  texture,
  businesses,
  favIds,
}: SlotSectionProps) {
  if (businesses.length === 0) return null;

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
            name="leaf"
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

export function bucketBySlot(items: Business[]): {
  top: Business[];
  mid: Business[];
  regular: Business[];
} {
  const top: Business[] = [];
  const mid: Business[] = [];
  const regular: Business[] = [];
  for (const b of items) {
    if (b.sponsored_slot === "top") top.push(b);
    else if (b.sponsored_slot === "mid") mid.push(b);
    else regular.push(b);
  }
  return { top, mid, regular };
}
