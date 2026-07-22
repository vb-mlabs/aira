import * as React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../../../components/ui/Button";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { AboutCard } from "../../../../features/listings/components/AboutCard";
import { AiraReviewCard } from "../../../../features/listings/components/AiraReviewCard";
import { BusinessHero } from "../../../../features/listings/components/BusinessHero";
import { ContactCard } from "../../../../features/listings/components/ContactCard";
import { EmptyState } from "../../../../features/listings/components/EmptyState";
import { Gallery } from "../../../../features/listings/components/Gallery";
import { useFavoriteIds } from "../../../../features/favorites/hooks";
import { useBusinessDetail } from "../../../../features/listings/hooks";
import { BackButton } from "../../../../components/nav/BackButton";
import { TopBar } from "../../../../components/nav/TopBar";
import { useOriginAwareBack } from "../../../../lib/nav/useOriginAwareBack";

// Hex matches the secondaryForeground token (#301d0d) so the
// arrow-left glyph composes against the secondary Button bg with the
// same color as the label text. NativeWind's className → color
// pipeline doesn't reach into @expo/vector-icons' `color` prop, so
// we hand off a literal hex. Update if design tokens shift.
const SECONDARY_FG_HEX = "#301d0d";

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
  const params = useLocalSearchParams<{ id: string; from?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const from = typeof params.from === "string" ? params.from : undefined;
  const detail = useBusinessDetail(id);
  const favIds = useFavoriteIds();

  // Intercept OS-level back gestures (iOS edge-swipe, Android hardware
  // back, header chevron pop) so they honour the same origin-aware
  // routing as the tap-based back buttons below.
  useOriginAwareBack();

  // Prefer router.dismissTo(from): pops back to `from` if it's in the
  // current stack (preserving state), or falls forward to `from` as
  // a fresh screen if not (deep-link entry). dismissTo stays within
  // the current tab and is scoped to the current stack, so it
  // sidesteps the cross-tab back-history hazards that broke previous
  // approaches. Matches components/nav/BackButton.tsx.
  const goBack = React.useCallback(() => {
    if (from) {
      router.dismissTo(from as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)" as never);
  }, [from]);

  const business = detail.data?.business ?? null;
  const headerTitle = business?.name ?? "";

  if (detail.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <TopBar title="Loading…" left={<BackButton />} />
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
        <TopBar title="Not found" left={<BackButton />} />
        <EmptyState
          title="Business not found."
          description="It may have been removed or is no longer active."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title={headerTitle} left={<BackButton />} />
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
        {/* Bottom Go-back affordance — matches web's
            apps/web/src/features/listings/components/business-detail.tsx:196-204
            shadcn Button with ArrowLeft glyph. Centered, self-width
            (NOT fullWidth) so it reads as a control, not a CTA.
            Additive to the Stack header chevron + iOS swipe-back /
            Android system back — exists for users who scrolled the
            full page and don't think to reach for the chevron. */}
        <View className="mt-8 items-center">
          <Button
            variant="secondary"
            accessibilityLabel="Go back to previous screen"
            onPress={goBack}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={16}
              color={SECONDARY_FG_HEX}
            />
            {"  Go back"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
