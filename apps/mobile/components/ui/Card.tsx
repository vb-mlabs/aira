import * as React from "react";
import { View, Text, type ViewProps } from "react-native";

/**
 * Card primitive (used sparingly — auth screens are full-screen, profile uses
 * iOS Settings rows). Shadcn parity.
 */
export function Card({ children, className, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={[
        "rounded-xl border border-border bg-card p-4",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </View>
  );
}

export function CardHeader({
  children,
  className,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View className={["mb-3", className ?? ""].join(" ")} {...rest}>
      {children}
    </View>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-lg font-semibold text-cardForeground">{children}</Text>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm text-mutedForeground">{children}</Text>;
}

export function CardContent({
  children,
  className,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View className={className} {...rest}>
      {children}
    </View>
  );
}

export function CardFooter({
  children,
  className,
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View className={["mt-4 flex-row", className ?? ""].join(" ")} {...rest}>
      {children}
    </View>
  );
}
