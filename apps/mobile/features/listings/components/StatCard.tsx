import * as React from "react";
import { Text, View } from "react-native";

interface StatCardProps {
  value: string;
  label: string;
}

/** Mirrors apps/web/src/features/listings/components/stat-card.tsx —
 *  large number in primary green over a small uppercase muted label,
 *  centered on a card surface. */
export function StatCard({ value, label }: StatCardProps) {
  return (
    <View className="flex-1 rounded-xl bg-card px-4 py-5 shadow-sm">
      <Text className="text-center font-display text-3xl font-semibold text-primary">
        {value}
      </Text>
      <Text className="mt-1.5 text-center text-xs font-semibold uppercase tracking-wider text-mutedForeground">
        {label}
      </Text>
    </View>
  );
}
