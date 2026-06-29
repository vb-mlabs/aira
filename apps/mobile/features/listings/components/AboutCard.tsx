import * as React from "react";
import { Text, View } from "react-native";

interface AboutCardProps {
  description: string | null;
}

/** About Us card — renders only when description is present. */
export function AboutCard({ description }: AboutCardProps) {
  if (!description || description.trim().length === 0) return null;

  return (
    <View className="rounded-xl bg-card p-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">
        About Us
      </Text>
      <Text className="mt-2 text-sm leading-relaxed text-foreground">
        {description}
      </Text>
    </View>
  );
}
