// App-side db composition root. Binds the @mlabs/db client factory to the
// app's env. Schema imports come straight from @mlabs/db/schema — no
// re-export through this module.

import { createDb, type Database } from "@mlabs/db/client"
import { env } from "@/config/env"

export const db = createDb({ databaseUrl: () => env.DATABASE_URL })
export type { Database }
