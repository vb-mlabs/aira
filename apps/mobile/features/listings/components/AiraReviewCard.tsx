import * as React from "react";
import { Text, View } from "react-native";
import { brand } from "@aira/config";

interface AiraReviewCardProps {
  review: string | null;
}

/** AIRA Review editorial blurb — rendered only when set. */
export function AiraReviewCard({ review }: AiraReviewCardProps) {
  if (!review || review.trim().length === 0) return null;

  return (
    <View className="rounded-xl bg-card p-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-primary">
        {brand.name} Review
      </Text>
      <Text className="mt-2 text-sm leading-relaxed text-foreground">
        {review}
      </Text>
    </View>
  );
}
