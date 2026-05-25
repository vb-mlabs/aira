import type { Metadata } from "next"
import { brand } from "@mlabs/config"

export const seo = {
  defaultTitle: `${brand.name} — ${brand.tagline}`,
  titleTemplate: `%s | ${brand.name}`,
  description: brand.tagline,
  ogImage: "/og-default.png",
  twitterCard: "summary_large_image" as const,
  url: brand.url,
}

// Helper to produce per-route metadata. Routes call this with overrides.
export function generateMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.description,
    metadataBase: new URL(seo.url),
    openGraph: {
      title: seo.defaultTitle,
      description: seo.description,
      url: seo.url,
      siteName: brand.name,
      images: [{ url: seo.ogImage }],
      type: "website",
    },
    twitter: {
      card: seo.twitterCard,
      title: seo.defaultTitle,
      description: seo.description,
      images: [seo.ogImage],
      creator: brand.socialHandle,
    },
    ...overrides,
  }
}
