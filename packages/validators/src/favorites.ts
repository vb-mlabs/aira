// Business favorites — shared Zod schemas between web, mobile, and the
// /api/v1/favorites/* route handlers.
//
// Two read shapes by design (see plan/review): the slim ids endpoint is
// what listing pages call to decorate cards with their fav state; the full
// items endpoint hydrates the My favorites page.

import { z } from "zod";
import { BusinessSchema } from "./businesses";

export const BusinessFavoriteSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
});
export type BusinessFavorite = z.infer<typeof BusinessFavoriteSchema>;

export const AddFavoriteInputSchema = z
  .object({
    business_id: z.string().min(1),
  })
  .strict();
export type AddFavoriteInput = z.infer<typeof AddFavoriteInputSchema>;

export const RemoveFavoriteInputSchema = z
  .object({
    business_id: z.string().min(1),
  })
  .strict();
export type RemoveFavoriteInput = z.infer<typeof RemoveFavoriteInputSchema>;

export const FavoriteMutationOutputSchema = z.object({
  ok: z.literal(true),
});
export type FavoriteMutationOutput = z.infer<typeof FavoriteMutationOutputSchema>;

export const ListMyFavoritesOutputSchema = z.object({
  items: z.array(BusinessSchema),
});
export type ListMyFavoritesOutput = z.infer<typeof ListMyFavoritesOutputSchema>;

export const ListMyFavoriteIdsOutputSchema = z.object({
  ids: z.array(z.string()),
});
export type ListMyFavoriteIdsOutput = z.infer<typeof ListMyFavoriteIdsOutputSchema>;
