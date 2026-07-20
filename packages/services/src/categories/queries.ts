// Category service — counts (existing) + full DB-backed CRUD.

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { businesses, categories } from "@aira/db/schema";

// Same visibility gate the public business queries apply: a business
// counts only when it has an active (paid or pending), in-window
// subscription. Inlined here to keep the categories module independent
// of businesses/queries internals, mirroring the favorites/queries.ts
// precedent — extract only if a fourth site appears.
const VISIBLE = sql`EXISTS (
  SELECT 1 FROM business_subscription bs
  WHERE bs.business_id = businesses.id
  AND bs.payment_status IN ('paid', 'pending')
  AND now() BETWEEN bs.start_date AND bs.end_date
)`;
import type { Database } from "@aira/db/client";
import { createAudit, type AuditClient } from "@aira/db/audit";
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
    .where(and(isNull(businesses.deleted_at), VISIBLE))
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

export interface UpdateCategoryWithCascadeInput {
  id: string;
  data: Partial<{
    name: string;
    slug: string;
    parent_id: string | null;
    active: boolean;
    sort_order: number;
  }>;
  actorUserId: string;
  auditClient?: AuditClient;
}

export interface UpdateCategoryWithCascadeResult {
  category: Category | null;
  affectedBusinessIds: string[];
}

/** Update a category and, when the slug changes, cascade the new slug to
 *  every `businesses.category` row that still points at the old value —
 *  all in one transaction. Emits one `business.category_slug_cascaded`
 *  audit row per affected business so history stays intact.
 *
 *  Replaces the old `assertSlugRenameAllowed` guard which blocked slug
 *  changes as soon as any business referenced the old slug. That
 *  behaviour trapped admins whose only next step was to hand-edit every
 *  affected row (with no bulk-reassign UI). The cascade solves the
 *  intent — "rename this category and take the businesses with it" —
 *  without giving up the invariant that no business points at a dead
 *  slug.
 *
 *  Row-locks the category via `.for("update")` so two concurrent
 *  renames serialise: the second transaction waits, sees the new slug,
 *  and its cascade step no-ops (0 businesses match the now-stale slug
 *  it was going to rename from). */
export async function updateCategoryWithCascade(
  db: Database,
  input: UpdateCategoryWithCascadeInput,
): Promise<UpdateCategoryWithCascadeResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(categories)
      .where(eq(categories.id, input.id))
      .for("update")
      .limit(1);
    if (!current) return { category: null, affectedBusinessIds: [] };

    // Same level/parent_id recompute as updateCategory — DB check
    // constraint category_parent_level_check enforces the pairing.
    const patch: typeof input.data & { level?: number; updated_at?: Date } = {
      ...input.data,
      updated_at: new Date(),
    };
    if (input.data.parent_id !== undefined) {
      patch.level = input.data.parent_id === null ? 1 : 2;
    }

    const [updated] = await tx
      .update(categories)
      .set(patch)
      .where(eq(categories.id, input.id))
      .returning();
    if (!updated) return { category: null, affectedBusinessIds: [] };

    const slugChanged =
      input.data.slug !== undefined && input.data.slug !== current.slug;
    if (!slugChanged) {
      return { category: toCategory(updated), affectedBusinessIds: [] };
    }

    const nextSlug = input.data.slug!;
    const affectedRows = await tx
      .update(businesses)
      .set({ category: nextSlug })
      .where(eq(businesses.category, current.slug))
      .returning({ id: businesses.id });
    const affectedBusinessIds = affectedRows.map((r) => r.id);

    if (affectedBusinessIds.length > 0) {
      const audit = createAudit(tx);
      for (const bizId of affectedBusinessIds) {
        await audit({
          actorId: input.actorUserId,
          action: "business.category_slug_cascaded",
          target: { type: "business", id: bizId },
          meta: {
            kind: "business.category_slug_cascaded",
            from: current.slug,
            to: nextSlug,
          },
          client: input.auditClient ?? "web",
        });
      }
    }

    return { category: toCategory(updated), affectedBusinessIds };
  });
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
