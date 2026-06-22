// Favorites domain — public surface.
//
// Operations at apps/web/src/server/operations/favorites.ts wrap these into
// REST endpoints under /api/v1/favorites.

export {
  addFavorite,
  removeFavorite,
  listMyFavorites,
  listMyFavoriteIds,
} from "./queries";
