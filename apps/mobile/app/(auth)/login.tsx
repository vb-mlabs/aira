import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useLogin } from "../../features/auth/hooks";
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
  const login = useLogin();
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
    try {
      await login.mutateAsync(parsed.data);
      // Gate at (auth)/_layout.tsx redirects to /(app) once useMe()
      // refetches and returns emailVerified: true. Single source of truth
      // for authenticated transitions — no explicit replace here.
    } catch (e) {
      // Better Auth returns { code: "EMAIL_NOT_VERIFIED", ... } (UPPER_CASE
      // per the Better Auth error-code convention) at 403 when a user tries
      // to sign in with correct credentials but an unverified email. Better
      // Auth ALSO auto-sends a fresh verification email as part of that
      // response (see sign-in.mjs:312-324 — runInBackgroundOrAwait on the
      // sendVerificationEmail hook), so redirecting the user to the
      // "check your email" screen is truthful: a link really was just sent.
      // Matches the sign-up terminal state so users see one consistent
      // flow regardless of whether they came from Sign Up or Sign In.
      if (e instanceof ApiError && e.code === "EMAIL_NOT_VERIFIED") {
        router.replace({
          pathname: "/(auth)/check-email",
          params: { email: parsed.data.email },
        });
        return;
      }
      if (e instanceof ApiError) {
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
