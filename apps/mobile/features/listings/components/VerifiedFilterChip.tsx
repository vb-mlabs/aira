import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface VerifiedFilterChipProps {
  active: boolean;
  onToggle: () => void;
}

/** Pill toggle: filter listings to verified businesses. Solid primary when
 *  active, outline when not. */
export function VerifiedFilterChip({
  active,
  onToggle,
}: VerifiedFilterChipProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel="Verified businesses only"
      onPress={onToggle}
      hitSlop={6}
    >
      <View
        className={
          active
            ? "flex-row items-center rounded-full bg-primary px-3 py-1.5"
            : "flex-row items-center rounded-full border border-border bg-card px-3 py-1.5"
        }
        style={{ gap: 4 }}
      >
        <MaterialCommunityIcons
          name="check-decagram"
          size={14}
          color={active ? "white" : "#3B82F6"}
        />
        <Text
          className={
            active
              ? "text-xs font-semibold text-primaryForeground"
              : "text-xs font-semibold text-foreground"
          }
        >
          Verified
        </Text>
      </View>
    </Pressable>
  );
}
