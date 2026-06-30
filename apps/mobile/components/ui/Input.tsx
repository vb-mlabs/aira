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
 *
 * When `multiline` is true, the field grows from a 48pt single-line
 * box to a min-height multi-line area (default minHeight: 120pt, can
 * grow further). Without this branch RN's TextInput stays clamped to
 * the explicit `h-12` Tailwind class even with multiline=true, which
 * makes long-form composers (like the community post Description
 * field) look like one-line inputs.
 */
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    containerStyle,
    accessibilityHint,
    multiline,
    numberOfLines,
    ...rest
  },
  ref
) {
  // Estimate a sensible default minHeight for multi-line use: line
  // height ~22pt × numberOfLines + padding. Caller can override via
  // numberOfLines prop.
  const multilineMinHeight = multiline
    ? Math.max((numberOfLines ?? 5) * 22 + 16, 120)
    : undefined;

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
        multiline={multiline}
        numberOfLines={numberOfLines}
        // h-12 only applies to single-line. Multi-line uses minHeight
        // so the field grows with content; py-2 gives breathing room
        // since TextInput multiline ignores fixed `h-*` heights.
        className={[
          "w-full rounded-lg border bg-background px-3 text-base text-foreground",
          multiline ? "py-2" : "h-12",
          error ? "border-destructive" : "border-input",
        ].join(" ")}
        style={
          multilineMinHeight !== undefined
            ? { minHeight: multilineMinHeight, textAlignVertical: "top" }
            : undefined
        }
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
