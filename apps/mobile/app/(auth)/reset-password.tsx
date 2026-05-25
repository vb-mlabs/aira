import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useResetPassword } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { ResetPasswordSchema } from "@mlabs/validators";
import { ApiError } from "../../lib/api/client";
import { brand } from "@mlabs/config";

/**
 * Reset password screen — deep-link target. URL: mlabs://reset-password?token=…
 * Routed via Expo Router's `useLocalSearchParams`.
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = (params.token as string | undefined) ?? "";
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const reset = useResetPassword();
  const toast = useToast();

  const submit = async () => {
    const parsed = ResetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await reset.mutateAsync(parsed.data);
      toast.show({ message: "Password updated", kind: "success" });
      router.replace("/(auth)/login");
    } catch (e) {
      if (e instanceof ApiError && e.code === "token_expired") {
        setErrors({ form: "Link expired. Request a new one." });
      } else {
        toast.show({
          message: e instanceof Error ? e.message : "Something went wrong",
          kind: "error",
        });
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-6">
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View className="size-2 rounded-full bg-primary" />
              <Text className="text-base font-extrabold tracking-tight text-foreground">
                {brand.name}
              </Text>
            </View>
            <View className="mt-8">
              <Text
                accessibilityRole="header"
                className="text-4xl font-semibold text-foreground"
              >
                Set a new password
              </Text>
              <Text className="mt-2 text-base text-mutedForeground">
                Choose something you'll remember.
              </Text>
            </View>
            <View className="mt-8" style={{ gap: 24 }}>
              <PasswordInput
                label="New password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                error={errors.password}
                hint="At least 8 characters."
              />
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="go"
                onSubmitEditing={submit}
                error={errors.confirmPassword}
              />
              {errors.form ? (
                <Text className="text-sm text-destructive">{errors.form}</Text>
              ) : null}
            </View>
          </View>
          <View className="px-6 pb-8 pt-4">
            <Button
              fullWidth
              size="lg"
              loading={reset.isPending}
              onPress={submit}
              accessibilityLabel="Update password"
            >
              Update password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
