import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BusinessCard } from "../../../features/listings/components/BusinessCard";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { SearchBar } from "../../../features/listings/components/SearchBar";
import { SubcategoryPicker } from "../../../features/listings/components/SubcategoryPicker";
import { VerifiedFilterChip } from "../../../features/listings/components/VerifiedFilterChip";
import { useFavoriteIds } from "../../../features/favorites/hooks";
import {
  useCategories,
  useCategory,
  useListings,
} from "../../../features/listings/hooks";
import { getCategoryMeta } from "../../../features/listings/category-meta";

/**
 * Paginated listings for a single category. Mirrors the web
 * /listings/[category] page: scoped keyword search (debounced),
 * verified filter chip, infinite scroll via useInfiniteQuery, empty
 * + search-empty + loading states.
 */
export default function CategoryListingScreen() {
  const params = useLocalSearchParams<{ category: string }>();
  const slug = typeof params.category === "string" ? params.category : undefined;

  const cat = useCategory(slug);
  const cats = useCategories();
  const favIds = useFavoriteIds();
  const [q, setQ] = React.useState("");
  const [verified, setVerified] = React.useState(false);

  const list = useListings({ category: slug, q, verified });

  // Resolve the parent root for the picker pill. If `slug` is a root
  // with subs, picker shows "All <Root>" + each sub. If `slug` is a sub,
  // we walk subsByRoot to find which root owns it and show its siblings
  // (sub-to-sub navigation without bouncing back to /categories). If
  // neither (root with no subs, or unknown slug), picker is hidden.
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

  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);

  const headerTitle =
    cat.data?.category?.name ?? (slug ? getCategoryMeta(slug).displayName : "Listings");

  const onRefresh = React.useCallback(() => {
    void list.refetch();
  }, [list]);

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
              counts={counts}
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

      {/* List */}
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
              showCategory={false}
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
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={onRefresh}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            q.trim() ? (
              <EmptyState title="No matches for that search." />
            ) : (
              <EmptyState title="No businesses in this category yet." />
            )
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
