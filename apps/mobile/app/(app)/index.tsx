import * as React from "react";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { brand } from "@aira/config";
import { Skeleton } from "../../components/ui/Skeleton";
import { BusinessCard } from "../../features/listings/components/BusinessCard";
import { StatCard } from "../../features/listings/components/StatCard";
import { useFavoriteIds } from "../../features/favorites/hooks";
import {
  useBusinessCount,
  useFeatured,
} from "../../features/listings/hooks";

/**
 * Mobile Home tab — structural mirror of apps/web/src/app/(app)/home/page.tsx.
 *
 * Layout (top to bottom):
 *   1. Tree-of-life logo (140x140 centered)
 *   2. AIRA wordmark (text-primary; web's vertical gradient via bg-clip-text
 *      is deferred per the review's "wordmark gradient on RN" open question)
 *   3. Tagline caption ("ROOTS · REACH")
 *   4. About title + body from brand.homepage
 *   5. Two stat cards side-by-side: Businesses Listed (live) + Community Members
 *   6. Featured Businesses list (max 6, hidden when empty)
 *
 * Pull-to-refresh re-fetches both featured + count.
 */

const TAGLINE_CAPTION = brand.tagline.split(" & ").join(" · ");

export default function HomeScreen() {
  const featured = useFeatured();
  const count = useBusinessCount();
  const favIds = useFavoriteIds();

  const onRefresh = React.useCallback(() => {
    void featured.refetch();
    void count.refetch();
  }, [featured, count]);

  const isRefreshing = featured.isFetching || count.isFetching;

  const bizCount = count.data?.count ?? 0;
  const bizCountDisplay = bizCount > 0 ? `${bizCount}+` : "—";
  const featuredItems = featured.data?.items ?? [];

  // No SafeAreaView — the Tabs navigator's cream header handles the
  // top inset and the tab bar handles the bottom inset on this screen.
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Logo + wordmark + tagline */}
        <View className="items-center">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 140, height: 140 }}
            accessibilityLabel={`${brand.name} tree-of-life logo`}
          />
          <Text
            accessibilityRole="header"
            className="mt-2 font-display text-5xl font-bold text-primary"
          >
            {brand.name}
          </Text>
          <Text
            className="mt-2 text-xs font-bold uppercase text-foreground"
            style={{ letterSpacing: 3 }}
          >
            {TAGLINE_CAPTION}
          </Text>
        </View>

        {/* About */}
        <View className="mt-10 items-center">
          <Text className="text-center font-display text-2xl text-foreground">
            {brand.homepage.aboutTitle}
          </Text>
          <Text
            className="mt-3 text-center text-sm leading-relaxed text-foreground"
            style={{ opacity: 0.8 }}
          >
            {brand.homepage.aboutBody}
          </Text>
        </View>

        {/* Stats */}
        <View className="mt-8 flex-row" style={{ gap: 12 }}>
          {count.isLoading ? (
            <>
              <View className="flex-1">
                <Skeleton width="100%" height={70} borderRadius={12} />
              </View>
              <View className="flex-1">
                <Skeleton width="100%" height={70} borderRadius={12} />
              </View>
            </>
          ) : (
            <>
              <StatCard value={bizCountDisplay} label="Businesses Listed" />
              <StatCard
                value={brand.homepage.communityMembers}
                label="Community Members"
              />
            </>
          )}
        </View>

        {/* Featured Businesses — hidden when empty (matches web behavior) */}
        {featuredItems.length > 0 ? (
          <View className="mt-12">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-xl text-foreground">
                Featured Businesses
              </Text>
            </View>
            <View className="mt-4" style={{ gap: 12 }}>
              {featuredItems.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  isFavorited={favIds.data?.has(business.id) ?? false}
                />
              ))}
            </View>
          </View>
        ) : featured.isLoading ? (
          <View className="mt-12" style={{ gap: 12 }}>
            <Skeleton width="60%" height={24} />
            <Skeleton width="100%" height={96} borderRadius={12} />
            <Skeleton width="100%" height={96} borderRadius={12} />
            <Skeleton width="100%" height={96} borderRadius={12} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
