import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useSignUp } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { SignUpSchema } from "@aira/validators";

export default function SignUpScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    name?: string;
  }>({});
  const signUp = useSignUp();
  const toast = useToast();

  const submit = async () => {
    const parsed = SignUpSchema.safeParse({ email, password, name });
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
      await signUp.mutateAsync(parsed.data);
      router.replace({
        pathname: "/(auth)/check-email",
        params: { email: parsed.data.email },
      });
    } catch (e) {
      toast.show({
        message: e instanceof Error ? e.message : "Something went wrong",
        kind: "error",
      });
    }
  };

  return (
    <AuthShell>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-4xl text-foreground"
        >
          Create your account
        </Text>
        <Text className="mt-2 text-base text-mutedForeground">
          We&apos;ll send a verification link to your email.
        </Text>
      </View>
      <View className="mt-8" style={{ gap: 24 }}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          error={errors.name}
        />
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
          hint="At least 8 characters."
        />
      </View>
      <View className="mt-8" style={{ gap: 16 }}>
        <Button
          fullWidth
          size="lg"
          loading={signUp.isPending}
          onPress={submit}
          accessibilityLabel="Sign up"
        >
          Sign Up
        </Button>
        <View className="flex-row justify-center">
          <Text className="text-base text-mutedForeground">
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link">
              <Text className="text-base font-medium text-foreground">
                Sign In
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
