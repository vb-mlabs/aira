import { redirect } from "next/navigation"

// /admin/settings has no content of its own — it's the entry point into a
// tabbed hub. Land on Categories (first tab) so super_admins never see an
// empty container. Matches /admin's "always land on something useful" idiom.
export default function AdminSettingsIndexPage() {
  redirect("/admin/settings/categories")
}
