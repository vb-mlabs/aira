// Dev seed page for features/messages. Creates an idempotent "Dev Partner"
// user + opens a DM with the signed-in user. Use this to exercise both
// sides of the polling loop locally: keep this tab open as yourself, open
// /login in an incognito window and sign in as the partner.
//
// Delete src/app/dev/ before v1 ship.

import Link from "next/link"
import { Button } from "@mlabs/ui-web/button"
import { requireUser } from "@/lib/auth/server"
import { seedDM, seedPartner } from "./_seed-action"

export const metadata = { title: "Dev — seed DM" }
export const dynamic = "force-dynamic"

export default async function DevSeedMessagesPage() {
  const me = await requireUser()
  const { email } = await seedPartner()

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-xl font-semibold">Seed a DM</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as <strong>{me.email}</strong>. A fake partner exists at{" "}
        <strong>{email}</strong> (password: <code>dev-partner-pass-1234</code>).
      </p>
      <form action={seedDM} className="mt-6 flex gap-2">
        <Button type="submit">Send a test DM</Button>
        <Button variant="outline">
          <Link href="/messages">Open inbox</Link>
        </Button>
      </form>
      <p className="mt-8 text-xs text-muted-foreground">
        This route lives under <code>src/app/dev/</code> and is deleted
        before v1 ship.
      </p>
    </main>
  )
}
