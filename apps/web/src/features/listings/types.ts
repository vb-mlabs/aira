// Listing types moved to @aira/validators/businesses (single source for
// web RSC, web Client Components, mobile, and /api/v1/businesses routes).
// This file re-exports for source-compat — existing imports under
// `@/features/listings` keep working without churn.

export {
  VALID_TIERS,
  type BusinessTier,
  type BusinessCategory,
  type Business,
} from "@aira/validators/businesses"
