// Exercises @mlabs/* bare + subpath imports.
import { db } from "@mlabs/db/client"
import { schema } from "@mlabs/db/schema"
import { requireUser } from "@mlabs/auth/server"
import { services } from "@mlabs/services"

export function init() {
  return { db, schema, requireUser, services }
}
