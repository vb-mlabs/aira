import * as React from "react";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { goBackTo } from "../../lib/nav/goBackTo";

// Cream-header foreground tint used across the app's Stack headers.
// Mirrors HamburgerButton so the left slot reads consistently whether
// it hosts a menu (tab-root screens) or a back arrow (nested screens).
const HEADER_TINT = "#3D2814";

interface BackButtonProps {
  /** Override the default back behaviour. When omitted, the button
   *  prefers `router.dismissTo(from)` — pops the current stack back to
   *  `from` if it's in the stack, or navigates to `from` as a fresh
   *  screen if not. Falls back to `router.back()` when no `from` param
   *  is present, and lands on Home if the stack is empty. */
  onPress?: () => void;
}

/**
 * Left-slot back affordance for every nested screen under a tab. Uses
 * MaterialCommunityIcons "arrow-left" — the same glyph the biz-detail
 * bottom "Go back" button uses — so the platform's native "< [parent]"
 * chevron never leaks into the app's cream headers. That chevron is
 * hidden at the Stack layout level (headerBackVisible: false); this
 * component replaces it.
 *
 * Priority order:
 *   1. `router.dismissTo(from)` when `from` is present — the correct
 *      primitive for "return to origin" navigation. Pops screens off
 *      the current stack until `from` is on top (preserves state), or
 *      replaces the current screen with `from` if it isn't in the
 *      stack (deep-link entry). Stays inside the current tab.
 *   2. `router.back()` fallback when no `from` — pops one screen.
 *   3. Home as the last-resort landing.
 *
 * Prior attempts:
 *   - `router.replace(from)` first: broke Scenario 1 (Home → drawer
 *     submenu → detail → back landed on Home instead of subcategory)
 *     because `replace` resolves against the visible tab set and the
 *     `listings` tab is href: null.
 *   - `router.back()` first: fixed Scenario 1 but broke Scenario 2
 *     (Home → Post → back → subcategory → detail → back landed on
 *     Post) because `back` pops the previous stack entry unconditionally.
 *   - `router.dismissTo(from)` (this): both scenarios resolve to the
 *     subcategory because dismissTo knows the intended destination
 *     AND uses stack-pop when possible.
 */
export function BackButton({ onPress }: BackButtonProps) {
  const params = useLocalSearchParams<{ from?: string }>();
  const from =
    typeof params.from === "string" && params.from.length > 0
      ? params.from
      : undefined;

  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    // Delegate to the shared helper — tab-root origins (Home "/",
    // Categories/Post/Account) cross tabs via router.replace; nested
    // origins pop within the current tab's stack via dismissTo. See
    // lib/nav/goBackTo.ts.
    goBackTo(from);
  }, [onPress, from]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={handlePress}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
      hitSlop={8}
    >
      <MaterialCommunityIcons
        name="arrow-left"
        size={22}
        color={HEADER_TINT}
      />
    </Pressable>
  );
}
