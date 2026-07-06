// @vitest-environment node
//
// Covers the slug-rename cascade in updateCategoryWithCascade. Replaces
// the 2026-06-15-vintage assertSlugRenameAllowed guard which blocked
// renames whenever any business referenced the old slug. The cascade
// updates both the category row AND every affected businesses.category
// row inside one transaction, and emits one
// business.category_slug_cascaded audit row per affected business.

import { describe, it, expect, beforeEach, vi } from "vitest"

interface CategoryRow {
  id: string
  city_id: string
  parent_id: string | null
  name: string
  slug: string
  level: number
  sort_order: number
  active: boolean
  created_at: Date
  updated_at: Date
}

interface BusinessRow {
  id: string
  category: string
}

interface AuditRow {
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
}

interface MockState {
  categories: CategoryRow[]
  businesses: BusinessRow[]
  audits: AuditRow[]
}

let state: MockState

function makeTx(state: MockState) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          for: () => ({
            limit: async () => state.categories.slice(0, 1),
          }),
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => {
        // Discriminate on which table we're updating by inspecting a
        // token unique to each — the mock is hand-rolled, so we use
        // a stub property set by our mock schema.
        return {
          where: () => ({
            returning: (_fields?: unknown) => {
              const tableName = (table as { __mockName?: string }).__mockName
              if (tableName === "categories") {
                // Return the merged row WITHOUT mutating state.categories
                // so the subsequent businesses filter still sees the
                // pre-rename slug (matches how RETURNING works before the
                // real transaction commits).
                const row = state.categories[0]
                if (!row) return Promise.resolve([])
                const merged = { ...row, ...patch }
                return Promise.resolve([merged])
              }
              // businesses branch — filter by the still-current slug on
              // state.categories[0] (the previous branch didn't mutate).
              const affected = state.businesses.filter(
                (b) => b.category === state.categories[0]?.slug,
              )
              affected.forEach((b) => {
                b.category = String(patch.category)
              })
              return Promise.resolve(affected.map((b) => ({ id: b.id })))
            },
          }),
        }
      },
    }),
    insert: (_table: unknown) => ({
      values: async (row: Record<string, unknown>) => {
        state.audits.push(row as unknown as AuditRow)
      },
    }),
  }
}

// Mock the drizzle schema so the SQL builders don't try to resolve real
// pg-core objects.
vi.mock("@aira/db/schema", () => ({
  categories: { __mockName: "categories" },
  businesses: { __mockName: "businesses" },
  businessImages: {},
  businessCategories: {},
  businessSubscriptions: {},
  user: {},
}))

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("drizzle-orm")
  return {
    ...actual,
    eq: () => "eq-clause",
    sql: Object.assign(
      (strings: TemplateStringsArray, ..._values: unknown[]) => strings.join(""),
      { raw: (s: string) => s },
    ),
    asc: () => "asc-clause",
    desc: () => "desc-clause",
    isNull: () => "isnull-clause",
    inArray: () => "inarray-clause",
    and: () => "and-clause",
    or: () => "or-clause",
    count: () => "count-clause",
    getTableColumns: () => ({}),
    ilike: () => "ilike-clause",
    relations: () => ({}),
  }
})

import { updateCategoryWithCascade } from "@aira/services/categories"

function makeDb(state: MockState) {
  const tx = makeTx(state)
  return {
    transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(tx),
  } as unknown as Parameters<typeof updateCategoryWithCascade>[0]
}

const NOW = new Date("2026-07-06T00:00:00Z")

beforeEach(() => {
  state = {
    categories: [
      {
        id: "cat-atl-restaurants",
        city_id: "city-atlanta",
        parent_id: null,
        name: "Restaurants",
        slug: "restaurants",
        level: 1,
        sort_order: 0,
        active: true,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    businesses: [],
    audits: [],
  }
})

describe("updateCategoryWithCascade", () => {
  it("name-only rename: no cascade, no audit rows", async () => {
    state.businesses = [
      { id: "biz-1", category: "restaurants" },
      { id: "biz-2", category: "restaurants" },
    ]
    const result = await updateCategoryWithCascade(makeDb(state), {
      id: "cat-atl-restaurants",
      data: { name: "Food" },
      actorUserId: "user-admin",
    })
    expect(result.category?.name).toBe("Food")
    expect(result.affectedBusinessIds).toEqual([])
    expect(state.audits).toHaveLength(0)
    // Businesses untouched.
    expect(state.businesses.every((b) => b.category === "restaurants")).toBe(true)
  })

  it("slug rename with 0 affected businesses: 0 audit rows", async () => {
    state.businesses = [] // no rows reference the slug
    const result = await updateCategoryWithCascade(makeDb(state), {
      id: "cat-atl-restaurants",
      data: { slug: "food" },
      actorUserId: "user-admin",
    })
    expect(result.category?.slug).toBe("food")
    expect(result.affectedBusinessIds).toEqual([])
    expect(state.audits).toHaveLength(0)
  })

  it("slug rename with N affected businesses: N audit rows, all rows updated", async () => {
    state.businesses = [
      { id: "biz-1", category: "restaurants" },
      { id: "biz-2", category: "restaurants" },
      { id: "biz-3", category: "restaurants" },
    ]
    const result = await updateCategoryWithCascade(makeDb(state), {
      id: "cat-atl-restaurants",
      data: { slug: "food" },
      actorUserId: "user-admin",
    })
    expect(result.category?.slug).toBe("food")
    expect(result.affectedBusinessIds).toEqual(["biz-1", "biz-2", "biz-3"])
    expect(state.businesses.every((b) => b.category === "food")).toBe(true)
    expect(state.audits).toHaveLength(3)
    // Each audit row is well-formed with from/to inside metadata.
    for (const row of state.audits) {
      expect(row.action).toBe("business.category_slug_cascaded")
      expect(row.target_type).toBe("business")
      expect(row.actor_id).toBe("user-admin")
      const meta = row.metadata as { kind: string; from: string; to: string }
      expect(meta.kind).toBe("business.category_slug_cascaded")
      expect(meta.from).toBe("restaurants")
      expect(meta.to).toBe("food")
    }
  })

  it("returns { category: null, affectedBusinessIds: [] } when id is unknown", async () => {
    state.categories = [] // simulate the SELECT returning nothing
    const result = await updateCategoryWithCascade(makeDb(state), {
      id: "cat-does-not-exist",
      data: { slug: "food" },
      actorUserId: "user-admin",
    })
    expect(result.category).toBeNull()
    expect(result.affectedBusinessIds).toEqual([])
    expect(state.audits).toHaveLength(0)
  })

  it("audit client defaults to 'web' when not supplied", async () => {
    state.businesses = [{ id: "biz-1", category: "restaurants" }]
    await updateCategoryWithCascade(makeDb(state), {
      id: "cat-atl-restaurants",
      data: { slug: "food" },
      actorUserId: "user-admin",
      // no auditClient
    })
    expect(state.audits[0]?.metadata).toMatchObject({ client: "web" })
  })

  it("audit client is passed through when 'mobile'", async () => {
    state.businesses = [{ id: "biz-1", category: "restaurants" }]
    await updateCategoryWithCascade(makeDb(state), {
      id: "cat-atl-restaurants",
      data: { slug: "food" },
      actorUserId: "user-admin",
      auditClient: "mobile",
    })
    expect(state.audits[0]?.metadata).toMatchObject({ client: "mobile" })
  })
})
