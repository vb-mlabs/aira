import * as React from "react";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

// Cream-header foreground tint used across the app's Stack headers.
// Mirrors HamburgerButton so the left slot reads consistently whether
// it hosts a menu (tab-root screens) or a back arrow (nested screens).
const HEADER_TINT = "#3D2814";

interface BackButtonProps {
  /** Override the default back behaviour. When omitted, the button
   *  prefers `router.back()` (pops the stack — most reliable, retains
   *  the previous screen's state), falls back to `?from=<href>` for
   *  deep-link entries (push notification / shared URL) where there
   *  is no stack history to pop, and finally lands on Home. */
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
 *   1. `router.back()` when there's stack history — always the correct
 *      answer for a user navigating in-app (Home → subcategory →
 *      detail), because the stack knows exactly what was underneath.
 *   2. `?from=<href>` fallback for deep-link entries (opened from a
 *      push notification, shared URL, etc.) where the stack is empty
 *      and we still want to land somewhere sensible.
 *   3. Home as the last-resort landing.
 *
 * Previously the priority was inverted (from-first), which broke in
 * the Home → drawer submenu → detail flow: `router.replace(from)` in
 * a nested screen of the hidden `listings` tab resolved the target
 * URL against the visible tabs and landed on Home instead of the
 * subcategory. Stack-back sidesteps the URL-resolution hazard entirely.
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
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (from) {
      router.replace(from as never);
      return;
    }
    router.replace("/(app)" as never);
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
