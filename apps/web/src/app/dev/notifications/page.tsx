// Dev seed page — drops a test notification into the current user's inbox.
// Until features/admin (W8) ships its "send notification" tool, this is how
// you exercise the bell + inbox locally. Visit while signed in.
//
// Delete src/app/dev/ before v1 ship.

import Link from "next/link"
import { Button } from "@mlabs/ui-web/button"
import { requireUser } from "@/lib/auth/server"
import { seedTestNotification } from "./_seed-action"

export const metadata = { title: "Dev — seed notification" }
export const dynamic = "force-dynamic"

export default async function DevSeedNotificationsPage() {
  const me = await requireUser()

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-xl font-semibold">Seed a test notification</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as <strong>{me.email}</strong>. Each click creates one
        notification in your inbox. The bell polls every 5 seconds.
      </p>
      <form action={seedTestNotification} className="mt-6 flex gap-2">
        <Button type="submit">Create one</Button>
        <Button variant="outline">
          <Link href="/notifications">Open inbox</Link>
        </Button>
      </form>
      <p className="mt-8 text-xs text-muted-foreground">
        This route lives under <code>src/app/dev/</code> and is deleted
        before v1 ship.
      </p>
    </main>
  )
}
