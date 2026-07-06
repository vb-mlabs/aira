import * as React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { getCategoryMeta } from "../../../features/listings/category-meta";
import { useCategories } from "../../../features/listings/hooks";
import type { Category } from "@aira/validators";

// Same shadow recipe as CategoryTile so the expanding card reads
// consistently with everything else on the screen.
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
const TIER2_HEX = "#C97638"; // burnt orange (sub) — sRGB approx of oklch(0.62 0.13 55)
const MUTED_HEX = "#66503f";
const BORDER_LOW_HEX = "rgba(61,40,20,0.10)";

interface RootAccordionRowProps {
  root: Category;
  subs: Category[];
  counts: Record<string, number>;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Accordion row on the Categories tab. Root header + optional expanded
 * sub-row list share the SAME card container so the whole group reads
 * as one visual unit that grows/shrinks in place. Tapping a root with
 * subs toggles expansion; tapping a root without subs navigates
 * straight to /listings/<slug>. Sub rows navigate to
 * /listings/<sub-slug>. Radha's 2026-07-06 UAT: the old two-tap flow
 * felt wasteful; inline expansion collapses it to one tap, and keeping
 * subs inside the parent card keeps the visual hierarchy tight.
 */
function RootAccordionRow({
  root,
  subs,
  counts,
  expanded,
  onToggle,
}: RootAccordionRowProps) {
  const meta = getCategoryMeta(root.slug);
  const countLabel =
    typeof counts[root.slug] === "number" ? String(counts[root.slug]) : null;
  const hasSubs = subs.length > 0;

  function handlePress() {
    if (hasSubs) {
      onToggle();
    } else {
      // Cross-tab navigation — Categories and Listings are sibling
      // tabs, each with its own Stack (listings is hidden via
      // href:null). `router.replace` from Categories replaces the
      // Categories tab's current screen with the listing, permanently
      // clobbering the accordion — that's the bug Radha hit
      // 2026-07-06 ("keep showing me this screen only"). `push`
      // targets the Listings tab's stack correctly; back button pops
      // back to Categories.
      router.push(`/listings/${root.slug}` as never);
    }
  }

  return (
    <View
      className="overflow-hidden rounded-xl bg-card"
      style={CARD_SHADOW}
    >
      {/* Primary row — always visible */}
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
          className="flex-row items-center p-4"
          style={{ gap: 16 }}
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
            color={MUTED_HEX}
          />
        </View>
      </Pressable>

      {/* Sub rows — nested inside the same card, divided by a hairline
          from the primary row. Only rendered when expanded. */}
      {hasSubs && expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: BORDER_LOW_HEX }}>
          {subs.map((sub, index) => {
            const subCount = counts[sub.slug];
            const subCountLabel =
              typeof subCount === "number" ? String(subCount) : null;
            const isLast = index === subs.length - 1;
            return (
              <Pressable
                key={sub.id}
                accessibilityRole="button"
                accessibilityLabel={
                  subCountLabel
                    ? `Browse ${sub.name} businesses, ${subCountLabel} listed`
                    : `Browse ${sub.name} businesses`
                }
                onPress={() =>
                  // Same reason as the root row above — push, not
                  // replace, for cross-tab navigation into Listings.
                  router.push(`/listings/${sub.slug}` as never)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  paddingRight: 16,
                  paddingLeft: 24,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: BORDER_LOW_HEX,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    backgroundColor: "rgba(201,118,56,0.14)",
                  }}
                >
                  <MaterialCommunityIcons
                    name="subdirectory-arrow-right"
                    size={16}
                    color={TIER2_HEX}
                  />
                </View>
                <Text
                  className="flex-1 text-sm font-medium text-foreground"
                  numberOfLines={1}
                >
                  {sub.name}
                </Text>
                {subCountLabel ? (
                  <Text className="text-xs font-semibold text-mutedForeground">
                    {subCountLabel}
                  </Text>
                ) : null}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={MUTED_HEX}
                />
              </Pressable>
            );
          })}
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
