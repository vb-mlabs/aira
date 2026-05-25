import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useSignUp } from "../../features/auth/hooks";
import { useToast } from "../../components/ui/Toast";
import { SignUpSchema } from "@mlabs/validators";
import { brand } from "@mlabs/config";

/**
 * Sign-up screen.
 * Layout: FULL-SCREEN — brand wordmark top-left, big H1, fields with 24px
 * gaps, primary CTA bottom-pinned full-width. (Pass-4 AI-slop rejection.)
 */
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
                Create your account
              </Text>
              <Text className="mt-2 text-base text-mutedForeground">
                We'll send a verification link to your email.
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
          </View>
          <View className="px-6 pb-8 pt-4">
            <Button
              fullWidth
              size="lg"
              loading={signUp.isPending}
              onPress={submit}
              accessibilityLabel="Create account"
            >
              Create account
            </Button>
            <View className="mt-4 flex-row justify-center">
              <Text className="text-base text-mutedForeground">
                Already have an account?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-base font-medium text-foreground">
                    Log in
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
