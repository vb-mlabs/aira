"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { Business } from "@/features/listings"
import type { Category } from "@aira/validators/categories"
import { ArchiveControl } from "./archive-control"
import { GallerySection } from "./gallery-section"
import { PlacesAddressInput } from "./places-address-input"

interface BusinessAdminDetailProps {
  business: Business
  categories?: Category[]
}

type Feedback = { kind: "ok" | "error"; message: string } | null

interface UpdateResult {
  business: Business
}

async function runUpdate(
  id: string,
  data: Record<string, string | number | null | string[]>,
): Promise<Feedback> {
  try {
    await apiClient.patch<UpdateResult>(
      `/api/v1/admin/businesses/${id}`,
      { id, ...data },
    )
    return { kind: "ok", message: "Saved." }
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof ApiError ? err.message : "Could not save changes.",
    }
  }
}

export function BusinessAdminDetail({ business, categories = [] }: BusinessAdminDetailProps) {
  const archived = business.deleted_at !== null
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {business.name}
            </h1>
            {archived && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Archived
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">{business.id}</p>
        </div>
        <ArchiveControl business={business} />
      </header>

      <CoreFieldsSection business={business} />
      <CategorySection business={business} categories={categories} />
      <GallerySection businessId={business.id} images={business.images} />
      <ContactSection business={business} />
      <RatingSection business={business} />
      <SocialLinksSection business={business} />
      <EditorialSection business={business} />
    </div>
  )
}

function CategorySection({
  business,
  categories,
}: {
  business: Business
  categories: Category[]
}) {
  const router = useRouter()
  const [category, setCategory] = useState(business.category)
  const [extraIds, setExtraIds] = useState<string[]>(business.extra_category_ids)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function toggleExtra(id: string) {
    setExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function save() {
    startTransition(async () => {
      // Strip the primary category from extras to avoid a redundant join row.
      const primaryCat = categories.find((c) => c.slug === category)
      const cleanedExtras = primaryCat
        ? extraIds.filter((id) => id !== primaryCat.id)
        : extraIds
      const result = await runUpdate(business.id, {
        category,
        extra_category_ids: cleanedExtras,
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Categories</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-category">Primary category</Label>
          <select
            id="b-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {categories.length === 0 && (
              <option value={category}>{category}</option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {categories.length > 0 && (
          <div className="space-y-1.5">
            <Label>Additional categories</Label>
            <p className="text-xs text-muted-foreground">
              Business appears in listings for each checked category.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {categories.map((c) => {
                const isExtra = extraIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={isExtra}
                      onChange={() => toggleExtra(c.id)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <span>{c.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

const RATING_OPTIONS = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
]

function RatingSection({ business }: { business: Business }) {
  const router = useRouter()
  // Empty string represents "No rating" → null on save.
  const [rating, setRating] = useState(
    business.rating === null ? "" : business.rating.toString(),
  )
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        rating: rating === "" ? null : Number(rating),
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Rating</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-rating">Star rating</Label>
          <select
            id="b-rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">No rating</option>
            {RATING_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Half-star steps from 0 to 5. Cards and detail page hide the rating
            entirely when set to &quot;No rating&quot; or 0.
          </p>
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

function CoreFieldsSection({ business }: { business: Business }) {
  const router = useRouter()
  const [name, setName] = useState(business.name)
  const [description, setDescription] = useState(business.description ?? "")
  const [tier, setTier] = useState(business.tier)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        name: name.trim() || null,
        description: description.trim() || null,
        tier,
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Core fields</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-name">Name</Label>
          <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-description">Description</Label>
          <Input id="b-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-tier">Tier</Label>
          <select
            id="b-tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as Business["tier"])}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="tier1">Tier 1</option>
            <option value="tier2">Tier 2</option>
            <option value="tier3">Tier 3</option>
          </select>
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

function ContactSection({ business }: { business: Business }) {
  const router = useRouter()
  const [phone, setPhone] = useState(business.phone ?? "")
  const [website, setWebsite] = useState(business.website ?? "")
  const [address, setAddress] = useState(business.address ?? "")
  const [hours, setHours] = useState(business.hours ?? "")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        hours: hours.trim() || null,
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Contact</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-phone">Phone</Label>
          <Input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 404 555 1234" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-website">Website</Label>
          <Input id="b-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-address">Address</Label>
          <PlacesAddressInput
            id="b-address"
            value={address}
            onChange={setAddress}
            placeholder="123 Main St, Atlanta, GA 30301"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-hours">Hours</Label>
          <Input id="b-hours" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon–Fri: 9am–6pm, Sat: 10am–4pm" />
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

function EditorialSection({ business }: { business: Business }) {
  const router = useRouter()
  const [airaReview, setAiraReview] = useState(business.aira_review ?? "")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        aira_review: airaReview.trim() || null,
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Editorial</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-aira-review">AIRA Review</Label>
          <textarea
            id="b-aira-review"
            value={airaReview}
            onChange={(e) => setAiraReview(e.target.value)}
            placeholder="Editorial review shown on the detail page."
            rows={5}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

function SocialLinksSection({ business }: { business: Business }) {
  const router = useRouter()
  const [facebook, setFacebook] = useState(business.facebook_url ?? "")
  const [instagram, setInstagram] = useState(business.instagram_url ?? "")
  const [whatsapp, setWhatsapp] = useState(business.whatsapp_number ?? "")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        facebook_url: facebook.trim() || null,
        instagram_url: instagram.trim() || null,
        whatsapp_number: whatsapp.replace(/\D/g, "") || null,
      })
      setFeedback(result)
      if (result?.kind === "ok") router.refresh()
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Social links</h2>
      </header>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="b-facebook">Facebook URL</Label>
          <Input id="b-facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourbusiness" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-instagram">Instagram URL</Label>
          <Input id="b-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourbusiness" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-whatsapp">WhatsApp number</Label>
          <Input
            id="b-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Include country code, e.g. 14045551234"
          />
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <StatusLine feedback={feedback} />
      </div>
    </section>
  )
}

function StatusLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p
      className={
        feedback.kind === "ok"
          ? "text-sm text-muted-foreground"
          : "text-sm text-destructive"
      }
      role={feedback.kind === "error" ? "alert" : undefined}
    >
      {feedback.message}
    </p>
  )
}
