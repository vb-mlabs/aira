"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Clock, Globe, Pencil, Phone, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { brand } from "@aira/config"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { Business } from "@/features/listings"
import { RatingPill } from "@/features/listings/components/rating-pill"
import {
  GoogleMapsPinIcon,
  SocialLinks,
} from "@/features/listings/components/social-icons"
import type { Category } from "@aira/validators/categories"
import { ArchiveControl } from "./archive-control"
import { FeatureImageControl } from "./feature-image-section"
import { GallerySection } from "./gallery-section"
import { PlacesAddressInput } from "./places-address-input"
import { SubscriptionsSection } from "./subscriptions-section"
import { SponsorshipsSection } from "./sponsorships-section"

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

      <CoreFieldsSection business={business} categories={categories} />
      <GallerySection businessId={business.id} images={business.images} />
      <ContactSection business={business} />
      <AiraReviewSection business={business} />
      <SubscriptionsSection businessId={business.id} />
      <SponsorshipsSection businessId={business.id} />
    </div>
  )
}

function CategoryPreview({
  business,
  categories,
}: {
  business: Business
  categories: Category[]
}) {
  const primaryName =
    categories.find((c) => c.slug === business.category)?.name ??
    business.category
  const extras = business.extra_category_ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
        {primaryName}
      </span>
      {extras.map((name) => (
        <span
          key={name}
          className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {name}
        </span>
      ))}
      {extras.length === 0 && (
        <span className="text-xs text-muted-foreground">
          No additional categories
        </span>
      )}
    </div>
  )
}

function CategoryEditModal({
  business,
  categories,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  categories: Category[]
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [category, setCategory] = useState(business.category)
  const [extraIds, setExtraIds] = useState<string[]>(business.extra_category_ids)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleExtra(id: string) {
    setExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function save() {
    setError(null)
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
      if (result?.kind === "error") {
        setError(result.message)
        return
      }
      router.refresh()
      onSaved(result)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  const previewBusiness = {
    ...business,
    category,
    extra_category_ids: extraIds,
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(580px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit categories
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                The business appears in listings for every checked category.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <CategoryPreview
                business={previewBusiness}
                categories={categories}
              />
            </div>

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

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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

function CoreFieldsSection({
  business,
  categories,
}: {
  business: Business
  categories: Category[]
}) {
  const [coreOpen, setCoreOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Core fields</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCoreOpen(true)}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </header>
      <div className="space-y-4 px-6 py-5">
        <CoreFieldsPreview
          business={business}
          categories={categories}
          onEditCategories={() => setCategoryOpen(true)}
        />
        <StatusLine feedback={feedback} />
      </div>
      <CoreFieldsEditModal
        business={business}
        open={coreOpen}
        onClose={() => setCoreOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setCoreOpen(false)
        }}
      />
      <CategoryEditModal
        business={business}
        categories={categories}
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setCategoryOpen(false)
        }}
      />
    </section>
  )
}

function CoreFieldsPreview({
  business,
  categories,
  onEditCategories,
}: {
  business: Business
  categories: Category[]
  onEditCategories: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="w-full overflow-hidden rounded-md border border-border bg-muted/30 sm:w-48 sm:flex-shrink-0">
        {business.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.image_url}
            alt=""
            className="aspect-[1200/630] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[1200/630] w-full items-center justify-center text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="font-display text-lg text-foreground">{business.name}</p>
        {/* Categories live next to the name so admins read placement
            (primary + extras) without scrolling. Edit button opens the
            CategoryEditModal owned by the parent section. */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPreview business={business} categories={categories} />
          <button
            type="button"
            onClick={onEditCategories}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Edit categories"
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </button>
        </div>
        {business.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {business.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No description yet.</p>
        )}
      </div>
    </div>
  )
}

function CoreFieldsEditModal({
  business,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(business.name)
  const [description, setDescription] = useState(business.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        name: name.trim() || null,
        description: description.trim() || null,
      })
      if (result?.kind === "error") {
        setError(result.message)
        return
      }
      router.refresh()
      onSaved(result)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(640px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit core fields
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Name, description, and the feature image (1200×630 cover). Placement
                comes from the business&rsquo;s active paid subscription &mdash; edit
                that in Subscriptions below.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {/* Feature image — the control owns its own upload/remove
                lifecycle (direct fetch + router.refresh()); the modal's
                Save button below only persists name/description/tier. */}
            <div className="space-y-1.5">
              <Label>Feature image</Label>
              <p className="text-xs text-muted-foreground">
                Uploads and removals save immediately.
              </p>
              <FeatureImageControl
                businessId={business.id}
                imageUrl={business.image_url}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-name">Name</Label>
              <Input
                id="b-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-description">Description</Label>
              <Input
                id="b-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ContactSection({ business }: { business: Business }) {
  const [contactOpen, setContactOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const contactEmpty =
    !business.phone &&
    !business.website &&
    !business.address &&
    !business.hours

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Contact</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setContactOpen(true)}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </header>
      <div className="space-y-4 px-6 py-5">
        {/* Social icon row + inline Edit pencil — same component the
            public listing detail page uses, so the admin sees the row
            exactly as it will publish. Edit button opens the
            SocialLinksEditModal owned here. */}
        <div className="flex flex-wrap items-center gap-2">
          <SocialLinks
            facebook_url={business.facebook_url}
            instagram_url={business.instagram_url}
            whatsapp_number={business.whatsapp_number}
            phone={business.phone}
            website={business.website}
            address={business.address}
          />
          <button
            type="button"
            onClick={() => setSocialOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Edit social links"
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </button>
        </div>
        {contactEmpty ? (
          <p className="text-sm text-muted-foreground">
            No contact details yet.
          </p>
        ) : (
          <ContactPreview business={business} />
        )}
        <StatusLine feedback={feedback} />
      </div>
      <ContactEditModal
        business={business}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setContactOpen(false)
        }}
      />
      <SocialLinksEditModal
        business={business}
        open={socialOpen}
        onClose={() => setSocialOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setSocialOpen(false)
        }}
      />
    </section>
  )
}

function ContactPreview({ business }: { business: Business }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {business.address && (
        <ContactPreviewRow icon={GoogleMapsPinIcon}>
          {business.address}
        </ContactPreviewRow>
      )}
      {business.hours && (
        <ContactPreviewRow icon={Clock}>{business.hours}</ContactPreviewRow>
      )}
      {business.phone && (
        <ContactPreviewRow icon={Phone}>{business.phone}</ContactPreviewRow>
      )}
      {business.website && (
        <ContactPreviewRow icon={Globe}>
          {prettyHost(business.website)}
        </ContactPreviewRow>
      )}
    </ul>
  )
}

function ContactPreviewRow({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="text-foreground">{children}</span>
    </li>
  )
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

function ContactEditModal({
  business,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [phone, setPhone] = useState(business.phone ?? "")
  const [website, setWebsite] = useState(business.website ?? "")
  const [address, setAddress] = useState(business.address ?? "")
  const [hours, setHours] = useState(business.hours ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        hours: hours.trim() || null,
      })
      if (result?.kind === "error") {
        setError(result.message)
        return
      }
      router.refresh()
      onSaved(result)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  const previewBusiness = {
    ...business,
    phone: phone.trim() || null,
    website: website.trim() || null,
    address: address.trim() || null,
    hours: hours.trim() || null,
  }
  const previewEmpty =
    !previewBusiness.phone &&
    !previewBusiness.website &&
    !previewBusiness.address &&
    !previewBusiness.hours

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(580px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit contact
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Updates the public listing&rsquo;s contact block.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              {previewEmpty ? (
                <p className="text-sm text-muted-foreground">
                  No contact details yet.
                </p>
              ) : (
                <ContactPreview business={previewBusiness} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-phone">Phone</Label>
              <Input
                id="b-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 404 555 1234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-website">Website</Label>
              <Input
                id="b-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
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
              <Input
                id="b-hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Mon–Fri: 9am–6pm, Sat: 10am–4pm"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function AiraReviewSection({ business }: { business: Business }) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">{brand.name} Review</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </header>
      <div className="space-y-3 px-6 py-5">
        <AiraReviewPreview
          rating={business.rating}
          review={business.aira_review}
        />
        <StatusLine feedback={feedback} />
      </div>
      <AiraReviewEditModal
        business={business}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setOpen(false)
        }}
      />
    </section>
  )
}

function AiraReviewPreview({
  rating,
  review,
}: {
  rating: number | null
  review: string | null
}) {
  const hasRating = rating !== null && rating > 0
  const hasReview = review !== null && review.trim().length > 0
  if (!hasRating && !hasReview) {
    return (
      <p className="text-sm text-muted-foreground">
        No rating or review yet.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {hasRating ? (
        <RatingPill rating={rating!} />
      ) : (
        <p className="text-xs text-muted-foreground">No rating</p>
      )}
      {hasReview ? (
        <p className="whitespace-pre-wrap text-sm text-foreground">{review}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No written review</p>
      )}
    </div>
  )
}

function AiraReviewEditModal({
  business,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  // Empty string represents "No rating" → null on save.
  const [rating, setRating] = useState(
    business.rating === null ? "" : business.rating.toString(),
  )
  const [airaReview, setAiraReview] = useState(business.aira_review ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        rating: rating === "" ? null : Number(rating),
        aira_review: airaReview.trim() || null,
      })
      if (result?.kind === "error") {
        setError(result.message)
        return
      }
      router.refresh()
      onSaved(result)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  const previewRating = rating === "" ? null : Number(rating)

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(620px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit {brand.name} Review
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Both the star rating and the written review show on the
                public detail page.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <AiraReviewPreview rating={previewRating} review={airaReview} />
            </div>

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
                Half-star steps from 0 to 5. Cards and the detail page hide
                the rating entirely when set to &quot;No rating&quot; or 0.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-aira-review">Review</Label>
              <textarea
                id="b-aira-review"
                value={airaReview}
                onChange={(e) => setAiraReview(e.target.value)}
                placeholder="Editorial review shown on the detail page."
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SocialLinksEditModal({
  business,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [facebook, setFacebook] = useState(business.facebook_url ?? "")
  const [instagram, setInstagram] = useState(business.instagram_url ?? "")
  const [whatsapp, setWhatsapp] = useState(business.whatsapp_number ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        facebook_url: facebook.trim() || null,
        instagram_url: instagram.trim() || null,
        whatsapp_number: whatsapp.replace(/\D/g, "") || null,
      })
      if (result?.kind === "error") {
        setError(result.message)
        return
      }
      router.refresh()
      onSaved(result)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit social links
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Updates the public listing&rsquo;s icon row.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {/* Live preview reacts to the inputs below so the admin can
                verify the icon row before saving. */}
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <SocialLinks
                facebook_url={facebook.trim() || null}
                instagram_url={instagram.trim() || null}
                whatsapp_number={whatsapp.replace(/\D/g, "") || null}
                phone={business.phone}
                website={business.website}
                address={business.address}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-facebook">Facebook URL</Label>
              <Input
                id="b-facebook"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/yourbusiness"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-instagram">Instagram URL</Label>
              <Input
                id="b-instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/yourbusiness"
              />
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

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
