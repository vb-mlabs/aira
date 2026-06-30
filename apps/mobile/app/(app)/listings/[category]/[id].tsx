import * as React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { AboutCard } from "../../../../features/listings/components/AboutCard";
import { AiraReviewCard } from "../../../../features/listings/components/AiraReviewCard";
import { BusinessHero } from "../../../../features/listings/components/BusinessHero";
import { ContactCard } from "../../../../features/listings/components/ContactCard";
import { EmptyState } from "../../../../features/listings/components/EmptyState";
import { Gallery } from "../../../../features/listings/components/Gallery";
import { useFavoriteIds } from "../../../../features/favorites/hooks";
import { useBusinessDetail } from "../../../../features/listings/hooks";

/**
 * Business detail stack screen — mirrors web's
 * /listings/[category]/[id]/page.tsx. Composes BusinessHero +
 * AboutCard + ContactCard + AiraReviewCard + Gallery, each of which
 * renders nothing when its data is absent (so an empty business
 * doesn't have hollow card frames).
 *
 * The [category] segment is ignored by the fetch — the detail op
 * takes a business id directly — but kept in the URL for parity with
 * web and to make shareable URLs work the same way across surfaces.
 */
export default function BusinessDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const detail = useBusinessDetail(id);
  const favIds = useFavoriteIds();

  const business = detail.data?.business ?? null;
  const headerTitle = business?.name ?? "";

  if (detail.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <Stack.Screen options={{ title: "Loading…" }} />
        <View
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            backgroundColor: "#E2D5BC",
          }}
        />
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          <Skeleton width="70%" height={28} />
          <Skeleton width="50%" height={16} />
          <Skeleton width="100%" height={120} borderRadius={12} />
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState
          title="Business not found."
          description="It may have been removed or is no longer active."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BusinessHero
          business={business}
          isFavorited={favIds.data?.has(business.id) ?? false}
        />
        <View className="mt-5 px-5" style={{ gap: 12 }}>
          <AboutCard description={business.description} />
          <ContactCard business={business} />
          <AiraReviewCard review={business.aira_review} />
        </View>
        {business.images && business.images.length > 0 ? (
          <View className="mt-5">
            <Gallery images={business.images} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
