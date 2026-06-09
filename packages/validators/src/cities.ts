import { z } from "zod";

export const CitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  active: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type City = z.infer<typeof CitySchema>;

export const CityCreateInputSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    active: z.boolean().default(true),
  })
  .strict();
export type CityCreateInput = z.infer<typeof CityCreateInputSchema>;

export const CityUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    active: z.boolean().optional(),
    sort_order: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CityUpdateInput = z.infer<typeof CityUpdateInputSchema>;

export const CityListOutputSchema = z.object({
  cities: z.array(CitySchema),
});
export type CityListOutput = z.infer<typeof CityListOutputSchema>;
