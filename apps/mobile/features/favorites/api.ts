// Mobile favorites API — thin wrappers around the shared /api/v1/favorites/*
// surface used by the web app. Server ops are idempotent (addFavorite is
// ON CONFLICT DO NOTHING, removeFavorite is DELETE-by-id) so rapid double-
// taps can't break state.

import { apiDelete, apiGet, apiPost } from "../../lib/api/client";
import type {
  Business,
  FavoriteMutationOutput,
} from "@aira/validators";

/** POST /api/v1/favorites — add a business to the user's favorites. */
export async function addFavorite(
  businessId: string,
): Promise<FavoriteMutationOutput> {
  return apiPost<FavoriteMutationOutput>("/api/v1/favorites", {
    business_id: businessId,
  });
}

/** DELETE /api/v1/favorites/{business_id} — unfavorite. */
export async function removeFavorite(businessId: string): Promise<void> {
  await apiDelete(`/api/v1/favorites/${encodeURIComponent(businessId)}`);
}

/** GET /api/v1/favorites/mine — full Business[] for the favorites screen. */
export async function listMyFavorites(): Promise<{ items: Business[] }> {
  const res = await apiGet<{ items: Business[] }>(
    "/api/v1/favorites/mine",
  );
  return res.data ?? { items: [] };
}

/** GET /api/v1/favorites/mine/ids — id array for the heart-state Set. */
export async function listMyFavoriteIds(): Promise<{ ids: string[] }> {
  const res = await apiGet<{ ids: string[] }>(
    "/api/v1/favorites/mine/ids",
  );
  return res.data ?? { ids: [] };
}
