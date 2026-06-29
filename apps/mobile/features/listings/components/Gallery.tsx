import * as React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { BusinessImage } from "@aira/validators";

interface GalleryProps {
  images: BusinessImage[];
}

/** Horizontal-scroll gallery for up to 3 business images (the admin upload
 *  cap). Rendered only when the array is non-empty. */
export function Gallery({ images }: GalleryProps) {
  if (!images || images.length === 0) return null;

  // Defensive sort — service already orders by sort_order but the wire
  // shape allows any order.
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <View>
      <Text className="px-5 text-xs font-semibold uppercase tracking-wider text-mutedForeground">
        Gallery
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          gap: 12,
        }}
      >
        {sorted.map((img) => (
          <Image
            key={img.id}
            source={{ uri: img.url }}
            style={{
              width: 240,
              height: 160,
              borderRadius: 12,
              backgroundColor: "#E2D5BC",
            }}
            resizeMode="cover"
            accessibilityLabel="Gallery image"
          />
        ))}
      </ScrollView>
    </View>
  );
}
