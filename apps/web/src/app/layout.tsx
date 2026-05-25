import { Lato, Cormorant_Garamond, JetBrains_Mono } from "next/font/google"
import { generateMetadata } from "@/config/seo"
import { Providers } from "./providers"
import { cn } from "@aira/ui-web/utils"
import "./globals.css"

// AIRA pairing — Lato (humanist sans) for body + UI, Cormorant Garamond
// (transitional serif) for headings + wordmark. Both Google Fonts; both
// available via @expo-google-fonts/* on mobile.
const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700"],
  subsets: ["latin"],
})

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  weight: ["600", "700"],
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata = generateMetadata()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        lato.variable,
        cormorantGaramond.variable,
        jetbrainsMono.variable,
        "h-full antialiased font-sans",
      )}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
