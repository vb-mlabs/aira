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
import { Skeleton } from "../../../components/ui/Skeleton";
import { HamburgerButton } from "../../../components/nav/HamburgerButton";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { SearchBar } from "../../../features/listings/components/SearchBar";
import {
  SlotSection,
  bucketBySlot,
} from "../../../features/listings/components/SlotSection";
import { useCategories, useListings } from "../../../features/listings/hooks";
import { useFavoriteIds } from "../../../features/favorites/hooks";

const SPONSORED_TEXTURE = require("../../../assets/textures/tier1-texture.webp") as unknown;
const REGULAR_TEXTURE = require("../../../assets/textures/tier3-texture.webp") as unknown;

// Chip pill colours — sRGB literals matching the cream/olive palette
// used across the app (see design.ts light theme). RN can't read the
// CSS vars, so mirror them here as constants.
const CHIP_ACTIVE_BG = "#4F653B"; // primary olive
const CHIP_ACTIVE_FG = "#F3EBDD"; // primary-foreground cream
const CHIP_IDLE_BG = "#FFFFFF";
const CHIP_IDLE_FG = "#3D2814";
const CHIP_BORDER = "rgba(61,40,20,0.14)";

/**
 * Listings tab — the default surface for browsing every business in the
 * directory. Structural mirror of the level-2 branch on
 * app/(app)/listings/[category].tsx: SearchBar + horizontal category
 * chip strip in the sticky header, followed by Sponsored + Regular
 * SlotSection groups over the paginated results. Sub-category drill-
 * down lives in the drawer's category tree, so no picker pill here.
 *
 * The old accordion RootAccordionRow lived at this path pre-drawer;
 * that navigation surface has moved into AppDrawerContent's category
 * tree. Kept the file at (app)/categories/index.tsx (rather than
 * moving to /(app)/listings/) to avoid breaking universal-link /
 * push-notification deep-link resolution.
 */
export default function ListingsTabScreen() {
  const cats = useCategories();
  const favIds = useFavoriteIds();

  // Category filter lives in the URL as `?cat=<slug>` so it survives every
  // navigation the user throws at it — tab-switch, drawer-open, back from
  // a business detail. Reading via useLocalSearchParams; writing via
  // router.setParams. Empty string = "All" (chip strip's leftmost pill).
  const params = useLocalSearchParams<{ cat?: string }>();
  const selectedCategory =
    typeof params.cat === "string" && params.cat.length > 0
      ? params.cat
      : null;
  const setCategory = React.useCallback((next: string | null) => {
    router.setParams({ cat: next ?? "" });
  }, []);

  const [q, setQ] = React.useState("");

  const list = useListings({
    category: selectedCategory ?? undefined,
    q,
  });

  const roots = (cats.data?.categories ?? []).filter((c) => c.active !== false);
  const favIdSet = favIds.data ?? new Set<string>();
  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);

  const onRefresh = () => {
    void list.refetch();
    void cats.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Listings",
          headerLeft: () => <HamburgerButton />,
        }}
      />

      {/* ── Sticky header controls ─────────────────────────── */}
      <View className="px-5 pt-3" style={{ gap: 12 }}>
        <SearchBar value={q} onChange={setQ} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          <Chip
            label="All"
            active={selectedCategory === null}
            onPress={() => setCategory(null)}
          />
          {roots.map((root) => (
            <Chip
              key={root.id}
              label={root.name}
              active={selectedCategory === root.slug}
              onPress={() =>
                setCategory(
                  selectedCategory === root.slug ? null : root.slug,
                )
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Results ────────────────────────────────────────── */}
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
            if (nearBottom && list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          scrollEventThrottle={200}
        >
          {items.length === 0 ? (
            q.trim() ? (
              <EmptyState title="No matches for that search." />
            ) : selectedCategory ? (
              <EmptyState title="No listings in this category yet." />
            ) : (
              <EmptyState title="No businesses listed yet." />
            )
          ) : (
            (() => {
              const { sponsored, regular } = bucketBySlot(items);
              return (
                <>
                  <SlotSection
                    label="Sponsored"
                    texture={SPONSORED_TEXTURE as never}
                    businesses={sponsored}
                    favIds={favIdSet}
                  />
                  <SlotSection
                    label="Regular"
                    texture={REGULAR_TEXTURE as never}
                    businesses={regular}
                    favIds={favIdSet}
                  />
                </>
              );
            })()
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

// ──────────────────────────────────────────────────────────────────────
// Chip

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: active ? CHIP_ACTIVE_BG : CHIP_IDLE_BG,
        borderWidth: 1,
        borderColor: active ? CHIP_ACTIVE_BG : CHIP_BORDER,
      }}
    >
      <Text
        style={{
          color: active ? CHIP_ACTIVE_FG : CHIP_IDLE_FG,
          fontSize: 13,
          fontWeight: active ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
