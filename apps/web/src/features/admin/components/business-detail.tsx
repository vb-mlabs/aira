"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { Business } from "@/features/listings"

interface BusinessAdminDetailProps {
  business: Business
}

type Feedback = { kind: "ok" | "error"; message: string } | null

interface UpdateResult {
  business: Business
}

async function runUpdate(
  id: string,
  data: Record<string, string | null>,
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

export function BusinessAdminDetail({ business }: BusinessAdminDetailProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground font-mono">{business.id}</p>
      </header>

      <CoreFieldsSection business={business} />
      <ContactSection business={business} />
      <SocialLinksSection business={business} />
      <EditorialSection business={business} />
    </div>
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
          <Input id="b-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Atlanta, GA 30301" />
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
