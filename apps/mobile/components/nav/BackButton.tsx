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
   *  respects `?from=` on the current URL (origin-aware — mirrors the
   *  business-detail "Go back" logic), falls through to router.back()
   *  when there's history, and lands on Home if the stack is empty. */
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
 * Default behaviour prefers an explicit `?from=<href>` URL parameter
 * over stack pop, so screens pushed with origin-aware routing (see
 * BusinessCard) return the user to exactly where they came from.
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
    if (from) {
      router.replace(from as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
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
