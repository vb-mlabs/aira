import * as React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface RatingPillProps {
  /** 0–5 in 0.5 steps. Renders nothing when ≤ 0 so callers render it
   *  unconditionally (mirrors web's behavior). */
  rating: number;
  showValue?: boolean;
}

/** Mobile RatingPill — 5 star glyphs with the first N filled per rating.
 *  Simpler than web's half-star SVG-clip technique: half-stars round to the
 *  nearest whole star on mobile so the row renders cleanly with vector
 *  icons. The numeric value retains the .5 step ("4.5"). */
export function RatingPill({ rating, showValue = true }: RatingPillProps) {
  if (rating <= 0) return null;
  const clamped = Math.min(5, Math.max(0, rating));
  const filled = Math.round(clamped);

  return (
    <View
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5`}
      className="flex-row items-center"
      style={{ gap: 4 }}
    >
      <View className="flex-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <MaterialCommunityIcons
            key={i}
            name={i < filled ? "star" : "star-outline"}
            size={14}
            color="#D08C3F"
          />
        ))}
      </View>
      {showValue ? (
        <Text className="text-xs font-semibold text-warning">
          {rating.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}
