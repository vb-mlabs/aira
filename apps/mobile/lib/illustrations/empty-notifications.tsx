/**
 * Celebratory "all caught up" illustration — bell with a checkmark.
 * Monochrome via currentColor.
 */
import * as React from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function EmptyNotificationsIllustration({
  size = 160,
  color = "currentColor",
}: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole="image"
      accessibilityLabel="No notifications illustration"
    >
      {/* bell */}
      <Path d="M55 100 Q55 60 80 55 Q105 60 105 100 L115 110 L45 110 Z" />
      {/* clapper */}
      <Path d="M72 118 Q80 124 88 118" />
      {/* tassel on top */}
      <Path d="M80 50 L80 42" />
      {/* check mark inside */}
      <Path d="M68 85 L77 94 L93 76" />
    </Svg>
  );
}
