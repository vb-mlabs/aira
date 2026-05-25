import * as React from "react";
import {
  Pressable,
  TextInput,
  View,
  Text,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export interface PasswordInputProps
  extends Omit<TextInputProps, "style" | "secureTextEntry"> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Password field with a show/hide eye toggle. Mirrors the mobile Input
 * API (label + error + hint) but always renders a secure-text input
 * with a trailing toggle that flips secureTextEntry locally.
 */
export const PasswordInput = React.forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput(
    { label, error, hint, containerStyle, accessibilityHint, ...rest },
    ref,
  ) {
    const [visible, setVisible] = React.useState(false);

    return (
      <View style={containerStyle} className="w-full">
        {label ? (
          <Text className="mb-1 text-sm text-foreground">{label}</Text>
        ) : null}
        <View className="relative w-full">
          <TextInput
            ref={ref}
            accessibilityLabel={label ?? rest.placeholder}
            accessibilityHint={accessibilityHint}
            placeholderTextColor="#8e8e8e"
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            className={[
              "h-12 w-full rounded-lg border bg-background pl-3 pr-12 text-base text-foreground",
              error ? "border-destructive" : "border-input",
            ].join(" ")}
            {...rest}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            accessibilityState={{ selected: visible }}
            onPress={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 w-12 items-center justify-center"
            hitSlop={8}
          >
            <Feather
              name={visible ? "eye-off" : "eye"}
              size={20}
              color="#737373"
            />
          </Pressable>
        </View>
        {error ? (
          <Text className="mt-1 text-sm text-destructive">{error}</Text>
        ) : hint ? (
          <Text className="mt-1 text-sm text-mutedForeground">{hint}</Text>
        ) : null}
      </View>
    );
  },
);
