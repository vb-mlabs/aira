import * as React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { useCategories } from "../../../features/listings/hooks";

/**
 * Sub-category picker for a single root. Reached by tapping a root with
 * children on /categories. Layout:
 *
 *   ┌─────────────────────────────────────────┐
 *   │ ← Restaurants                           │  (cream stack header)
 *   ├─────────────────────────────────────────┤
 *   │ All Restaurants                  47  ›  │
 *   │ ─────────────────────────────────────── │
 *   │ Indian                           12  ›  │
 *   │ South Indian                      8  ›  │
 *   │ Sweets & Snacks                   6  ›  │
 *   └─────────────────────────────────────────┘
 *
 * The "All <Root>" row navigates to /listings/<root-slug>; each sub row
 * navigates to /listings/<sub-slug>. Counts are sourced from the cached
 * useCategories() result so this screen renders instantly on tap (no
 * second round-trip).
 *
 * If the root slug doesn't resolve (deep link to a stale slug, or the
 * cache hasn't hydrated yet) we render an EmptyState; on hydrate the
 * screen re-renders with content.
 */
const ROW_HEIGHT = 56;
const MUTED = "#66503f";

interface RowProps {
  label: string;
  count?: number;
  onPress: () => void;
}

function Row({ label, count, onPress }: RowProps) {
  const countLabel = typeof count === "number" ? String(count) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        countLabel ? `Browse ${label}, ${countLabel} listed` : `Browse ${label}`
      }
      onPress={onPress}
      className="flex-row items-center border-b border-border bg-card px-5"
      style={{ minHeight: ROW_HEIGHT, gap: 12 }}
    >
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      {countLabel ? (
        <Text className="text-sm font-semibold text-mutedForeground">
          {countLabel}
        </Text>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
    </Pressable>
  );
}

export default function CategorySubcategoriesScreen() {
  const params = useLocalSearchParams<{ root: string }>();
  const slug = typeof params.root === "string" ? params.root : undefined;

  const cats = useCategories();
  const root = (cats.data?.categories ?? []).find((c) => c.slug === slug);
  const subs = root
    ? (cats.data?.subsByRoot ?? {})[root.id] ?? []
    : [];
  const counts = cats.data?.counts ?? {};

  const headerTitle = root?.name ?? "Subcategories";

  if (cats.isFetched && !root) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState
          title="Category not found."
          description="It may have been renamed or removed."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: headerTitle }} />
      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          root ? (
            <Row
              label={`All ${root.name}`}
              count={counts[root.slug]}
              onPress={() =>
                router.push(`/listings/${root.slug}` as never)
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Row
            label={item.name}
            count={counts[item.slug]}
            onPress={() => router.push(`/listings/${item.slug}` as never)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={cats.isFetching}
            onRefresh={() => {
              void cats.refetch();
            }}
          />
        }
        ListEmptyComponent={
          !cats.isLoading ? (
            <EmptyState
              title="No subcategories."
              description="This category has no further breakdown yet."
            />
          ) : null
        }
      />
    </View>
  );
}
