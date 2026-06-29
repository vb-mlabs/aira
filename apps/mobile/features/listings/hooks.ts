// Mobile listings hooks — thin TanStack Query wrappers around the listings
// API. Cache keys are namespaced ["listings", ...] so future invalidations
// (e.g. P2 favorites toggle) can hit one prefix.

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  listBusinesses,
  getBusinessById,
  getBusinessCount,
  getCategoryBySlug,
  listCategories,
} from "./api";

const FEATURED_LIMIT = 6;
const LISTINGS_PAGE_SIZE = 12;

/** Featured Businesses tile on Home — tier1+tier2 ordered by tier, then by
 *  sponsorship state. Service-side ordering; mobile just renders the list. */
export function useFeatured() {
  return useQuery({
    queryKey: ["listings", "featured", FEATURED_LIMIT],
    queryFn: () => listBusinesses({ featured: true, limit: FEATURED_LIMIT }),
    staleTime: 60_000,
  });
}

/** Businesses Listed stat-card count. */
export function useBusinessCount() {
  return useQuery({
    queryKey: ["listings", "count"],
    queryFn: getBusinessCount,
    staleTime: 60_000,
  });
}

/** Root categories for the Categories tab + listings switcher.
 *  Filters at render time to active=true. */
export function useCategories() {
  return useQuery({
    queryKey: ["listings", "categories"],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
}

/** Single category for the listings-screen header. */
export function useCategory(slug: string | undefined) {
  return useQuery({
    queryKey: ["listings", "category", slug],
    queryFn: () => getCategoryBySlug(slug as string),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

/** Paginated infinite scroll over /listings/[category] with optional
 *  keyword search + verified filter. fetchNextPage is wired to FlatList
 *  onEndReached in the screen. */
export function useListings(params: {
  category: string | undefined;
  q?: string;
  verified?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: [
      "listings",
      "businesses",
      params.category,
      params.q ?? "",
      params.verified ?? false,
    ],
    enabled: !!params.category,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listBusinesses({
        category: params.category as never,
        q: params.q?.trim() ? params.q.trim() : undefined,
        verified: params.verified ? true : undefined,
        page: pageParam as number,
        pageSize: LISTINGS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const seen = lastPage.page * lastPage.pageSize;
      return seen < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

/** Single business detail. */
export function useBusinessDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["listings", "business", id],
    queryFn: () => getBusinessById(id as string),
    enabled: !!id,
  });
}
