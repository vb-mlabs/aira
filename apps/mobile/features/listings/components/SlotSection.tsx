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
 * Mobile parity of apps/web/src/features/listings/components/slot-section.tsx.
 * Two user-facing sections on category listing screens:
 *   - Sponsored — businesses whose sponsored_slot is 'top' or 'mid'
 *   - Regular   — sponsored-regular-slot + unsponsored, alphabetical
 * The Sponsored / Regular distinction is what the user sees; the top/mid
 * differentiation lives in card chrome (Task-6 follow-up on card design).
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
  sponsored: Business[];
  regular: Business[];
} {
  const sponsored: Business[] = [];
  const regular: Business[] = [];
  for (const b of items) {
    if (b.sponsored_slot === "top" || b.sponsored_slot === "mid") {
      sponsored.push(b);
    } else {
      regular.push(b);
    }
  }
  return { sponsored, regular };
}
