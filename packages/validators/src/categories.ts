import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  city_id: z.string(),
  parent_id: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  level: z.number().int().min(1).max(2),
  sort_order: z.number().int().nonnegative(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CategoryCreateInputSchema = z
  .object({
    city_id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    parent_id: z.string().nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();
export type CategoryCreateInput = z.infer<typeof CategoryCreateInputSchema>;

export const CategoryUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    parent_id: z.string().nullable().optional(),
    active: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateInputSchema>;

export const CategoryReorderInputSchema = z
  .object({
    city_id: z.string().min(1),
    ordered_ids: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type CategoryReorderInput = z.infer<typeof CategoryReorderInputSchema>;

export const CategoryTreeOutputSchema = z.object({
  tree: z.array(
    z.object({
      root: CategorySchema,
      children: z.array(CategorySchema),
    }),
  ),
});
export type CategoryTreeOutput = z.infer<typeof CategoryTreeOutputSchema>;

/** Map of category slug to its current visible business count. */
export const CategoriesCountsInputSchema = z
  .object({
    withCounts: z.coerce.boolean().optional(),
  })
  .strict();
export type CategoriesCountsInput = z.infer<typeof CategoriesCountsInputSchema>;

export const CategoriesCountsOutputSchema = z.object({
  counts: z.record(z.string(), z.number().int().min(0)),
});
export type CategoriesCountsOutput = z.infer<typeof CategoriesCountsOutputSchema>;

/** Root categories + per-slug visible-business counts in one round-trip.
 *  Drives the mobile Categories tab (and any future client that needs
 *  both shapes together) so HTTP callers don't have to make two requests
 *  or fall back to in-process ops. */
export const CategoriesRootsOutputSchema = z.object({
  categories: z.array(CategorySchema),
  counts: z.record(z.string(), z.number().int().min(0)),
});
export type CategoriesRootsOutput = z.infer<typeof CategoriesRootsOutputSchema>;
