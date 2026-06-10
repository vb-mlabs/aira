// Businesses domain — public surface.
//
// Cross-domain callers (ops, other services) import from here. Operations
// at apps/web/src/server/operations/businesses.ts wrap these into REST
// endpoints under /api/v1/businesses (consumed by both web RSC via
// apiServerFetch and mobile via apiClient).

export {
  getFeaturedBusinesses,
  getBusinessesByCategory,
  getBusinessesByCategoryPaged,
  getAllBusinesses,
  getBusinessById,
  getBusinessByIdIncludingArchived,
  countActiveBusinesses,
} from "./queries";
export type {
  PagedBusinessesInput,
  PagedBusinessesResult,
} from "./queries";

export {
  updateBusiness,
  archiveBusiness,
  restoreBusiness,
  purgeArchivedBusinesses,
} from "./service";

export {
  addBusinessImage,
  removeBusinessImage,
  listBusinessImages,
} from "./image-mutations";
