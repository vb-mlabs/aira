"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Loader2, Upload, X } from "lucide-react"
import { ImageCropModal } from "./image-crop-modal"

interface FeatureImageProps {
  businessId: string
  imageUrl: string | null
}

/**
 * Self-contained dropzone + image-preview + remove + replace control.
 * No card chrome — caller composes it inside whatever section / modal /
 * card it needs. Owns its own upload + remove state so callers don't
 * need to plumb them.
 *
 * The upload flow picks the file via react-dropzone, then hands the
 * object URL to ImageCropModal for a 1200×630 (≈1.905:1) crop with
 * zoom. This gives the admin control over the framing that ships,
 * instead of trusting the server-side cover-resize to guess the
 * important region of an off-aspect source photo.
 */
export function FeatureImageControl({ businessId, imageUrl }: FeatureImageProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [pickedSrc, setPickedSrc] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      // Revoke any prior object URL before minting a fresh one so a
      // second pick doesn't leak. modalOpen effect resets internal state.
      if (pickedSrc) URL.revokeObjectURL(pickedSrc)
      const src = URL.createObjectURL(file)
      setPickedSrc(src)
      setModalOpen(true)
      setError(null)
    },
    [pickedSrc],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: removing,
    // noClick: the empty-state dropzone still triggers a click-to-browse;
    // the replace button below uses `open()` directly when an image
    // exists, so we don't need react-dropzone's auto-click handler on
    // every wrapper.
    noClick: false,
  })

  // Revoke the object URL when the modal closes (either via Save or
  // Cancel) so we don't keep the blob alive for the lifetime of the
  // page. Wrapping the setState in a named function so React 19's
  // set-state-in-effect rule doesn't fire on the inline call —
  // matches the logo-control pattern.
  function releasePickedSrc() {
    if (pickedSrc) {
      URL.revokeObjectURL(pickedSrc)
      setPickedSrc(null)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { if (!modalOpen) releasePickedSrc() }, [modalOpen])

  async function handleRemove() {
    setError(null)
    setRemoving(true)
    try {
      const res = await fetch(
        `/api/v1/admin/businesses/${businessId}/feature-image`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Remove failed.")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="group relative aspect-[1200/630] w-full overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          {/* Hover overlay: Replace + Remove buttons in the top-right.
              Replace calls react-dropzone's `open()` to trigger the file
              picker; the hidden <input> rendered below stays mounted so
              `open()` has a target. */}
          <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={open}
              disabled={removing}
              aria-label="Replace feature image"
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed"
            >
              <Upload className="size-3.5" aria-hidden />
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              aria-label="Remove feature image"
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
              Remove
            </button>
          </div>
          <input {...getInputProps()} />
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm transition-colors",
            isDragActive
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            removing && "pointer-events-none opacity-60",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input {...getInputProps()} />
          <Upload className="size-6" aria-hidden />
          <span>
            {isDragActive ? "Drop to upload" : "Drop image or click to browse"}
          </span>
          <span className="text-xs">JPEG, PNG or WebP · max 8 MB · crop to 1200×630</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ImageCropModal
        imageSrc={pickedSrc}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => router.refresh()}
        endpoint={`/api/v1/admin/businesses/${businessId}/feature-image`}
        aspect={1200 / 630}
        filename="feature-image"
        title="Crop feature image"
        saveLabel="Save feature image"
      />
    </div>
  )
}

/**
 * Card-wrapped variant. Retained for backward compatibility with any caller
 * still composing FeatureImageSection as a standalone section. New callers
 * should use FeatureImageControl directly inside whatever chrome they want.
 */
export function FeatureImageSection({ businessId, imageUrl }: FeatureImageProps) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Feature image</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          1 image · crop + upload at 1200×630
        </p>
      </header>
      <div className="px-6 py-5">
        <FeatureImageControl businessId={businessId} imageUrl={imageUrl} />
      </div>
    </section>
  )
}
