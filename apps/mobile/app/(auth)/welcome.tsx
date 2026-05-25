import * as React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { brand } from "@mlabs/config";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="size-2 rounded-full bg-primary" />
          <Text className="text-base font-extrabold tracking-tight text-foreground">
            {brand.name}
          </Text>
        </View>

        <View className="flex-1 justify-center">
          <Text
            accessibilityRole="header"
            className="text-5xl font-semibold tracking-tight text-foreground"
          >
            {brand.name}
          </Text>
          <Text className="mt-4 text-lg leading-7 text-mutedForeground">
            {brand.tagline}
          </Text>
        </View>
      </View>

      <View className="px-6 pb-8 pt-4" style={{ gap: 12 }}>
        <Button
          fullWidth
          size="lg"
          variant="primary"
          accessibilityLabel="Create account"
          onPress={() => router.push("/(auth)/sign-up")}
        >
          Create account
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          accessibilityLabel="Sign in"
          onPress={() => router.push("/(auth)/login")}
        >
          Sign in
        </Button>
      </View>
    </SafeAreaView>
  );
}
