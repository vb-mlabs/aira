"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { City } from "@aira/validators/cities"
import type { Business } from "@aira/validators/businesses"
import {
  VALID_CATEGORIES,
  VALID_TIERS,
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
}

interface CreateResult {
  business: Business
}

export function BusinessCreateForm({ cities }: BusinessCreateFormProps) {
  const router = useRouter()

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [category, setCategory] = useState<string>(VALID_CATEGORIES[0])
  const [tier, setTier] = useState<string>("tier3")
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [cityId, setCityId] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [yearsOperating, setYearsOperating] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [facebookUrl, setFacebookUrl] = useState("")
  const [website, setWebsite] = useState("")
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
            category,
            tier,
            description: description.trim() || null,
            phone: phone.trim() || null,
            address: address.trim() || null,
            city_id: cityId || null,
            business_type: businessType || null,
            years_operating: yearsOperating || null,
            instagram_url: instagramUrl.trim() || null,
            facebook_url: facebookUrl.trim() || null,
            website: website.trim() || null,
            whatsapp_number: whatsappNumber.trim() || null,
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
      {/* Section 1: Identity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Identity
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-name">Name *</Label>
          <Input
            id="bc-name"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. The Corner Café"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-slug">Slug *</Label>
          <Input
            id="bc-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. the-corner-cafe"
            required
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated from name. Must be lowercase kebab-case and unique.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-category">Category *</Label>
          <select
            id="bc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            required
          >
            {VALID_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-tier">Tier *</Label>
          <select
            id="bc-tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            required
          >
            {VALID_TIERS.map((t) => (
              <option key={t} value={t}>
                {t === "tier1" ? "Tier 1" : t === "tier2" ? "Tier 2" : "Tier 3"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Section 2: Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Details
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="bc-description">Description</Label>
          <textarea
            id="bc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown on cards and the detail page."
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-phone">Phone</Label>
          <Input
            id="bc-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 404 555 1234"
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

      {/* Section 3: Business profile */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Business profile
        </h3>
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
        <div className="space-y-1.5">
          <Label htmlFor="bc-instagram">Instagram URL</Label>
          <Input
            id="bc-instagram"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourbusiness"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-facebook">Facebook URL</Label>
          <Input
            id="bc-facebook"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/yourbusiness"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-website">Website</Label>
          <Input
            id="bc-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-whatsapp">WhatsApp number</Label>
          <Input
            id="bc-whatsapp"
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

      <div className="flex gap-3">
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
