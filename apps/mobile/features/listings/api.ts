// Mobile listings API — thin wrappers around apiGet that hit the shared
// /api/v1/* surface used by the web app. Output shapes echo
// BusinessListOutputSchema / BusinessCountOutputSchema from @aira/validators;
// the route handler validates with Zod at the server boundary, so we don't
// re-parse here.

import { apiGet } from "../../lib/api/client";
import type {
  Business,
  BusinessListInput,
  BusinessListOutput,
  Category,
} from "@aira/validators";

export interface BusinessCountResult {
  count: number;
}

export interface CategoryListResult {
  categories: Category[];
}

/** GET /api/v1/businesses with input as query string. Encodes optional
 *  filters: featured, category, q, page, pageSize, verified. */
export async function listBusinesses(
  input: BusinessListInput
): Promise<BusinessListOutput> {
  const query: Record<string, string | number | boolean | undefined> = {
    featured: input.featured ? true : undefined,
    category: input.category,
    limit: input.limit,
    q: input.q,
    page: input.page,
    pageSize: input.pageSize,
    verified: input.verified ? true : undefined,
  };
  const res = await apiGet<BusinessListOutput>("/api/v1/businesses", { query });
  if (!res.data) {
    return { items: [], total: 0, page: 1, pageSize: 12 };
  }
  return res.data;
}

/** GET /api/v1/businesses/count — total active (non-archived) businesses. */
export async function getBusinessCount(): Promise<BusinessCountResult> {
  const res = await apiGet<BusinessCountResult>("/api/v1/businesses/count");
  return res.data ?? { count: 0 };
}

/** GET /api/v1/categories — root categories for the configured city. */
export async function listCategories(): Promise<CategoryListResult> {
  const res = await apiGet<CategoryListResult>("/api/v1/categories");
  return res.data ?? { categories: [] };
}

/** GET /api/v1/categories/:slug — single category for the listings screen
 *  header (and 404 detection). */
export async function getCategoryBySlug(
  slug: string,
): Promise<{ category: Category } | null> {
  try {
    const res = await apiGet<{ category: Category }>(
      `/api/v1/categories/${encodeURIComponent(slug)}`,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

/** GET /api/v1/account/listings — businesses owned by the current user.
 *  Used by /account/listings on mobile (mirrors web's /account/listings
 *  page; returns the full Business[] not a denormalised owner projection). */
export async function getMyListings(): Promise<{ items: Business[] }> {
  const res = await apiGet<{ items: Business[] }>(
    "/api/v1/account/listings",
  );
  return res.data ?? { items: [] };
}

/** GET /api/v1/businesses/:id — single business detail page. Returns null
 *  when the row is archived or unknown. */
export async function getBusinessById(
  id: string,
): Promise<{ business: Business } | null> {
  try {
    const res = await apiGet<{ business: Business }>(
      `/api/v1/businesses/${encodeURIComponent(id)}`,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}
