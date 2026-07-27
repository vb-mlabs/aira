import "server-only"

// Users domain — read paths. Currently just the community-member count
// for the /home stat card; grows as more admin/user read surfaces land.

import { and, count, isNull, notLike, eq } from "drizzle-orm"
import { user as userTable } from "@aira/db/schema"
import type { Database } from "@aira/db/client"

/**
 * Count of "community members" — the number a fresh end user sees on the
 * /home stat card. Definition:
 *
 *   - role = 'end_user' (excludes admins + super_admins; they're staff)
 *   - banned_at IS NULL (banned users don't count towards community size)
 *   - email NOT LIKE 'deleted-%@example.invalid' (excludes anonymized
 *     rows left behind by users.deleteAccount — the row stays for audit
 *     FK integrity but the person is gone)
 *
 * Kept deliberately conservative — this is a stat card headline number,
 * so leaning inclusive is fine but the three exclusions above are the
 * ones a reasonable person would draw when told "how many members are
 * in the community right now."
 */
export async function countCommunityMembers(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "end_user"),
        isNull(userTable.banned_at),
        notLike(userTable.email, "deleted-%@example.invalid"),
      ),
    )
  return Number(row?.value ?? 0)
}
