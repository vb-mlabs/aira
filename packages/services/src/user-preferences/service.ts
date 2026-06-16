import "server-only"

// User preferences domain — the binary toggles surfaced on
// /account/notifications. Pure service (db, ctx, args). Authorization is
// implicit: every read/write scopes to ctx.userId, so there is no surface
// for reading or mutating someone else's preferences.
//
// Why columns on `user` (not a separate user_preferences table): only two
// toggles today; one extra row on every requireUser() lookup isn't worth
// the join. If the toggle count crosses ~5 (e.g. a marketing-email
// matrix), migrate to a dedicated table.

import { eq } from "drizzle-orm"
import { user } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import type {
  UpdateUserPreferencesInput,
  UserPreferences,
} from "@aira/validators"
import { ApiError } from "@aira/api"

export async function getPreferences(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<{ preferences: UserPreferences }> {
  const [row] = await db
    .select({
      email_on_message_received: user.email_on_message_received,
      email_on_post_interest: user.email_on_post_interest,
    })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)

  if (!row) {
    // Session referenced a user that no longer exists — caller can route
    // the 401 to /login. Same shape as users.getProfile in the existing op.
    throw ApiError.unauthorized()
  }
  return { preferences: row }
}

export async function updatePreferences(
  db: Database,
  ctx: CallerContext,
  args: UpdateUserPreferencesInput,
): Promise<{ preferences: UserPreferences }> {
  // No-op short-circuit: an empty PATCH body is a valid request that
  // doesn't write — read-and-return so the response shape is consistent.
  const updateSet: Partial<UserPreferences> = {}
  if (args.email_on_message_received !== undefined) {
    updateSet.email_on_message_received = args.email_on_message_received
  }
  if (args.email_on_post_interest !== undefined) {
    updateSet.email_on_post_interest = args.email_on_post_interest
  }

  if (Object.keys(updateSet).length === 0) {
    return getPreferences(db, ctx)
  }

  const [row] = await db
    .update(user)
    .set(updateSet)
    .where(eq(user.id, ctx.userId))
    .returning({
      email_on_message_received: user.email_on_message_received,
      email_on_post_interest: user.email_on_post_interest,
    })

  if (!row) {
    throw ApiError.unauthorized()
  }
  return { preferences: row }
}
