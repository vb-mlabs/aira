// Businesses domain — public surface.
//
// Cross-domain callers (ops, other services) import from here. Operations
// at apps/web/src/server/operations/businesses.ts wrap these into REST
// endpoints under /api/v1/businesses (consumed by both web RSC via
// apiServerFetch and mobile via apiClient).

export {
  createBusiness,
  getFeaturedRandom,
  getFeaturedRandomForCategory,
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
  // Public projection helpers — exported so sibling services (e.g. favorites)
  // can hydrate Business rows without duplicating the mapper / N+1 logic.
  attachRelations,
  toBusiness,
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
  setBusinessLogo,
  clearBusinessLogo,
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
