/**
 * Placeholder hand-drawn-style monochrome SVG. Uses currentColor so it
 * inherits text color from its container — forks can re-skin by wrapping in
 * a colored View.
 */
import * as React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function EmptyInboxIllustration({
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
      accessibilityLabel="Empty inbox illustration"
    >
      {/* envelope back */}
      <Path d="M30 60 L80 95 L130 60" />
      <Path d="M30 60 L30 115 Q30 120 35 120 L125 120 Q130 120 130 115 L130 60" />
      <Path d="M30 60 L75 30 Q80 27 85 30 L130 60" />
      {/* tiny z-z snooze marks */}
      <Path d="M105 40 L115 40 L105 50 L115 50" />
      <Circle cx="50" cy="135" r="1.5" fill={color} stroke="none" />
      <Circle cx="80" cy="138" r="1.5" fill={color} stroke="none" />
      <Circle cx="110" cy="135" r="1.5" fill={color} stroke="none" />
    </Svg>
  );
}
