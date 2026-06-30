import * as React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BusinessCard } from "../../../features/listings/components/BusinessCard";
import { useFavoriteIds, useFavorites } from "../../../features/favorites/hooks";

/**
 * /account/favorites — the user's favorited businesses as a flat list.
 * Pushed from the Account hub's "Favorites" row. Sub-page of the
 * account Stack so back chevron returns to the hub.
 *
 * useFavorites returns hydrated rows; useFavoriteIds returns the Set
 * needed to render the heart filled (every row here is favorited by
 * definition, but the BusinessCard reads from the Set anyway so the
 * heart toggle still works inline from this screen).
 */
export default function FavoritesScreen() {
  const list = useFavorites();
  const favIds = useFavoriteIds();

  const items = list.data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Favorites" }} />
      {list.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
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
              isFavorited={favIds.data?.has(item.id) ?? true}
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
                No favorites yet.
              </Text>
              <Text className="mt-2 text-center text-sm text-mutedForeground">
                Tap the heart on any business to save it here.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse the directory"
                onPress={() => router.push("/categories" as never)}
                className="mt-5 rounded-full bg-primary px-5 py-2.5"
              >
                <Text className="text-sm font-bold text-primaryForeground">
                  Browse the directory
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
