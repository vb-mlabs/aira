import * as React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Skeleton } from "../../../components/ui/Skeleton";
import { CategoryTile } from "../../../features/listings/components/CategoryTile";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { getCategoryMeta } from "../../../features/listings/category-meta";
import { useCategories } from "../../../features/listings/hooks";
import type { Category } from "@aira/validators";

// Same shadow recipe as CategoryTile so the root row + sub tiles read
// as one visually consistent group.
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
} as const;

// Design token values (subset). RN can't read CSS vars — mirror the
// CategoryTile constants (sRGB hex from packages/config/src/design.ts
// light theme). Keep in sync manually with the token file.
const TIER1_HEX = "#4F653B"; // olive green (root)

interface RootAccordionRowProps {
  root: Category;
  subs: Category[];
  counts: Record<string, number>;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Accordion row on the Categories tab. Tapping a root with subs expands
 * inline to reveal them (no navigation); tapping a root without subs
 * navigates straight to /listings/<slug> (the PrimaryCategoryView will
 * render an empty state there). Tapping a sub tile navigates to the
 * sub's listings screen. Radha's 2026-07-06 UAT feedback: the old
 * two-tap flow through the intermediate PrimaryCategoryView on mobile
 * felt like a wasted step; inline expansion collapses it to one tap.
 */
function RootAccordionRow({
  root,
  subs,
  counts,
  expanded,
  onToggle,
}: RootAccordionRowProps) {
  const meta = getCategoryMeta(root.slug);
  const countLabel = typeof counts[root.slug] === "number"
    ? String(counts[root.slug])
    : null;
  const hasSubs = subs.length > 0;

  function handlePress() {
    if (hasSubs) {
      onToggle();
    } else {
      router.push(`/listings/${root.slug}` as never);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          hasSubs
            ? `${root.name}, ${expanded ? "expanded" : "collapsed"}. Tap to ${
                expanded ? "close" : "show"
              } subcategories.`
            : countLabel
              ? `Browse ${root.name} businesses, ${countLabel} listed`
              : `Browse ${root.name} businesses`
        }
        onPress={handlePress}
      >
        <View
          className="flex-row items-center rounded-xl bg-card p-4"
          style={[{ gap: 16 }, CARD_SHADOW]}
        >
          <View
            className="items-center justify-center rounded-xl bg-muted"
            style={{ width: 48, height: 48 }}
          >
            <MaterialCommunityIcons
              name={meta.iconName}
              size={24}
              color={TIER1_HEX}
            />
          </View>
          <View className="flex-1">
            <Text className="font-display text-base font-semibold text-foreground">
              {root.name}
            </Text>
            {meta.description ? (
              <Text
                className="mt-0.5 text-xs text-mutedForeground"
                numberOfLines={1}
              >
                {meta.description}
              </Text>
            ) : null}
          </View>
          {countLabel ? (
            <Text className="text-sm font-semibold text-mutedForeground">
              {countLabel}
            </Text>
          ) : null}
          <MaterialCommunityIcons
            name={
              hasSubs
                ? expanded
                  ? "chevron-down"
                  : "chevron-right"
                : "chevron-right"
            }
            size={20}
            color="#66503f"
          />
        </View>
      </Pressable>
      {hasSubs && expanded ? (
        <View style={{ paddingLeft: 20, gap: 8 }}>
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
      ) : null}
    </View>
  );
}

export default function CategoriesScreen() {
  const cats = useCategories();
  const active = (cats.data?.categories ?? []).filter(
    (c) => c.active !== false,
  );
  const counts = cats.data?.counts ?? {};
  const subsByRoot = cats.data?.subsByRoot ?? {};

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Categories" }} />
      <View className="px-5 pt-4">
        <Text className="text-sm text-mutedForeground">
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
            <RootAccordionRow
              root={item}
              subs={subsByRoot[item.id] ?? []}
              counts={counts}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === item.id ? null : item.id))
              }
            />
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
    </View>
  );
}
