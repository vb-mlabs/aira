import * as React from "react";
import { Image, Text, View } from "react-native";

export interface AvatarProps {
  src?: string | null;
  /** Display name used for initials fallback + screen reader label. */
  name?: string;
  /** Stable id used to deterministically pick fallback color. */
  userId?: string;
  size?: number;
}

const PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Avatar primitive — image when `src`, initials on hashed palette otherwise
 * (Gmail/Slack pattern, mandated by Pass-4 design spec). Default size 40pt.
 */
export function Avatar({ src, name, userId, size = 40 }: AvatarProps) {
  const fallbackColor = React.useMemo(() => {
    const key = userId ?? name ?? "?";
    return PALETTE[hashCode(key) % PALETTE.length]!;
  }, [userId, name]);
  const radius = size / 2;
  const label = name ? `${name} avatar` : "User avatar";

  if (src) {
    return (
      <Image
        accessibilityLabel={label}
        accessibilityRole="image"
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: fallbackColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontWeight: "600",
          fontSize: size * 0.4,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
