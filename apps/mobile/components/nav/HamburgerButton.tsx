import * as React from "react";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDrawer } from "./DrawerProvider";

// Cream-header foreground tint used across the app's Stack headers.
// Mirrors listings/_layout.tsx, categories/_layout.tsx, etc.
const HEADER_TINT = "#3D2814";

/**
 * Header-left affordance for every tab-root screen. Tap opens the
 * app-wide drawer via DrawerProvider. Sub-screens keep their existing
 * left slot (back chevron on account, empty on categories/listings/post)
 * — this component is intentionally NOT wired at the stack-level
 * screenOptions.headerLeft, only per-tab-root Stack.Screen options.
 */
export function HamburgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={openDrawer}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
      }}
      hitSlop={8}
    >
      <MaterialCommunityIcons name="menu" size={22} color={HEADER_TINT} />
    </Pressable>
  );
}
