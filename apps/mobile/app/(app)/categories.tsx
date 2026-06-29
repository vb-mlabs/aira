import * as React from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../components/ui/Skeleton";
import { CategoryTile } from "../../features/listings/components/CategoryTile";
import { EmptyState } from "../../features/listings/components/EmptyState";
import { useCategories } from "../../features/listings/hooks";

export default function CategoriesScreen() {
  const cats = useCategories();
  const active = (cats.data?.categories ?? []).filter(
    (c) => c.active !== false,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-6">
        <Text
          accessibilityRole="header"
          className="font-display text-3xl font-bold text-foreground"
        >
          Categories
        </Text>
        <Text className="mt-1 text-sm text-mutedForeground">
          Browse Atlanta&apos;s Indian businesses by category.
        </Text>
      </View>
      {cats.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={80} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={active}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryTile slug={item.slug} name={item.name} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={cats.isFetching}
              onRefresh={() => {
                void cats.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No categories available yet."
              description="Pull to refresh or check back soon."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
