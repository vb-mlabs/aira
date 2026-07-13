import * as React from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  View,
} from "react-native";
import { AppDrawerContent } from "./AppDrawerContent";
import { useDrawer } from "./DrawerProvider";

const ANIM_MS = 220;
// Drawer width matches web: 85vw capped at 320pt. Compute once at module
// load — the drawer doesn't need to react to orientation changes because
// mobile stays portrait for this app (Expo config is portrait-locked).
const DRAWER_WIDTH = Math.min(
  320,
  Math.round(Dimensions.get("window").width * 0.85),
);

/**
 * Modal-hosted drawer with an Animated.View slide-in from the left.
 *
 * - Modal transparent + animationType="none" so we own the animation.
 * - Backdrop press → closeDrawer.
 * - Android hardware back → closeDrawer (via Modal onRequestClose).
 * - Drawer body wraps its contents in a Pressable no-op so taps on the
 *   surface don't bubble to the backdrop and close the drawer.
 * - useNativeDriver: true — a single-axis translateX animation qualifies
 *   for the native driver and stays smooth even while the drawer's
 *   children (category tree) are hydrating.
 */
export function AppDrawer() {
  const { open, closeDrawer } = useDrawer();
  const translateX = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdrop = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -DRAWER_WIDTH,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: open ? 1 : 0,
        duration: ANIM_MS,
        // opacity animation can use the native driver too
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, translateX, backdrop]);

  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents={open ? "auto" : "none"}
          style={{
            ...StyleSheetAbsoluteFill,
            backgroundColor: "#000",
            opacity: backdrop.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            onPress={closeDrawer}
            style={{ flex: 1 }}
          />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
            // Soft shadow matches web's --shadow-drawer.
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          {/* No-op onPress swallows taps on the drawer body so the
              backdrop doesn't close when a user taps padding around a
              row. */}
          <Pressable
            onPress={() => {
              /* swallow */
            }}
            style={{ flex: 1 }}
          >
            <AppDrawerContent />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Inline the absolute-fill style object; React Native's StyleSheet.absoluteFill
// works but a plain object avoids the import for two properties.
const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
