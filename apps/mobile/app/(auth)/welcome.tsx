import * as React from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { brand } from "@aira/config";

// Welcome is the pre-auth brand-hero entry point. Deliberately NOT wrapped
// in <AuthShell> — the shell's "small logo header + form" composition
// would flatten the hero. Here the tree-of-life logo is THE visual
// statement (140x140 centred), brand name + tagline below, dual CTAs
// pinned at the bottom.

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 140, height: 140 }}
            accessibilityLabel={`${brand.name} logo`}
          />
          <Text
            accessibilityRole="header"
            className="mt-6 font-display text-5xl tracking-tight text-foreground"
          >
            {brand.name}
          </Text>
          <Text className="mt-3 text-lg leading-7 text-mutedForeground">
            {brand.tagline}
          </Text>
        </View>
      </View>

      <View className="px-6 pb-6 pt-4" style={{ gap: 12 }}>
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

      <View className="items-center px-6 pb-4">
        <Text className="text-xs text-mutedForeground">
          {brand.name} by {brand.parentName}
        </Text>
      </View>
    </SafeAreaView>
  );
}
