"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { BadgeCheck, ChevronLeft, ChevronRight, Clock, Globe, Pencil, Phone, Plus, Sparkles, Star, X } from "lucide-react"
import Link from "next/link"
import { ApiError } from "@aira/api"
import { brand } from "@aira/config"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import { PhoneInput } from "./phone-input"
import { fromWhatsappE164, toWhatsappE164 } from "../lib/whatsapp"
import type { Business } from "@/features/listings"
import type { BusinessAdmin } from "@aira/validators/businesses"
import { RatingPill } from "@/features/listings/components/rating-pill"
import {
  GoogleMapsPinIcon,
  SocialLinks,
} from "@/features/listings/components/social-icons"
import {
  VALID_BUSINESS_TYPES,
  VALID_YEARS_OPERATING,
  type BusinessOwner,
} from "@aira/validators/businesses"
import type { Category, CategoryTreeOutput } from "@aira/validators/categories"
import type { City } from "@aira/validators/cities"
import { ArchiveControl } from "./archive-control"
import { BusinessOwnerSection } from "./business-owner-section"
import { FeatureImageControl } from "./feature-image-section"
import { GalleryControl } from "./gallery-section"
import { PlacesAddressInput } from "./places-address-input"
import { SubscriptionsSection } from "./subscriptions-section"
import { SponsorshipsSection } from "./sponsorships-section"

interface BusinessAdminDetailProps {
  business: BusinessAdmin
  owner?: BusinessOwner | null
  categories?: Category[]
  /** Active root→children tree used by CategoryEditModal to render
   *  <optgroup>s. Pre-filtered upstream (page) so inactive branches
   *  are already dropped — see /admin/businesses/[id]/page.tsx. */
  categoryTree: CategoryTreeOutput["tree"]
  cities?: City[]
}

// Human labels for Business profile selects. Duplicated from
// business-create-form.tsx so the two surfaces stay self-contained;
// extract to a shared module if a third caller needs them.
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

type Feedback = { kind: "ok" | "error"; message: string } | null

interface UpdateResult {
  business: Business
}

async function runUpdate(
  id: string,
  data: Record<string, string | number | boolean | null | string[]>,
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

export function BusinessAdminDetail({
  business,
  owner = null,
  categories = [],
  categoryTree,
  cities = [],
}: BusinessAdminDetailProps) {
  const archived = business.deleted_at !== null
  return (
    <div className="space-y-6">
      {/* Back link to the businesses list. Sidebar nav exists too, but a
          dedicated "<- Businesses" link is the affordance admins reach for
          on a detail screen, matching the /account sub-page pattern. */}
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Businesses
      </Link>
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

      <CoreFieldsSection
        business={business}
        categories={categories}
        categoryTree={categoryTree}
        cities={cities}
      />
      <BusinessOwnerSection
        businessId={business.id}
        businessName={business.name}
        owner={owner}
      />
      <ContactSection business={business} />
      <AiraReviewSection business={business} />
      <SubscriptionsSection businessId={business.id} />
      <SponsorshipsSection
        businessId={business.id}
        businessCategoryNames={deriveBusinessCategoryNames(business, categories)}
      />
    </div>
  )
}

/**
 * The names of every category this business is currently listed in — primary
 * (business.category slug) plus extras (business.extra_category_ids). Fed to
 * SponsorshipsSection so its Add-Sponsorship dialog can show "Will feature
 * on: …" without a second fetch: sponsorship is per-business now, so it
 * automatically appears on every category page the business is a member of.
 */
function deriveBusinessCategoryNames(
  business: Business,
  categories: Category[],
): string[] {
  const names: string[] = []
  const primary = categories.find((c) => c.slug === business.category)?.name
  if (primary) names.push(primary)
  for (const id of business.extra_category_ids) {
    const extra = categories.find((c) => c.id === id)?.name
    if (extra && !names.includes(extra)) names.push(extra)
  }
  return names
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
  categoryTree,
  open,
  onClose,
  onSaved,
}: {
  business: Business
  categories: Category[]
  categoryTree: CategoryTreeOutput["tree"]
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [primarySlug, setPrimarySlug] = useState(business.category)
  const [extraIds, setExtraIds] = useState<string[]>(business.extra_category_ids)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // pickerMode drives the two-panel overlay: null = closed; "primary" =
  // replace the primary category; "add" = append to extras.
  const [pickerMode, setPickerMode] = useState<null | "primary" | "add">(null)

  // Lookup tables built once from the tree. catById powers the extras
  // chip labels ("Root ▸ Sub"); catBySlug resolves the primary display.
  const catById = useMemo(() => {
    const m = new Map<string, { name: string; slug: string; rootName?: string }>()
    for (const { root, children } of categoryTree) {
      m.set(root.id, { name: root.name, slug: root.slug })
      for (const c of children) {
        m.set(c.id, { name: c.name, slug: c.slug, rootName: root.name })
      }
    }
    return m
  }, [categoryTree])

  const catBySlug = useMemo(() => {
    const m = new Map<string, { id: string; name: string; rootName?: string }>()
    for (const { root, children } of categoryTree) {
      m.set(root.slug, { id: root.id, name: root.name })
      for (const c of children) {
        m.set(c.slug, { id: c.id, name: c.name, rootName: root.name })
      }
    }
    return m
  }, [categoryTree])

  // Primary display formats as "Root ▸ Sub" for the common case; the
  // orphan flag fires when the stored slug points at a level-1 root (a
  // drift-case row that pre-dates the sub-only rule). Save is still
  // possible but the UI nags with a red warning until Change is used.
  const primaryDisplay = useMemo(() => {
    const found = catBySlug.get(primarySlug)
    if (!found) return { label: primarySlug || "(none)", isOrphan: true }
    return {
      label: found.rootName ? `${found.rootName} ▸ ${found.name}` : found.name,
      isOrphan: !found.rootName,
    }
  }, [primarySlug, catBySlug])

  // Exclusion set for "add" mode — keeps the two-panel picker from
  // offering categories that are already the primary OR already in
  // extras. Primary mode ignores this (the picker enforces sub-only).
  const excludeIds = useMemo(() => {
    const set = new Set(extraIds)
    const p = catBySlug.get(primarySlug)
    if (p) set.add(p.id)
    return set
  }, [extraIds, primarySlug, catBySlug])

  function handlePrimaryPick(slug: string) {
    setPrimarySlug(slug)
    // If the newly-picked primary was also in extras, remove it — the
    // save cleaner would strip it anyway, but doing it here keeps the
    // chip list truthful during editing.
    const picked = catBySlug.get(slug)
    if (picked) {
      setExtraIds((prev) => prev.filter((id) => id !== picked.id))
    }
    setPickerMode(null)
  }

  function handleAddPick(id: string) {
    setExtraIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPickerMode(null)
  }

  function removeExtra(id: string) {
    setExtraIds((prev) => prev.filter((x) => x !== id))
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const primaryCat = catBySlug.get(primarySlug)
      const cleanedExtras = primaryCat
        ? extraIds.filter((id) => id !== primaryCat.id)
        : extraIds
      const result = await runUpdate(business.id, {
        category: primarySlug,
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
    category: primarySlug,
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
            {/* Preview — live projection of primary + extras as chips. */}
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <CategoryPreview
                business={previewBusiness}
                categories={categories}
              />
            </div>

            {/* Primary — chip + Change button. */}
            <div className="space-y-2">
              <Label>Primary category</Label>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2",
                  primaryDisplay.isOrphan
                    ? "border-destructive/40"
                    : "border-border",
                )}
              >
                <Star
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm text-foreground">
                  {primaryDisplay.label}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerMode("primary")}
                >
                  Change
                </Button>
              </div>
              {primaryDisplay.isOrphan && (
                <p className="text-xs text-destructive">
                  Current primary is a root category. Click Change and pick a subcategory before saving.
                </p>
              )}
            </div>

            {/* Additional — chip stack + Add button. */}
            <div className="space-y-2">
              <Label>Also appears in</Label>
              <p className="text-xs text-muted-foreground">
                Optional. Additional categories the business shows up under.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {extraIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70">
                    No extra categories yet.
                  </p>
                ) : (
                  extraIds.map((id) => {
                    const c = catById.get(id)
                    if (!c) return null
                    const label = c.rootName
                      ? `${c.rootName} ▸ ${c.name}`
                      : c.name
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeExtra(id)}
                          aria-label={`Remove ${label}`}
                          className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    )
                  })
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerMode("add")}
              >
                <Plus className="size-3.5" aria-hidden />
                Add another category
              </Button>
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

          {/* Picker overlay — absolute-positioned inside the dialog popup
              so it feels like a "step forward" without a nested portal. */}
          {pickerMode !== null && (
            <CategoryTwoPanelPicker
              mode={pickerMode}
              tree={categoryTree}
              excludeIds={excludeIds}
              onCancel={() => setPickerMode(null)}
              onPick={(pickedId, pickedSlug) => {
                if (pickerMode === "primary") {
                  handlePrimaryPick(pickedSlug)
                } else {
                  handleAddPick(pickedId)
                }
              }}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Two-panel category picker rendered as an inline overlay on top of the
 * CategoryEditModal popup. Left panel: roots. Right panel: subs of the
 * selected root. Primary mode enforces sub-only picks (matches Group B's
 * server-side sub-only rule); add mode also lets the admin pick the
 * root itself (matches the historical behavior where additional
 * categories can be any level).
 */
function CategoryTwoPanelPicker({
  mode,
  tree,
  excludeIds,
  onCancel,
  onPick,
}: {
  mode: "primary" | "add"
  tree: CategoryTreeOutput["tree"]
  excludeIds: Set<string>
  onCancel: () => void
  onPick: (id: string, slug: string) => void
}) {
  const [selectedRootId, setSelectedRootId] = useState<string | null>(
    tree[0]?.root.id ?? null,
  )
  const [selectedPickId, setSelectedPickId] = useState<string | null>(null)

  const roots = tree.map(({ root }) => root)
  const selectedRoot = tree.find(({ root }) => root.id === selectedRootId)
  const subs = selectedRoot?.children ?? []
  const visibleSubs = subs.filter((s) => !excludeIds.has(s.id))

  // In add mode, offer the root itself as a pickable option — matches
  // the pre-revamp checklist behavior where roots could be added as
  // additional categories. Suppressed when already in extras.
  const canPickRootInAddMode =
    mode === "add" &&
    !!selectedRoot &&
    !excludeIds.has(selectedRoot.root.id)

  function handleConfirm() {
    if (!selectedPickId) return
    for (const { root, children } of tree) {
      if (root.id === selectedPickId) {
        onPick(root.id, root.slug)
        return
      }
      const child = children.find((c) => c.id === selectedPickId)
      if (child) {
        onPick(child.id, child.slug)
        return
      }
    }
  }

  const emptySubsAffordance =
    subs.length === 0 && selectedRoot ? (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No subcategories under {selectedRoot.root.name} yet.
        </p>
        <a
          href={`/admin/settings/categories/new?parent=${encodeURIComponent(
            selectedRoot.root.id,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-primary hover:underline"
        >
          Add one →
        </a>
      </div>
    ) : null

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden rounded-xl bg-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {mode === "primary" ? "Set primary" : "Add category"}
          </p>
          <h3 className="font-display text-lg text-foreground">
            Choose a category
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Close picker"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,180px)_1fr] overflow-hidden">
        {/* Left: root list */}
        <div className="overflow-y-auto border-r border-border bg-muted/20">
          <ul>
            {roots.map((root) => {
              const isSelected = selectedRootId === root.id
              return (
                <li key={root.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRootId(root.id)
                      setSelectedPickId(null)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
                      isSelected &&
                        "bg-primary/10 font-semibold text-foreground",
                    )}
                  >
                    <span className="truncate">{root.name}</span>
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-muted-foreground",
                        isSelected && "text-primary",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Right: picks under the selected root */}
        <div className="overflow-y-auto px-4 py-3">
          {selectedRoot ? (
            <>
              {canPickRootInAddMode && (
                <label
                  className={cn(
                    "mb-2 flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:bg-accent",
                    selectedPickId === selectedRoot.root.id &&
                      "border-primary bg-primary/10",
                  )}
                >
                  <input
                    type="radio"
                    name="picker-pick"
                    value={selectedRoot.root.id}
                    checked={selectedPickId === selectedRoot.root.id}
                    onChange={() =>
                      setSelectedPickId(selectedRoot.root.id)
                    }
                    className="size-3.5 accent-primary"
                  />
                  <span>
                    All of {selectedRoot.root.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      (root)
                    </span>
                  </span>
                </label>
              )}

              {visibleSubs.length === 0 ? (
                subs.length === 0 ? (
                  emptySubsAffordance
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    Nothing left to add under {selectedRoot.root.name}.
                  </p>
                )
              ) : (
                <ul className="space-y-1">
                  {visibleSubs.map((sub) => (
                    <li key={sub.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:bg-accent",
                          selectedPickId === sub.id &&
                            "border-primary bg-primary/10",
                        )}
                      >
                        <input
                          type="radio"
                          name="picker-pick"
                          value={sub.id}
                          checked={selectedPickId === sub.id}
                          onChange={() => setSelectedPickId(sub.id)}
                          className="size-3.5 accent-primary"
                        />
                        <span>{sub.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a category on the left.
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPickId}
        >
          {mode === "primary" ? "Set as primary" : "Add"}
        </Button>
      </div>
    </div>
  )
}

function CoreFieldsSection({
  business,
  categories,
  categoryTree,
  cities,
}: {
  business: BusinessAdmin
  categories: Category[]
  categoryTree: CategoryTreeOutput["tree"]
  cities: City[]
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
      <div className="space-y-5 px-6 py-5">
        <CoreFieldsPreview
          business={business}
          categories={categories}
          cities={cities}
          onEditCategories={() => setCategoryOpen(true)}
        />
        {/* Gallery — additional images shown below the Feature image
            preview in Core Fields. Lives here rather than its own
            section to keep the mental model "everything about how this
            business looks at a glance" in one card. Uploads/deletes
            save immediately via the control's own fetch + refresh. */}
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Gallery
          </p>
          <p className="text-xs text-muted-foreground">
            Up to 3 images · resized to 1200×800 cover JPEG on upload.
          </p>
          <GalleryControl
            businessId={business.id}
            images={business.images}
          />
        </div>
        <StatusLine feedback={feedback} />
      </div>
      <CoreFieldsEditModal
        business={business}
        cities={cities}
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
        categoryTree={categoryTree}
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
  cities,
  onEditCategories,
}: {
  business: BusinessAdmin
  categories: Category[]
  cities: City[]
  onEditCategories: () => void
}) {
  const cityName = business.city_id
    ? cities.find((c) => c.id === business.city_id)?.name ?? null
    : null
  const businessTypeLabel = business.business_type
    ? BUSINESS_TYPE_LABELS[business.business_type] ?? business.business_type
    : null
  const yearsOperatingLabel = business.years_operating
    ? YEARS_OPERATING_LABELS[business.years_operating] ?? business.years_operating
    : null
  const contactPerson = business.contact_person ?? null
  const hasProfileMeta =
    cityName || businessTypeLabel || yearsOperatingLabel || contactPerson

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* Feature image — direct upload / replace / delete. The control
          owns its own POST/DELETE + router.refresh(); no modal needed. */}
      <div className="w-full sm:w-56 sm:flex-shrink-0">
        <FeatureImageControl
          businessId={business.id}
          imageUrl={business.image_url}
        />
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
        {/* Profile metadata — city / business type / years operating. Each
            renders only when set; the whole block hides when all three are
            blank so we don't show an empty row. */}
        {hasProfileMeta && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            {cityName && (
              <div>
                <dt className="text-muted-foreground">City</dt>
                <dd className="text-foreground">{cityName}</dd>
              </div>
            )}
            {businessTypeLabel && (
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-foreground">{businessTypeLabel}</dd>
              </div>
            )}
            {yearsOperatingLabel && (
              <div>
                <dt className="text-muted-foreground">Operating</dt>
                <dd className="text-foreground">{yearsOperatingLabel}</dd>
              </div>
            )}
            {contactPerson && (
              <div>
                <dt className="text-muted-foreground">Contact person</dt>
                <dd className="text-foreground">{contactPerson}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}

function CoreFieldsEditModal({
  business,
  cities,
  open,
  onClose,
  onSaved,
}: {
  business: BusinessAdmin
  cities: City[]
  open: boolean
  onClose: () => void
  onSaved: (result: Feedback) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(business.name)
  const [description, setDescription] = useState(business.description ?? "")
  const [contactPerson, setContactPerson] = useState(
    business.contact_person ?? "",
  )
  const [cityId, setCityId] = useState(business.city_id ?? "")
  const [businessType, setBusinessType] = useState(business.business_type ?? "")
  const [yearsOperating, setYearsOperating] = useState(
    business.years_operating ?? "",
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        name: name.trim() || null,
        description: description.trim() || null,
        contact_person: contactPerson.trim() || null,
        city_id: cityId || null,
        business_type: businessType || null,
        years_operating: yearsOperating || null,
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
                Name, about copy, city, business type, and tenure. The feature
                image, categories, and gallery are edited inline on the card.
                Placement comes from the business&rsquo;s active paid
                subscription &mdash; edit that in Subscriptions below.
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
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Name</Label>
              <Input
                id="b-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-contact-person">Contact person</Label>
              <Input
                id="b-contact-person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Priya Krishnamurthy"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-description">About</Label>
              <textarea
                id="b-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description shown on cards and the detail page."
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>

            {/* Business profile — fields that were create-only before but
                naturally change over time (relocations, model changes,
                tenure). */}
            <div className="space-y-1.5">
              <Label htmlFor="b-city">City</Label>
              <select
                id="b-city"
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
            <div className="space-y-1.5">
              <Label htmlFor="b-business-type">Business type</Label>
              <select
                id="b-business-type"
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
              <Label htmlFor="b-years">Years operating</Label>
              <select
                id="b-years"
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
  const [addressOpen, setAddressOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const contactEmpty =
    !business.phone &&
    !business.website &&
    !business.address &&
    !business.hours

  const addressLabel = business.address ? "Edit Address" : "Add Address"

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Contact</h2>
        {/* Two top-right buttons:
            - "Edit" opens the combined contact + social modal (everything
              except address)
            - "Edit Address" / "Add Address" opens the address-only modal,
              which uses Google Places Autocomplete */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setContactOpen(true)}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddressOpen(true)}
          >
            <Pencil className="size-3.5" aria-hidden />
            {addressLabel}
          </Button>
        </div>
      </header>
      <div className="space-y-4 px-6 py-5">
        {/* Social icon row — same component the public listing detail
            page uses. Editing now flows through the combined Contact
            modal, so no inline edit affordance here. */}
        <SocialLinks
          facebook_url={business.facebook_url}
          instagram_url={business.instagram_url}
          whatsapp_number={business.whatsapp_number}
          phone={business.phone}
          website={business.website}
          address={business.address}
        />
        {contactEmpty ? (
          <p className="text-sm text-muted-foreground">
            No contact details yet.
          </p>
        ) : (
          <ContactPreview business={business} />
        )}
        <StatusLine feedback={feedback} />
      </div>
      <ContactDetailsEditModal
        business={business}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setContactOpen(false)
        }}
      />
      <AddressEditModal
        business={business}
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSaved={(result) => {
          setFeedback(result)
          if (result?.kind === "ok") setAddressOpen(false)
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

function ContactDetailsEditModal({
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
  const [hours, setHours] = useState(business.hours ?? "")
  const [facebook, setFacebook] = useState(business.facebook_url ?? "")
  const [instagram, setInstagram] = useState(business.instagram_url ?? "")
  // Seed with the 10-digit US portion — DB stores "14045551234", the
  // input shows "404-555-1234". See lib/whatsapp.ts for the E.164 wrap.
  const [whatsapp, setWhatsapp] = useState(
    fromWhatsappE164(business.whatsapp_number),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        phone: phone.trim() || null,
        website: website.trim() || null,
        hours: hours.trim() || null,
        facebook_url: facebook.trim() || null,
        instagram_url: instagram.trim() || null,
        whatsapp_number: toWhatsappE164(whatsapp),
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
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(580px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                Edit contact
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Phone, website, hours, and social links. Address has its
                own editor &mdash; use &ldquo;Edit Address&rdquo; in the
                section header.
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
            <div className="space-y-1.5">
              <Label htmlFor="b-phone">Phone</Label>
              <PhoneInput
                id="b-phone"
                value={phone}
                onChange={setPhone}
                placeholder="98765 43210"
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
              <Label htmlFor="b-hours">Hours</Label>
              <Input
                id="b-hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Mon–Fri: 9am–6pm, Sat: 10am–4pm"
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
              <PhoneInput
                id="b-whatsapp"
                value={whatsapp}
                onChange={setWhatsapp}
                placeholder="+91 98765 43210"
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

function AddressEditModal({
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
  const [address, setAddress] = useState(business.address ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isAdd = !business.address
  const titleLabel = isAdd ? "Add Address" : "Edit Address"

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        address: address.trim() || null,
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
                {titleLabel}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Type to search Google Places and pick a suggestion.
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
            <div className="space-y-1.5">
              <Label htmlFor="b-address">Address</Label>
              <PlacesAddressInput
                id="b-address"
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, Atlanta, GA 30301"
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

function AiraReviewSection({ business }: { business: BusinessAdmin }) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const notes = business.verification_notes?.trim()

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{brand.name} Review</h2>
          {business.verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              title={`${brand.name} verified business`}
            >
              <BadgeCheck className="size-3.5" aria-hidden />
              Verified
            </span>
          )}
        </div>
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
      {notes && (
        <div className="border-b border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Verification notes:
          </span>{" "}
          <span className="whitespace-pre-line">{notes}</span>
        </div>
      )}
      <div className="space-y-3 px-6 py-5">
        <AiraReviewPreview
          rating={business.rating}
          review={business.aira_review}
          onAdd={() => setOpen(true)}
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
  onAdd,
}: {
  rating: number | null
  review: string | null
  /** When provided, the empty state renders a CTA button that invokes
   *  this handler (the section uses it to open the edit modal). Modal
   *  callers omit it so the empty state stays passive there. */
  onAdd?: () => void
}) {
  const hasRating = rating !== null && rating > 0
  const hasReview = review !== null && review.trim().length > 0
  if (!hasRating && !hasReview) {
    if (onAdd) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
          <Sparkles className="size-6 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No {brand.name} Review yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add a star rating and a short editorial note. Both show on the
              public detail page.
            </p>
          </div>
          <Button type="button" size="sm" onClick={onAdd}>
            <Sparkles className="size-3.5" aria-hidden />
            Add review
          </Button>
        </div>
      )
    }
    return (
      <p className="text-sm text-muted-foreground">
        No rating or review yet.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {hasRating ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {brand.name} Stars
          <RatingPill rating={rating!} />
        </span>
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

/**
 * Click-to-set star rating with half-star granularity. Each of the 5
 * stars is split into a left half (value = i + 0.5) and a right half
 * (value = i + 1.0) so admins can hit half-stars without a separate
 * input. Hover previews the value; click commits. A small Clear button
 * resets the rating to null ("No rating") to match the dropdown's old
 * empty state. Keyboard users can tab to each half and press Enter /
 * Space to commit (native button semantics).
 */
function StarRating({
  value,
  onChange,
}: {
  /** Empty string represents "No rating"; numeric string e.g. "3.5" otherwise.
   *  Mirrors the parent modal's state shape so the swap from <select> was
   *  a one-line change. */
  value: string
  onChange: (next: string) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const numeric = value === "" ? 0 : Number(value)
  const display = hover ?? numeric

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center"
        role="radiogroup"
        aria-label="Star rating"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const halfValue = i + 0.5
          const fullValue = i + 1
          const filledFraction = Math.max(0, Math.min(1, display - i))
          const pct = filledFraction * 100
          return (
            <span
              key={i}
              className="relative inline-block size-8"
              aria-hidden
            >
              {/* Background star (empty colour) */}
              <Star
                className="absolute inset-0 m-auto size-7 text-warning/25"
                fill="currentColor"
                strokeWidth={0}
              />
              {/* Filled portion clipped to the current display value. */}
              <span
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
              >
                <Star
                  className="absolute inset-0 m-auto size-7 text-warning"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
              {/* Two invisible click targets stacked on top: left half
                  sets i+0.5; right half sets i+1.0. */}
              <button
                type="button"
                aria-label={`${halfValue} stars`}
                onMouseEnter={() => setHover(halfValue)}
                onClick={() => onChange(String(halfValue))}
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
              />
              <button
                type="button"
                aria-label={`${fullValue} stars`}
                onMouseEnter={() => setHover(fullValue)}
                onClick={() => onChange(String(fullValue))}
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
              />
            </span>
          )
        })}
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">
        {value === "" ? "No rating" : Number(value).toFixed(1)}
      </span>
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
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
  business: BusinessAdmin
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
  const [verified, setVerified] = useState(business.verified)
  const [verificationNotes, setVerificationNotes] = useState(
    business.verification_notes ?? "",
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await runUpdate(business.id, {
        rating: rating === "" ? null : Number(rating),
        aira_review: airaReview.trim() || null,
        verified,
        verification_notes: verificationNotes.trim() || null,
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
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <AiraReviewPreview rating={previewRating} review={airaReview} />
            </div>

            <label className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-primary"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <BadgeCheck className="size-4 text-primary" aria-hidden />
                  Verified by {brand.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  Surfaces the blue-tick badge on cards and the public detail
                  page. Use only after confirming the business is authentic.
                </p>
              </div>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="b-verification-notes">Verification notes</Label>
              <textarea
                id="b-verification-notes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Internal record — call refs, licence numbers, what was checked."
                rows={3}
                maxLength={1000}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
              <p className="text-xs text-muted-foreground">
                Admin-only. Not shown on the public detail page. Max 1000
                characters.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Star rating</Label>
              <StarRating value={rating} onChange={setRating} />
              <p className="text-xs text-muted-foreground">
                Click the left half of a star for a half rating; the right
                half for a full one. Cards and the detail page hide the
                rating entirely when cleared or set to 0.
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
