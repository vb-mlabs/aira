import * as React from "react";
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { brand } from "@aira/config";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BusinessCard } from "../../../features/listings/components/BusinessCard";
import { useFavoriteIds } from "../../../features/favorites/hooks";
import { useMyListings } from "../../../features/listings/hooks";

/**
 * /account/listings — businesses the current user manages as
 * owner_user_id. Read-only on mobile (business edit is admin-only on
 * web). EmptyState carries a mailto: button so users without a claimed
 * business can reach out to support.
 */
export default function MyListingsScreen() {
  const list = useMyListings();
  const favIds = useFavoriteIds();
  const items = list.data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "My Listings" }} />
      {list.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={96} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessCard
              business={item}
              isFavorited={favIds.data?.has(item.id) ?? false}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 48,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={() => {
                void list.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center font-display text-lg font-semibold text-foreground">
                You don&apos;t manage any listings yet.
              </Text>
              <Text className="mt-2 text-center text-sm text-mutedForeground">
                Contact {brand.name} support to claim a business.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Email ${brand.name} support to claim a business`}
                onPress={() => {
                  void Linking.openURL(
                    `mailto:${brand.supportEmail}?subject=${encodeURIComponent(
                      "Claim my business",
                    )}`,
                  );
                }}
                className="mt-5 rounded-full bg-primary px-5 py-2.5"
              >
                <Text className="text-sm font-bold text-primaryForeground">
                  Email support
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
