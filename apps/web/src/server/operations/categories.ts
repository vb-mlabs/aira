import "server-only"

// Categories operations — public surface.

import { categories as categoriesService } from "@aira/services"
import {
  CategoriesCountsInputSchema,
  CategoriesCountsOutputSchema,
  CategoriesRootsOutputSchema,
  CategoryTreeOutputSchema,
} from "@aira/validators/categories"
import { z } from "zod"
import { defineOperation } from "./index"

const CITY_ID = "city-atlanta"

export const listCategoriesWithCountsOp = defineOperation({
  name: "categories.listWithCounts",
  input: CategoriesCountsInputSchema,
  output: CategoriesCountsOutputSchema,
  permission: "user",
  handler: async (db) => {
    const counts = await categoriesService.getBusinessCountsByCategory(db)
    return { counts }
  },
})

export const listCategoriesOp = defineOperation({
  name: "categories.list",
  input: z.object({}),
  output: z.object({ categories: z.array(z.any()) }),
  permission: "user",
  handler: async (db) => {
    const items = await categoriesService.getRootCategoriesForCity(db, CITY_ID)
    return { categories: items }
  },
})

export const listCategoriesRootsOp = defineOperation({
  name: "categories.listRoots",
  input: z.object({}),
  output: CategoriesRootsOutputSchema,
  permission: "user",
  handler: async (db) => {
    const [items, counts] = await Promise.all([
      categoriesService.getRootCategoriesForCity(db, CITY_ID),
      categoriesService.getBusinessCountsByCategory(db),
    ])
    return { categories: items, counts }
  },
})

export const listCategoriesTreeOp = defineOperation({
  name: "categories.tree",
  input: z.object({}),
  output: CategoryTreeOutputSchema,
  permission: "user",
  handler: async (db) => {
    const tree = await categoriesService.getCategoryTree(db, CITY_ID)
    return { tree }
  },
})

export const getCategoryBySlugOp = defineOperation({
  name: "categories.getBySlug",
  input: z.object({ slug: z.string().min(1) }).strict(),
  output: z.object({ category: z.any().nullable() }),
  permission: "user",
  handler: async (db, _ctx, { slug }) => {
    const category = await categoriesService.getCategoryBySlug(db, slug)
    return { category }
  },
})
