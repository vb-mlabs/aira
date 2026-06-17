// Businesses domain — public surface.
//
// Cross-domain callers (ops, other services) import from here. Operations
// at apps/web/src/server/operations/businesses.ts wrap these into REST
// endpoints under /api/v1/businesses (consumed by both web RSC via
// apiServerFetch and mobile via apiClient).

export {
  createBusiness,
  getFeaturedBusinesses,
  getBusinessesByCategory,
  getBusinessesByCategoryPaged,
  getAllBusinessesPaged,
  getAllBusinesses,
  getBusinessById,
  getBusinessByIdIncludingArchived,
  countActiveBusinesses,
  getBusinessOwner,
  getBusinessesOwnedBy,
  getBusinessOwnerLookup,
} from "./queries";
export type {
  PagedBusinessesInput,
  AllBusinessesPagedInput,
  PagedBusinessesResult,
} from "./queries";

export {
  updateBusiness,
  archiveBusiness,
  restoreBusiness,
  purgeArchivedBusinesses,
  setBusinessFeatureImage,
  clearBusinessFeatureImage,
  assignBusinessOwner,
  unassignBusinessOwner,
} from "./service";
export type {
  AssignBusinessOwnerArgs,
  AssignBusinessOwnerResult,
} from "./service";

export {
  addBusinessImage,
  removeBusinessImage,
  listBusinessImages,
} from "./image-mutations";
