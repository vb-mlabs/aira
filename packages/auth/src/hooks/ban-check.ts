import "server-only"

// Last-line defense against banned users acquiring a fresh session. The ban
// transaction (features/admin/server/actions.banUser) also deletes existing
// sessions, so this hook only matters for new sign-in attempts after a ban.

import { eq } from "drizzle-orm"
import { APIError } from "better-auth/api"
import type { Database } from "@mlabs/db/client"
import { user as defaultUserTable } from "@mlabs/db/schema"

export interface CreateBanCheckHookOptions {
  db: Database
  userTable?: typeof defaultUserTable
}

interface SessionCreateInput {
  userId: string
}

export function createBanCheckHook({
  db,
  userTable = defaultUserTable,
}: CreateBanCheckHookOptions) {
  return async function beforeSessionCreate(
    session: SessionCreateInput,
  ): Promise<void> {
    const [u] = await db
      .select({ banned_at: userTable.banned_at })
      .from(userTable)
      .where(eq(userTable.id, session.userId))
      .limit(1)
    if (u?.banned_at) {
      throw new APIError("FORBIDDEN", { message: "Account banned" })
    }
  }
}
