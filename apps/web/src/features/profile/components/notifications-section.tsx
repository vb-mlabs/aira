import Link from "next/link"
import { Button } from "@mlabs/ui-web/button"
import { SectionCard } from "./section-card"

// Profile shortcut to the inbox. Preference toggles (email-on/off, per-type
// subscriptions) are not in v1 scope — every transactional/system event ships
// to the inbox until a real preference need surfaces.
export function NotificationsSection() {
  return (
    <SectionCard
      title="Notifications"
      description="Your in-app inbox shows recent activity that needs your attention."
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Transactional emails (verification, password reset, email change
          confirmation) are always sent.
        </p>
        <Button variant="outline">
          <Link href="/notifications">Open inbox</Link>
        </Button>
      </div>
    </SectionCard>
  )
}
