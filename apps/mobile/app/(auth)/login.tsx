import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useLogin, useResendVerify } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { ApiError } from "../../lib/api/client";
import { LoginSchema } from "@mlabs/validators";
import { brand } from "@mlabs/config";

export default function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [unverified, setUnverified] = React.useState(false);
  const login = useLogin();
  const resend = useResendVerify();
  const toast = useToast();

  const submit = async () => {
    const parsed = LoginSchema.safeParse({ email, password });
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
    setUnverified(false);
    try {
      await login.mutateAsync(parsed.data);
      // Gate at (auth)/_layout.tsx redirects to /(app) once useMe()
      // refetches and returns emailVerified: true. Single source of truth
      // for authenticated transitions — no explicit replace here.
    } catch (e) {
      if (e instanceof ApiError && e.code === "email_not_verified") {
        setUnverified(true);
        setErrors({ form: "Please verify your email to sign in." });
      } else if (e instanceof ApiError) {
        setErrors({ form: "Wrong email or password." });
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
                Welcome back
              </Text>
              <Text className="mt-2 text-base text-mutedForeground">
                Sign in to continue.
              </Text>
            </View>
            <View className="mt-8" style={{ gap: 24 }}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                error={errors.email}
              />
              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={submit}
                error={errors.password}
              />
              {errors.form ? (
                <Text className="text-sm text-destructive">{errors.form}</Text>
              ) : null}
              {unverified ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (email) {
                      resend.mutate(email);
                      toast.show({
                        message: "Verification email sent",
                        kind: "success",
                      });
                    }
                  }}
                >
                  <Text className="text-base font-medium text-foreground underline">
                    Resend verification email
                  </Text>
                </Pressable>
              ) : null}
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-base text-foreground">
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
          <View className="px-6 pb-8 pt-4">
            <Button
              fullWidth
              size="lg"
              loading={login.isPending}
              onPress={submit}
              accessibilityLabel="Sign in"
            >
              Sign in
            </Button>
            <View className="mt-4 flex-row justify-center">
              <Text className="text-base text-mutedForeground">
                Need an account?{" "}
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-base font-medium text-foreground">
                    Sign up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
