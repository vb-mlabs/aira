/**
 * Theme: system-follow only in v1. Reads OS color scheme via React Native's
 * `useColorScheme()` (Expo passes through). No in-app toggle until TODOS #3.
 */

import { useColorScheme as useRNColorScheme } from "react-native";
import { design } from "./tokens";

export { design };

export type ColorScheme = "light" | "dark";

export function useColorScheme(): ColorScheme {
  const scheme = useRNColorScheme();
  return scheme === "dark" ? "dark" : "light";
}

export type ThemeColors = Record<keyof typeof design.colors.light, string>;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return design.colors[scheme];
}
