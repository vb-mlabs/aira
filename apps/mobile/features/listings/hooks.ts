// Mobile listings hooks — thin TanStack Query wrappers around the listings
// API. Cache keys are namespaced ["listings", ...] so future invalidations
// (e.g. P2 favorites toggle) can hit one prefix.

import { useQuery } from "@tanstack/react-query";
import { listBusinesses, getBusinessCount } from "./api";

const FEATURED_LIMIT = 6;

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
