import * as React from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useResetPassword } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { ResetPasswordSchema } from "@aira/validators";
import { ApiError } from "../../lib/api/client";

/**
 * Reset password screen — deep-link target. URL: aira://reset-password?token=…
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
    <AuthShell>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-4xl text-foreground"
        >
          Set a new password
        </Text>
        <Text className="mt-2 text-base text-mutedForeground">
          Choose something you&apos;ll remember.
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
      <View className="mt-8">
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
    </AuthShell>
  );
}
