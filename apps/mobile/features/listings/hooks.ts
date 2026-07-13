// Mobile listings hooks — thin TanStack Query wrappers around the listings
// API. Cache keys are namespaced ["listings", ...] so future invalidations
// (e.g. P2 favorites toggle) can hit one prefix.

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  listBusinesses,
  getBusinessById,
  getBusinessCount,
  getCategoryBySlug,
  getMyListings,
  listCategories,
} from "./api";

const FEATURED_LIMIT = 5;
const LISTINGS_PAGE_SIZE = 12;

/** Featured Businesses tile on Home — 5 businesses drawn at random from
 *  the strict sponsored pool (any category). Server clamps limit at 5,
 *  and orders by `random()`, so pull-to-refresh may rotate the set. */
export function useFeatured() {
  return useQuery({
    queryKey: ["listings", "featured", FEATURED_LIMIT],
    queryFn: () => listBusinesses({ featured: true, limit: FEATURED_LIMIT }),
    staleTime: 60_000,
  });
}

/** Featured Businesses section on a primary (level-1) category page — up
 *  to 5 businesses drawn at random from the sponsored pool scoped to
 *  this category. Server-side clamps limit at 5. Separate cache key from
 *  useFeatured so navigating between the two doesn't reuse the wrong
 *  set. Enabled only when a slug is provided. */
export function useFeaturedForCategory(slug: string | undefined) {
  return useQuery({
    queryKey: ["listings", "featured", "category", slug, FEATURED_LIMIT],
    queryFn: () =>
      listBusinesses({
        featured: true,
        category: slug as string,
        limit: FEATURED_LIMIT,
      }),
    enabled: !!slug,
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
  // undefined category = all-listings query. The /api/v1/businesses route
  // treats an omitted `category` param as "return all"; drop the enabled
  // gate so the All-Listings tab screen can fire without a slug. The
  // [category] route always passes a slug from the route param, so this
  // remains a pure superset for existing callers.
  return useInfiniteQuery({
    queryKey: [
      "listings",
      "businesses",
      params.category,
      params.q ?? "",
      params.verified ?? false,
    ],
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

/** Businesses the current user owns. Drives /account/listings. */
export function useMyListings() {
  return useQuery({
    queryKey: ["listings", "mine"],
    queryFn: getMyListings,
    staleTime: 60_000,
  });
}
