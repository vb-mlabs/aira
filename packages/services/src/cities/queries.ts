import { asc, eq } from "drizzle-orm";
import { cities } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { City, CityCreateInput, CityUpdateInput } from "@aira/validators/cities";

export async function listCities(db: Database): Promise<City[]> {
  const rows = await db
    .select()
    .from(cities)
    .orderBy(asc(cities.sort_order), asc(cities.name));
  return rows.map(toCity);
}

export async function getCityBySlug(
  db: Database,
  slug: string,
): Promise<City | null> {
  const [row] = await db
    .select()
    .from(cities)
    .where(eq(cities.slug, slug))
    .limit(1);
  return row ? toCity(row) : null;
}

export async function createCity(
  db: Database,
  input: CityCreateInput,
): Promise<City> {
  // Normalize any admin-supplied slug through slugify() too, not just
  // the derived-from-name fallback. Postgres text-unique is byte-exact,
  // so without normalization "Atlanta" and "atlanta" would coexist as
  // two rows — the unique constraint doesn't fire on case difference.
  // slugify() is idempotent for already-well-formed slugs so this is
  // safe when the admin typed the correct value.
  const slug = slugify(input.slug ?? input.name);
  const [row] = await db
    .insert(cities)
    .values({ name: input.name, slug, active: input.active ?? true })
    .returning();
  if (!row) throw new Error("createCity: insert returned no row");
  return toCity(row);
}

export async function updateCity(
  db: Database,
  id: string,
  data: Omit<CityUpdateInput, "id">,
): Promise<City | null> {
  // Same case-normalization as createCity — an update path could
  // otherwise re-introduce the duplicate by editing an existing row's
  // slug to a different-case variant of another row's slug.
  const patch = {
    ...data,
    ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
    updated_at: new Date(),
  };
  const [row] = await db
    .update(cities)
    .set(patch)
    .where(eq(cities.id, id))
    .returning();
  return row ? toCity(row) : null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCity(row: typeof cities.$inferSelect): City {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    sort_order: row.sort_order,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
