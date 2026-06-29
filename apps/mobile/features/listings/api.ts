// Mobile listings API — thin wrappers around apiGet that hit the shared
// /api/v1/* surface used by the web app. Output shapes echo
// BusinessListOutputSchema / BusinessCountOutputSchema from @aira/validators;
// the route handler validates with Zod at the server boundary, so we don't
// re-parse here.

import { apiGet } from "../../lib/api/client";
import type {
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
