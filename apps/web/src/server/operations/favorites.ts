import "server-only"

// Favorites operations.
//
// Two read shapes by design (see review): the slim ids endpoint feeds card
// decoration on listing surfaces; the full items endpoint hydrates the My
// favorites page. Mutations are fully idempotent — re-favoriting or
// unfavoriting a row that's already in/out of the table returns success
// with no DB write (the unique index + ON CONFLICT DO NOTHING on insert
// and the unfiltered DELETE pattern handle the rest).

import { favorites as favoritesService } from "@aira/services"
import {
  AddFavoriteInputSchema,
  RemoveFavoriteInputSchema,
  FavoriteMutationOutputSchema,
  ListMyFavoritesOutputSchema,
  ListMyFavoriteIdsOutputSchema,
  type AddFavoriteInput,
  type RemoveFavoriteInput,
} from "@aira/validators/favorites"
import { z } from "zod"
import { defineOperation } from "./index"

export const addFavoriteOp = defineOperation({
  name: "favorites.add",
  input: AddFavoriteInputSchema,
  output: FavoriteMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, input: AddFavoriteInput) => {
    await favoritesService.addFavorite(db, ctx.userId, input.business_id)
    return { ok: true as const }
  },
})

export const removeFavoriteOp = defineOperation({
  name: "favorites.remove",
  input: RemoveFavoriteInputSchema,
  output: FavoriteMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, input: RemoveFavoriteInput) => {
    await favoritesService.removeFavorite(db, ctx.userId, input.business_id)
    return { ok: true as const }
  },
})

export const listMyFavoritesOp = defineOperation({
  name: "favorites.listMine",
  input: z.object({}).strict(),
  output: ListMyFavoritesOutputSchema,
  permission: "user",
  handler: async (db, ctx) => {
    const items = await favoritesService.listMyFavorites(db, ctx.userId)
    return { items }
  },
})

export const listMyFavoriteIdsOp = defineOperation({
  name: "favorites.listMineIds",
  input: z.object({}).strict(),
  output: ListMyFavoriteIdsOutputSchema,
  permission: "user",
  handler: async (db, ctx) => {
    const ids = await favoritesService.listMyFavoriteIds(db, ctx.userId)
    return { ids }
  },
})
