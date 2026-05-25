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
import { Button } from "../../components/ui/Button";
import { useForgotPassword } from "../../features/auth/hooks";
import { ForgotPasswordSchema } from "@mlabs/validators";
import { brand } from "@mlabs/config";

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
                Reset your password
              </Text>
              <Text className="mt-2 text-base text-mutedForeground">
                Enter your email and we'll send a reset link.
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
          </View>
          <View className="px-6 pb-8 pt-4">
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
            <View className="mt-4 flex-row justify-center">
              <Link href="/(auth)/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-base font-medium text-foreground">
                    Back to login
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
