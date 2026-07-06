import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import type { Business, Category } from "@aira/validators";
import { BusinessCard } from "./BusinessCard";
import { CategoryTile } from "./CategoryTile";

// Primary category view — renders when a URL slug resolves to a level-1
// (root) category. Layout: category header + subcategory tiles + Featured
// section (5 random from the strict sponsored pool scoped to this
// category). When both the sub grid and the featured pool are empty,
// falls back to an EmptyState.
//
// Deliberately no search, verified filter, or infinite scroll — those
// live on the subcategory (level-2) branch, which continues to render
// the paginated FlatList in listings/[category].tsx. Split introduced by
// the 2026-07-06 QA feedback pass (items #2, #12).

interface PrimaryCategoryViewProps {
  category: Category;
  /** Active level-2 rows whose parent_id equals `category.id`. */
  subs: Category[];
  /** Per-slug visible-business counts (root + sub). Drives the count
   *  chip on each subcategory tile. */
  counts: Record<string, number>;
  /** Up to 5 random featured businesses for this category. Empty when
   *  the category has no active sponsorships. */
  featured: Business[];
  favIds: ReadonlySet<string>;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function PrimaryCategoryView({
  category,
  subs,
  counts,
  featured,
  favIds,
  isRefreshing = false,
  onRefresh,
}: PrimaryCategoryViewProps) {
  const hasSubs = subs.length > 0;
  const hasFeatured = featured.length > 0;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 48,
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {!hasSubs && !hasFeatured ? (
        <View className="items-center justify-center px-6 py-16">
          <Text className="text-center font-display text-lg font-semibold text-foreground">
            No listings in this category yet
          </Text>
          <Text className="mt-2 text-center text-sm text-mutedForeground">
            Check back soon or browse another category.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse other categories"
            onPress={() => router.replace("/categories" as never)}
            className="mt-6 rounded-lg bg-primary px-5 py-2.5"
          >
            <Text className="text-sm font-semibold text-primaryForeground">
              Browse categories
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {hasSubs ? (
            <View className="mb-8">
              <Text className="mb-3 font-display text-lg text-foreground">
                Subcategories
              </Text>
              <View style={{ gap: 12 }}>
                {subs.map((sub) => (
                  <CategoryTile
                    key={sub.id}
                    slug={sub.slug}
                    name={sub.name}
                    count={counts[sub.slug]}
                    variant="sub"
                  />
                ))}
              </View>
            </View>
          ) : null}

          {hasFeatured ? (
            <View>
              <Text className="mb-3 font-display text-lg text-foreground">
                Featured in {category.name}
              </Text>
              <View style={{ gap: 12 }}>
                {featured.map((business) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    isFavorited={favIds.has(business.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
