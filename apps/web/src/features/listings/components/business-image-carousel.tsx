"use client"

import { useRef, useState } from "react"
import type { BusinessImage } from "@aira/validators"

interface BusinessImageCarouselProps {
  images: BusinessImage[]
  businessName: string
}

export function BusinessImageCarousel({
  images,
  businessName,
}: BusinessImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  if (images.length === 0) return null

  function scrollTo(index: number) {
    const track = trackRef.current
    if (!track) return
    const width = track.scrollWidth / images.length
    track.scrollTo({ left: width * index, behavior: "smooth" })
    setActiveIndex(index)
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const width = track.clientWidth
    const next = Math.round(track.scrollLeft / width)
    setActiveIndex(next)
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)]">
      {/* Scroll track */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
        aria-label={`${businessName} gallery`}
        role="region"
      >
        {images.map((img, i) => (
          <div
            key={img.id}
            className="flex-none w-full snap-start"
            aria-label={`Image ${i + 1} of ${images.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={`${businessName} — photo ${i + 1}`}
              className="h-56 w-full object-cover sm:h-72"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators — only shown with 2+ images */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={[
                "size-2 rounded-full transition-all",
                i === activeIndex
                  ? "bg-foreground scale-110"
                  : "bg-muted-foreground/40 hover:bg-muted-foreground/70",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  )
}
