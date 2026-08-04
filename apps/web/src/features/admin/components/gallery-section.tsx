"use client"

import { useState, useTransition, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { X, Upload } from "lucide-react"
import type { BusinessImage } from "@aira/validators"
import { ImageCropModal } from "./image-crop-modal"

interface GallerySectionProps {
  businessId: string
  images: BusinessImage[]
}

const MAX_IMAGES = 3

/**
 * Self-contained gallery dropzone + thumbnail grid + delete control.
 * No card chrome — caller composes it inside whatever section it needs.
 * Owns its own upload / delete state.
 *
 * Uploads run through the ImageCropModal at 1200×800 (3:2) so the
 * admin can zoom and reposition the crop before the file leaves the
 * browser. Server-side cover-resize still runs as a defensive
 * fallback, but the client crop guarantees the framing that ships is
 * the framing the admin picked.
 */
export function GalleryControl({ businessId, images }: GallerySectionProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [pickedSrc, setPickedSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, startDeleteTransition] = useTransition()

  const canUpload = images.length < MAX_IMAGES

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      // Revoke any prior object URL before minting a fresh one so a
      // second pick doesn't leak. modalOpen effect resets internal
      // state — matches logo-control + feature-image-section.
      if (pickedSrc) URL.revokeObjectURL(pickedSrc)
      const src = URL.createObjectURL(file)
      setPickedSrc(src)
      setModalOpen(true)
      setError(null)
    },
    [pickedSrc],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: !canUpload,
  })

  // Revoke the object URL when the modal closes so we don't keep the
  // blob alive for the lifetime of the page.
  function releasePickedSrc() {
    if (pickedSrc) {
      URL.revokeObjectURL(pickedSrc)
      setPickedSrc(null)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { if (!modalOpen) releasePickedSrc() }, [modalOpen])

  function handleDelete(imageId: string) {
    startDeleteTransition(async () => {
      setError(null)
      try {
        const res = await fetch(
          `/api/v1/admin/businesses/${businessId}/images/${imageId}`,
          { method: "DELETE" },
        )
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error?.message ?? "Delete failed.")
        }
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.")
      }
    })
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-[3/2] overflow-hidden rounded-md border border-border">
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId}
                aria-label="Remove image"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div
          {...getRootProps()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm transition-colors",
            isDragActive
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input {...getInputProps()} />
          <Upload className="size-6" aria-hidden />
          <span>
            {isDragActive ? "Drop to upload" : "Drop image or click to browse"}
          </span>
          <span className="text-xs">JPEG, PNG or WebP · max 8 MB · crop to 1200×800</span>
        </div>
      )}

      {images.length >= MAX_IMAGES && (
        <p className="text-xs text-muted-foreground">
          Maximum {MAX_IMAGES} images reached. Remove one to upload a new image.
        </p>
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
        endpoint={`/api/v1/admin/businesses/${businessId}/images`}
        aspect={1200 / 800}
        filename="gallery-image"
        title="Crop gallery image"
        saveLabel="Save image"
      />
    </div>
  )
}

/**
 * Card-wrapped variant. Retained for backward compatibility with any
 * caller still composing GallerySection as a standalone section. New
 * callers should use GalleryControl directly inside whatever chrome
 * they want.
 */
export function GallerySection({ businessId, images }: GallerySectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Gallery</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Up to {MAX_IMAGES} images · crop + upload at 1200×800
        </p>
      </header>
      <div className="px-6 py-5">
        <GalleryControl businessId={businessId} images={images} />
      </div>
    </section>
  )
}
