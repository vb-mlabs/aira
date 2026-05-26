import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { AuthShell } from "../../components/AuthShell";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useForgotPassword } from "../../features/auth/hooks";
import { ForgotPasswordSchema } from "@aira/validators";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [sent, setSent] = React.useState(false);
  const forgot = useForgotPassword();

  const submit = async () => {
    const parsed = ForgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    try {
      await forgot.mutateAsync(parsed.data);
      setSent(true);
    } catch {
      setError("Couldn't send reset email. Try again.");
    }
  };

  return (
    <AuthShell>
      <View>
        <Text
          accessibilityRole="header"
          className="font-display text-4xl text-foreground"
        >
          Reset your password
        </Text>
        <Text className="mt-2 text-base text-mutedForeground">
          Enter your email and we&apos;ll send a reset link.
        </Text>
      </View>
      {sent ? (
        <View className="mt-8">
          <Text className="text-base text-foreground">
            Check your email for the reset link.
          </Text>
        </View>
      ) : (
        <View className="mt-8" style={{ gap: 24 }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={error}
          />
        </View>
      )}
      <View className="mt-8" style={{ gap: 16 }}>
        {!sent ? (
          <Button
            fullWidth
            size="lg"
            loading={forgot.isPending}
            onPress={submit}
            accessibilityLabel="Send reset link"
          >
            Send reset link
          </Button>
        ) : null}
        <View className="flex-row justify-center">
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link">
              <Text className="text-base font-medium text-foreground">
                Back to login
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}
