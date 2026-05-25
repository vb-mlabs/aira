import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useMe } from "../../features/auth/hooks";

/**
 * Home tab — greeting + 1 CTA placeholder. Forks customize the CTA in their
 * fork's home screen.
 */
export default function HomeScreen() {
  const me = useMe();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        {me.isLoading ? (
          <Skeleton width="60%" height={36} />
        ) : (
          <Text
            accessibilityRole="header"
            className="text-3xl font-semibold text-foreground"
          >
            Welcome
            {me.data?.name ? `, ${me.data.name.split(" ")[0]}` : ""}
          </Text>
        )}
        <Text className="mt-2 text-base text-mutedForeground">
          What would you like to do today?
        </Text>
        <View className="mt-8">
          <Button fullWidth size="lg" onPress={() => {}}>
            Get started
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
