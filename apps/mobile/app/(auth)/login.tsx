import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useLogin, useResendVerify } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { ApiError } from "../../lib/api/client";
import { LoginSchema } from "@aira/validators";
import { brand } from "@aira/config";

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
    <AuthShell>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-4xl text-foreground"
        >
          Welcome Back!
        </Text>
        <Text className="mt-2 text-base text-mutedForeground">
          Sign in to continue to {brand.name}.
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
            <Text className="text-base text-foreground">Forgot password?</Text>
          </Pressable>
        </Link>
      </View>
      <View className="mt-8" style={{ gap: 16 }}>
        <Button
          fullWidth
          size="lg"
          loading={login.isPending}
          onPress={submit}
          accessibilityLabel="Sign in"
        >
          Sign In
        </Button>
        <View className="flex-row justify-center">
          <Text className="text-base text-mutedForeground">
            Don&apos;t have an account?{" "}
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link">
              <Text className="text-base font-medium text-foreground">
                Sign Up
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
