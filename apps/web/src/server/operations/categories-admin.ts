import "server-only"

// Super_admin-permission operations for the categories domain. Categories
// are platform-shape taxonomy; only super_admin can mutate.

import { categories as categoriesService } from "@aira/services"
import { businesses as businessesService } from "@aira/services"
import {
  CategoryCreateInputSchema,
  CategoryUpdateInputSchema,
  CategoryReorderInputSchema,
  CategoryTreeOutputSchema,
} from "@aira/validators/categories"
import { ApiError } from "@aira/api"
import { z } from "zod"
import { defineOperation } from "./index"

const CITY_ID = "city-atlanta"

export const listCategoriesAdminOp = defineOperation({
  name: "admin.categories.list",
  input: z.object({ includeInactive: z.coerce.boolean().optional() }).strict(),
  output: CategoryTreeOutputSchema,
  permission: "super_admin",
  handler: async (db, _ctx, { includeInactive }) => {
    const all = await categoriesService.getCategoriesByCity(db, CITY_ID, {
      includeInactive: includeInactive ?? true,
    })
    const roots = all.filter((c) => c.level === 1)
    const tree = roots.map((root) => ({
      root,
      children: all.filter((c) => c.parent_id === root.id),
    }))
    return { tree }
  },
})

export const createCategoryOp = defineOperation({
  name: "admin.categories.create",
  input: CategoryCreateInputSchema,
  output: z.object({ category: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, input) => {
    const slug =
      input.slug ??
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    const category = await categoriesService.createCategory(db, {
      city_id: input.city_id,
      name: input.name,
      slug,
      parent_id: input.parent_id ?? null,
      active: input.active ?? true,
    })
    return { category }
  },
})

export const updateCategoryOp = defineOperation({
  name: "admin.categories.update",
  input: CategoryUpdateInputSchema,
  output: z.object({ category: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id, ...data }) => {
    const category = await categoriesService.updateCategory(db, id, data)
    if (!category)
      throw ApiError.notFound("categories.not_found", "Category not found")
    return { category }
  },
})

export const deactivateCategoryOp = defineOperation({
  name: "admin.categories.deactivate",
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ category: z.any(), affected_businesses: z.number().int() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id }) => {
    // Count businesses currently using this category slug
    const cat = await categoriesService.getCategoriesByCity(db, CITY_ID, {
      includeInactive: true,
    })
    const target = cat.find((c) => c.id === id)
    let affected_businesses = 0
    if (target) {
      const result = await businessesService.getBusinessesByCategory(
        db,
        target.slug,
      )
      affected_businesses = result.length
    }
    const category = await categoriesService.deactivateCategory(db, id)
    if (!category)
      throw ApiError.notFound("categories.not_found", "Category not found")
    return { category, affected_businesses }
  },
})

export const reorderCategoriesOp = defineOperation({
  name: "admin.categories.reorder",
  input: CategoryReorderInputSchema,
  output: z.object({ ok: z.boolean() }),
  permission: "super_admin",
  handler: async (db, _ctx, { city_id, ordered_ids }) => {
    await categoriesService.reorderCategories(db, city_id, ordered_ids)
    return { ok: true }
  },
})
