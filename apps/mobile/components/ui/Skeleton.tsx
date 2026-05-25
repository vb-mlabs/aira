import * as React from "react";
import { Animated, View, type StyleProp, type ViewStyle } from "react-native";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton primitive — pulsing placeholder block for loading states.
 * Pulse is opacity-only (cheap, doesn't kick GPU). Matches shadcn's Skeleton.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[{ width, height, borderRadius, opacity }, style]}
    >
      <View
        style={{
          width: "100%",
          height: "100%",
          borderRadius,
          backgroundColor: "#e5e5e5",
        }}
      />
    </Animated.View>
  );
}
