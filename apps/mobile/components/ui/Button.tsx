import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style"> {
  variant?: Variant;
  size?: Size;
  /** Full-width button (auth CTAs). */
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const containerByVariant: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary border border-border",
  ghost: "bg-transparent",
  destructive: "bg-destructive",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-primaryForeground",
  secondary: "text-secondaryForeground",
  ghost: "text-foreground",
  destructive: "text-primaryForeground",
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: "h-11 px-3", text: "text-sm" },
  md: { container: "h-12 px-4", text: "text-base" },
  lg: { container: "h-14 px-5", text: "text-lg" },
};

/**
 * Button primitive — matches shadcn's API surface (`variant`, `size`,
 * `disabled`). Touch target enforced at 44pt min via size styles.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  children,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = sizeStyles[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      className={[
        "flex-row items-center justify-center rounded-lg",
        containerByVariant[variant],
        sz.container,
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text
          className={[
            "font-medium",
            textByVariant[variant],
            sz.text,
          ].join(" ")}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
