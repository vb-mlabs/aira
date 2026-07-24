import * as React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Cream + foreground tint match the Home tab's bottom-tabs header
// (headerStyle.backgroundColor + headerTintColor in (app)/_layout.tsx)
// so every screen renders with the exact same top-bar chrome.
const BG = "#EAE0CB";
const FG = "#3D2814";

// 44pt content row matches iOS UINavigationBar default + bottom-tabs
// default. Total bar height = insets.top + CONTENT_HEIGHT.
const CONTENT_HEIGHT = 44;

// Slot width mirrors the 44x44 tap targets in HamburgerButton /
// BackButton / NotificationBell so slot content drops in at native
// size without any extra wrapping.
const SLOT_WIDTH = 44;

interface TopBarProps {
  title: string;
  /** Optional left affordance — typically <HamburgerButton /> on tab
   *  roots, <BackButton /> on nested screens, or a Cancel text button
   *  on modal-style presentations like the post composer sheet. */
  left?: React.ReactNode;
  /** Optional right affordance — typically <NotificationBell />, a "+"
   *  post-create trigger, or nothing. Any React node works. */
  right?: React.ReactNode;
}

/**
 * Shared JS-rendered top bar. Fixes the iOS 26 UINavigationBar
 * "Liquid Glass" bar-button capsule that appears when using
 * @react-navigation/native-stack. Screens under native-stack hide their
 * native header (headerShown: false at the layout level) and render
 * <TopBar /> at the top of their JSX instead — mirroring what the Home
 * tab already does via @react-navigation/bottom-tabs' JS-rendered
 * header.
 *
 * Layout: cream background extending through the safe-area top region,
 * 44pt content row below with a fixed-width slot on each side and an
 * absolute-positioned centered title so the title stays visually
 * centered regardless of which slots are filled.
 */
export function TopBar({ title, left, right }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: BG,
        // Extend cream through the notch / status-bar zone. Matches how
        // bottom-tabs paints headerStyle.backgroundColor into the
        // safe-area top on iOS.
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          height: CONTENT_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            width: SLOT_WIDTH,
            height: CONTENT_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {left}
        </View>
        {/* Right slot uses minWidth so text actions ("Read all", "Save",
            etc.) can grow past the 44pt icon-sized tap target; the
            title's absolute bounds still start at SLOT_WIDTH so it stays
            centered within the safe zone even when the right slot
            expands to fit its content. */}
        <View
          style={{
            minWidth: SLOT_WIDTH,
            height: CONTENT_HEIGHT,
            paddingHorizontal: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {right}
        </View>
      </View>
      {/* Title floats absolute-centered so it doesn't shift when
          slots come and go. Padded to leave room for the slots on
          either side even at their maximum tap-target width. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: SLOT_WIDTH,
          right: SLOT_WIDTH,
          top: insets.top,
          height: CONTENT_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            color: FG,
            // Aligned to design.ts type.lg (1.25rem = 20px) after the
            // Option A scale shift. Was 17 (iOS UINavigationBar default);
            // hardcoded values did not flow through the token bump.
            fontSize: 20,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}
