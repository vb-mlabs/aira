// Category service — counts (existing) + full DB-backed CRUD.

import { asc, eq, inArray, sql } from "drizzle-orm";
import { businesses, categories } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { Category } from "@aira/validators/categories";
import type { CategoryTreeOutput } from "@aira/validators/categories";

// ── Count helpers (existing) ─────────────────────────────────────────────────

export async function getBusinessCountsByCategory(
  db: Database,
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      category: businesses.category,
      count: sql<number>`count(*)::int`,
    })
    .from(businesses)
    .groupBy(businesses.category);

  return Object.fromEntries(rows.map((r) => [r.category, r.count]));
}

// ── Read queries ─────────────────────────────────────────────────────────────

export async function getCategoriesByCity(
  db: Database,
  cityId: string,
  opts: { includeInactive?: boolean } = {},
): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(
      opts.includeInactive
        ? eq(categories.city_id, cityId)
        : sql`${categories.city_id} = ${cityId} AND ${categories.active} = true`,
    )
    .orderBy(asc(categories.level), asc(categories.sort_order), asc(categories.name));
  return rows.map(toCategory);
}

export async function getCategoryTree(
  db: Database,
  cityId: string,
): Promise<CategoryTreeOutput["tree"]> {
  const all = await getCategoriesByCity(db, cityId, { includeInactive: true });
  const roots = all.filter((c) => c.level === 1);
  return roots.map((root) => ({
    root,
    children: all.filter((c) => c.parent_id === root.id),
  }));
}

export async function getCategoryBySlug(
  db: Database,
  slug: string,
): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(sql`${categories.slug} = ${slug} AND ${categories.active} = true`)
    .limit(1);
  return row ? toCategory(row) : null;
}

export async function getRootCategoriesForCity(
  db: Database,
  cityId: string,
): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(
      sql`${categories.city_id} = ${cityId} AND ${categories.level} = 1 AND ${categories.active} = true`,
    )
    .orderBy(asc(categories.sort_order), asc(categories.name));
  return rows.map(toCategory);
}

// ── Write queries ────────────────────────────────────────────────────────────

export async function createCategory(
  db: Database,
  input: {
    city_id: string;
    name: string;
    slug: string;
    parent_id?: string | null;
    active?: boolean;
  },
): Promise<Category> {
  const level = input.parent_id ? 2 : 1;
  const [row] = await db
    .insert(categories)
    .values({
      city_id: input.city_id,
      name: input.name,
      slug: input.slug,
      parent_id: input.parent_id ?? null,
      level,
      active: input.active ?? true,
    })
    .returning();
  if (!row) throw new Error("createCategory: insert returned no row");
  return toCategory(row);
}

export async function updateCategory(
  db: Database,
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    parent_id: string | null;
    active: boolean;
    sort_order: number;
  }>,
): Promise<Category | null> {
  // `level` must agree with `parent_id` (DB check constraint
  // category_parent_level_check). When parent_id changes we recompute
  // level: null parent => root (1), non-null => subcategory (2).
  const patch: typeof data & { level?: number } = { ...data };
  if (data.parent_id !== undefined) {
    patch.level = data.parent_id === null ? 1 : 2;
  }
  const [row] = await db
    .update(categories)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(categories.id, id))
    .returning();
  return row ? toCategory(row) : null;
}

export async function deactivateCategory(
  db: Database,
  id: string,
): Promise<Category | null> {
  return updateCategory(db, id, { active: false });
}

export async function reorderCategories(
  db: Database,
  cityId: string,
  orderedIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(categories)
        .set({ sort_order: i, updated_at: new Date() })
        .where(
          sql`${categories.id} = ${orderedIds[i]} AND ${categories.city_id} = ${cityId}`,
        );
    }
  });
}

// ── Mapper ───────────────────────────────────────────────────────────────────

function toCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    city_id: row.city_id,
    parent_id: row.parent_id,
    name: row.name,
    slug: row.slug,
    level: row.level,
    sort_order: row.sort_order,
    active: row.active,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
