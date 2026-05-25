/**
 * Theme: light-only. The dark token set in ./tokens.ts is preserved for
 * future re-enable, but neither web nor mobile exposes a switch. Web pins
 * via next-themes forcedTheme; mobile pins via Expo userInterfaceStyle:
 * "light" plus this hook returning "light" unconditionally.
 */

import { design } from "./tokens";

export { design };

export type ColorScheme = "light" | "dark";

export function useColorScheme(): ColorScheme {
  return "light";
}

export type ThemeColors = Record<keyof typeof design.colors.light, string>;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return design.colors[scheme];
}
