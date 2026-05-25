/**
 * Magnifier + faint dashed circle — generic "no results" illustration.
 */
import * as React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

export function NoResultsIllustration({
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
      accessibilityLabel="No results illustration"
    >
      <Circle cx="70" cy="70" r="32" strokeDasharray="4 5" />
      <Path d="M95 95 L120 120" />
      <Path d="M60 70 L80 70" />
    </Svg>
  );
}
