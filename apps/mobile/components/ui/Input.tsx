import * as React from "react";
import {
  TextInput,
  View,
  Text,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  /** Hint shown below field when no error. */
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Input primitive — 44pt min height, focus ring, inline error message.
 * Wraps label + field + error helper text. Matches the shadcn API
 * (`label`, `error`, plus standard TextInput props).
 */
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, containerStyle, accessibilityHint, ...rest },
  ref
) {
  return (
    <View style={containerStyle} className="w-full">
      {label ? (
        <Text className="mb-1 text-sm text-foreground">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label ?? rest.placeholder}
        accessibilityHint={accessibilityHint}
        placeholderTextColor="#8e8e8e"
        className={[
          "h-12 w-full rounded-lg border bg-background px-3 text-base text-foreground",
          error ? "border-destructive" : "border-input",
        ].join(" ")}
        {...rest}
      />
      {error ? (
        <Text className="mt-1 text-sm text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-sm text-mutedForeground">{hint}</Text>
      ) : null}
    </View>
  );
});
