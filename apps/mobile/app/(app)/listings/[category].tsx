import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { VALID_TIERS, type Business, type BusinessTier } from "@aira/validators";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BusinessCard } from "../../../features/listings/components/BusinessCard";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { SearchBar } from "../../../features/listings/components/SearchBar";
import { SubcategoryPicker } from "../../../features/listings/components/SubcategoryPicker";
import { TierSection } from "../../../features/listings/components/TierSection";
import { VerifiedFilterChip } from "../../../features/listings/components/VerifiedFilterChip";
import { useFavoriteIds } from "../../../features/favorites/hooks";
import {
  useCategories,
  useCategory,
  useFeaturedForCategory,
  useListings,
} from "../../../features/listings/hooks";
import { getCategoryMeta } from "../../../features/listings/category-meta";

/**
 * Category screen. Branches on the loaded category's `level`:
 *
 *   - level 1 (root/primary) → PrimaryCategoryView: category header +
 *     subcategory tiles + 5 featured (random from strict sponsored pool
 *     scoped to this category). No search, no pagination.
 *   - level 2 (subcategory)  → existing paginated ListingView-style
 *     FlatList with search, verified filter, and subcategory picker.
 *
 * The split was introduced by the 2026-07-06 QA feedback pass (items
 * #2, #12). Level-1 categories are pure navigation surfaces.
 */
export default function CategoryListingScreen() {
  const params = useLocalSearchParams<{ category: string }>();
  const slug = typeof params.category === "string" ? params.category : undefined;

  const cat = useCategory(slug);
  const cats = useCategories();
  const favIds = useFavoriteIds();

  const level = cat.data?.category?.level;
  const isPrimary = level === 1;

  const featuredForCategory = useFeaturedForCategory(isPrimary ? slug : undefined);

  const [q, setQ] = React.useState("");
  const [verified, setVerified] = React.useState(false);

  // Fires on both branches. When slug is a root (level=1), the server
  // expands to include children so "All Listings" returns businesses
  // across the whole root. When slug is a sub (level=2), search/verified
  // filters apply. Search/verified are suppressed on the level=1 branch
  // since there's no filter UI there.
  const list = useListings({
    category: slug,
    q: isPrimary ? undefined : q,
    verified: isPrimary ? undefined : verified,
  });

  // Sub-picker pill (level-2 branch only). Resolves the root that owns
  // this sub via subsByRoot so the picker can list sibling subs.
  const pickerData = React.useMemo(() => {
    const rootList = cats.data?.categories ?? [];
    const subsByRoot = cats.data?.subsByRoot ?? {};
    if (!slug) return null;
    const rootMatch = rootList.find((c) => c.slug === slug);
    if (rootMatch) {
      const subs = subsByRoot[rootMatch.id] ?? [];
      return subs.length > 0 ? { root: rootMatch, subs } : null;
    }
    for (const [rootId, subList] of Object.entries(subsByRoot)) {
      if (subList.some((s) => s.slug === slug)) {
        const owner = rootList.find((c) => c.id === rootId);
        return owner ? { root: owner, subs: subList } : null;
      }
    }
    return null;
  }, [cats.data, slug]);

  const counts = cats.data?.counts ?? {};
  const favIdSet = favIds.data ?? new Set<string>();

  const headerTitle =
    cat.data?.category?.name ?? (slug ? getCategoryMeta(slug).displayName : "Listings");

  // 404: category exists in route param but server returned null.
  if (cat.isFetched && !cat.data?.category) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState
          title="Category not found."
          description="It may have been renamed or removed."
        />
      </SafeAreaView>
    );
  }

  // ─── Level-1 branch ────────────────────────────────────────────────
  // Renders the tier-grouped ListingView across the whole root (server
  // auto-expands the query to include all child sub-categories). Also
  // renders the per-category featured section on top when there are
  // active sponsorships. Empty when the whole root has nothing yet.
  if (isPrimary && cat.data?.category) {
    const featured = featuredForCategory.data?.items ?? [];
    const rootPages = list.data?.pages ?? [];
    const rootItems = rootPages.flatMap((p) => p.items);
    const isRefreshing =
      featuredForCategory.isFetching ||
      list.isRefetching ||
      cats.isFetching ||
      cat.isFetching;
    const onRefresh = () => {
      void featuredForCategory.refetch();
      void list.refetch();
      void cats.refetch();
      void cat.refetch();
    };

    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <Stack.Screen options={{ title: headerTitle }} />
        {list.isLoading ? (
          <View className="mt-4 px-5" style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={96} borderRadius={12} />
            ))}
          </View>
        ) : featured.length === 0 && rootItems.length === 0 ? (
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
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 48,
            }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              const nearBottom =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - 200;
              if (
                nearBottom &&
                list.hasNextPage &&
                !list.isFetchingNextPage
              ) {
                void list.fetchNextPage();
              }
            }}
            scrollEventThrottle={200}
          >
            {featured.length > 0 ? (
              <View style={{ marginBottom: 24 }}>
                <Text
                  className="mb-3 font-display text-lg font-semibold text-foreground"
                >
                  Featured in {cat.data.category.name}
                </Text>
                <View style={{ gap: 12 }}>
                  {featured.map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                      isFavorited={favIdSet.has(business.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {rootItems.length > 0
              ? groupByTier(rootItems).map((group) => (
                  <TierSection
                    key={group.tier}
                    tier={group.tier}
                    businesses={group.businesses}
                    favIds={favIdSet}
                  />
                ))
              : null}
            {list.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ─── Level-2 branch (existing paginated list) ──────────────────────
  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);

  const onRefresh = () => {
    void list.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: headerTitle }} />

      {/* Controls */}
      <View className="px-5 pt-3" style={{ gap: 12 }}>
        <SearchBar value={q} onChange={setQ} />
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <VerifiedFilterChip
            active={verified}
            onToggle={() => setVerified((v) => !v)}
          />
          {pickerData && slug ? (
            <SubcategoryPicker
              root={pickerData.root}
              subs={pickerData.subs}
              currentSlug={slug}
              // replace, not push — sub-to-sub navigation shouldn't
              // pile up on the back stack. One Back press from any
              // sub returns to Categories, not the previous sub.
              onSelect={(nextSlug) =>
                router.replace(`/listings/${nextSlug}` as never)
              }
            />
          ) : null}
        </View>
      </View>

      {/* List — grouped by tier (Sponsored / Sponsored Level 2 /
          Regular) to mirror the web layout. Textured section headers +
          BusinessCards in each group. Empty groups render nothing. */}
      {list.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={96} borderRadius={12} />
          ))}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 48,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={onRefresh}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const nearBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 200;
            if (
              nearBottom &&
              list.hasNextPage &&
              !list.isFetchingNextPage
            ) {
              void list.fetchNextPage();
            }
          }}
          scrollEventThrottle={200}
        >
          {items.length === 0 ? (
            q.trim() ? (
              <EmptyState title="No matches for that search." />
            ) : (
              <EmptyState title="No businesses in this category yet." />
            )
          ) : (
            groupByTier(items).map((group) => (
              <TierSection
                key={group.tier}
                tier={group.tier}
                businesses={group.businesses}
                favIds={favIdSet}
              />
            ))
          )}
          {list.isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

interface TierGroup {
  tier: BusinessTier;
  businesses: Business[];
}

/** Bucket the flat page-flatten into fixed tier order (tier1 →
 *  tier2 → tier3). Empty tiers still produce an entry so keying stays
 *  stable across renders; TierSection short-circuits on empty. */
function groupByTier(items: Business[]): TierGroup[] {
  return VALID_TIERS.map<TierGroup>((tier) => ({
    tier,
    businesses: items.filter((b) => b.tier === tier),
  }));
}
