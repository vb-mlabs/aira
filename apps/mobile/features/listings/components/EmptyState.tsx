import * as React from "react";
import { Text, View } from "react-native";

interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Shared empty-state primitive for listings surfaces (categories, listings,
 *  search no-match, detail 404). Voice on brand: short, direct, no
 *  "Yay!"-tier copy. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Text className="text-center font-display text-lg font-semibold text-foreground">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-mutedForeground">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
