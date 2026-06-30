// Mobile favorites hooks — three TanStack wrappers covering the two
// read paths (Set for card render lookup, rows for the favorites
// screen) and the optimistic toggle.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addFavorite,
  listMyFavoriteIds,
  listMyFavorites,
  removeFavorite,
} from "./api";

const IDS_KEY = ["favorites", "ids"] as const;
const ROWS_KEY = ["favorites", "mine"] as const;

/** Favorited-ids Set keyed by businessId. Used by Home / Listings /
 *  Detail to render the heart-filled state on each BusinessCard +
 *  BusinessHero. `select` transforms the wire `{ ids: string[] }`
 *  into a Set so callers get O(1) `.has(id)` lookup.
 *
 *  staleTime 1 minute — warm during a browse session, cheap to
 *  re-fetch on tab swap. */
export function useFavoriteIds() {
  return useQuery({
    queryKey: IDS_KEY,
    queryFn: listMyFavoriteIds,
    select: (data) => new Set(data.ids),
    staleTime: 60_000,
  });
}

/** Full favorited-rows array for the /account/favorites screen. */
export function useFavorites() {
  return useQuery({
    queryKey: ROWS_KEY,
    queryFn: listMyFavorites,
    staleTime: 60_000,
  });
}

/** Optimistic favorite/unfavorite toggle. Caller passes the
 *  currentlyFavorited boolean (read from the ids Set) — the hook
 *  branches internally to add vs remove.
 *
 *  Flow (mirrors useCreateComment from P2a):
 *    onMutate: cancel in-flight ids queries, snapshot cache,
 *      optimistically flip the Set membership.
 *    onError: roll back to snapshot.
 *    onSettled: invalidate BOTH ids + rows caches so the
 *      /account/favorites screen reflects the change on next mount.
 *
 *  Server ops are idempotent so rapid double-tap can't break state;
 *  TanStack queues serial mutations by default. */
export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      businessId: string;
      currentlyFavorited: boolean;
    }) => {
      if (args.currentlyFavorited) {
        await removeFavorite(args.businessId);
      } else {
        await addFavorite(args.businessId);
      }
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: IDS_KEY });
      const prev = qc.getQueryData<{ ids: string[] }>(IDS_KEY);
      qc.setQueryData<{ ids: string[] }>(IDS_KEY, (old) => {
        const current = old?.ids ?? [];
        const next = args.currentlyFavorited
          ? current.filter((id) => id !== args.businessId)
          : current.includes(args.businessId)
            ? current
            : [...current, args.businessId];
        return { ids: next };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(IDS_KEY, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: IDS_KEY });
      void qc.invalidateQueries({ queryKey: ROWS_KEY });
    },
  });
}
