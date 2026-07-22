"use client"

import { Fragment, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { City } from "@aira/validators/cities"
import type { CategoryTreeOutput } from "@aira/validators/categories"
import type { Business } from "@aira/validators/businesses"
import {
  VALID_BUSINESS_TYPES,
  VALID_YEARS_OPERATING,
} from "@aira/validators/businesses"
import { PlacesAddressInput } from "./places-address-input"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  storefront: "Storefront",
  home_based: "Home-based",
  service_at_client: "Service at client location",
  online_only: "Online only",
  mixed: "Mixed",
}

const YEARS_OPERATING_LABELS: Record<string, string> = {
  under_1: "Under 1 year",
  "1_to_3": "1–3 years",
  "3_to_5": "3–5 years",
  "5_plus": "5+ years",
}

interface BusinessCreateFormProps {
  cities: City[]
  /** Active root→children category tree for the current city, fetched
   *  server-side via listCategoriesTreeOp and pre-filtered upstream so
   *  inactive branches are already dropped. Businesses can only pick a
   *  level-2 (subcategory) as their primary — the service layer
   *  enforces this too. */
  categoryTree: CategoryTreeOutput["tree"]
}

interface CreateResult {
  business: Business
}

export function BusinessCreateForm({
  cities,
  categoryTree,
}: BusinessCreateFormProps) {
  const router = useRouter()

  // Flattened subs across every root — used both to seed the primary
  // category state to the first available sub and to gate the empty-
  // state affordance ("No subcategories yet …").
  const allSubs = categoryTree.flatMap(({ children }) => children)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [category, setCategory] = useState<string>(allSubs[0]?.slug ?? "")
  const [description, setDescription] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [yearsOperating, setYearsOperating] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [address, setAddress] = useState("")
  const [cityId, setCityId] = useState("")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    setSlug(slugify(val))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await apiClient.post<CreateResult>(
          "/api/v1/admin/businesses",
          {
            name: name.trim(),
            slug: slug.trim(),
            contact_person: contactPerson.trim() || null,
            category,
            description: description.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
            city_id: cityId || null,
            business_type: businessType || null,
            years_operating: yearsOperating || null,
            instagram_url: instagramUrl.trim() || null,
            facebook_url: facebookUrl.trim() || null,
            website: website.trim() || null,
            // Strip non-digits so the WhatsApp wa.me/<digits> link works
            // on day-one. Matches the edit modal's save path.
            whatsapp_number: whatsappNumber.replace(/\D/g, "") || null,
          },
        )
        router.push(`/admin/businesses/${result.business.id}`)
        router.refresh()
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to create business."
        setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Basics
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-name">Name *</Label>
          <Input
            id="bc-name"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. The Corner Café"
            required
            autoFocus
          />
        </div>
        {/* Slug is hidden from the form — auto-derived from name via
            slugify() above and POSTed as part of the create payload. */}
        <div className="space-y-1.5">
          <Label htmlFor="bc-contact-person">Contact person</Label>
          <Input
            id="bc-contact-person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Priya Krishnamurthy"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-category">Category *</Label>
          {allSubs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No subcategories exist yet.{" "}
              <Link
                href="/admin/settings/categories/new"
                className="text-primary hover:underline"
              >
                Add one →
              </Link>
              <br />
              Businesses can only be assigned to subcategories, never to
              primary categories.
            </p>
          ) : (
            <>
              <select
                id="bc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                {categoryTree.map(({ root, children }) =>
                  children.length > 0 ? (
                    <optgroup key={root.id} label={root.name}>
                      {children.map((child) => (
                        <option key={child.id} value={child.slug}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    // Roots with no active children render nothing —
                    // Safari renders empty labelled clusters as stray
                    // headings so we deliberately drop them.
                    <Fragment key={root.id} />
                  ),
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                Only subcategories are selectable. Need a new one?{" "}
                <Link
                  href="/admin/settings/categories/new"
                  className="text-primary hover:underline"
                >
                  Add a subcategory →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* About */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          About
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-description">Description</Label>
          <textarea
            id="bc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown on cards and the detail page."
            rows={4}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-business-type">Business type</Label>
          <select
            id="bc-business-type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— select —</option>
            {VALID_BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUSINESS_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-years">Years operating</Label>
          <select
            id="bc-years"
            value={yearsOperating}
            onChange={(e) => setYearsOperating(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— select —</option>
            {VALID_YEARS_OPERATING.map((y) => (
              <option key={y} value={y}>
                {YEARS_OPERATING_LABELS[y] ?? y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Contact */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Contact
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-phone">Phone</Label>
          <Input
            id="bc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 404 555 1234"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-website">Website</Label>
          <Input
            id="bc-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-address">Address</Label>
          <PlacesAddressInput
            id="bc-address"
            value={address}
            onChange={setAddress}
            placeholder="123 Main St, Atlanta, GA 30301"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-city">City</Label>
          <select
            id="bc-city"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— no city —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Social */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Social
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-facebook">Facebook URL</Label>
          <Input
            id="bc-facebook"
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/yourbusiness"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-instagram">Instagram URL</Label>
          <Input
            id="bc-instagram"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourbusiness"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-whatsapp">WhatsApp number</Label>
          <Input
            id="bc-whatsapp"
            type="tel"
            inputMode="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="Include country code, e.g. 14045551234"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Sticky save bar — sits flush against the modal's bottom edge.
          Requires AdminFormModal's body div to have no bottom padding
          (pt-5, not py-5) so `sticky bottom-0` positions the border-box
          bottom exactly at the modal's inner edge. Negative -mx-6
          cancels the modal body's horizontal padding so the divider
          runs edge-to-edge. */}
      <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-border bg-card px-6 py-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create business"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/businesses")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
