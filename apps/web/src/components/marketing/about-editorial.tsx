// "Why we built this" — editorial 2-column section. No card frame, no UI
// chrome; just paragraphs in Lato body with a drop-cap on the lead. The
// drop-cap uses CSS :first-letter so it survives SSR + works without any
// client-side logic.
//
// Copy is locked from .mstack/mockups/marketing-page/v4/index.html. Marketing
// prose lives inline (allowlisted in tooling/eslint-config — see T9).

import { Ornament } from "./_ornament"
import "./about-editorial.css"

export function AboutEditorial() {
  return (
    <section
      id="about"
      className="scroll-mt-20 bg-[url('/marketing-images/textures/paper-ochre.webp')] bg-cover bg-center py-[120px] md:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <header className="mb-16 text-center">
          <Ornament />
          <span className="block text-[14px] font-bold uppercase tracking-[4px] text-foreground">
            Why we built this
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            Real businesses. Real people.{" "}
            <em className="font-bold italic text-primary">
              Not a random data dump.
            </em>
          </h2>
        </header>

        <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-start gap-[40px] md:grid-cols-2 md:gap-[80px]">
          <div>
            <p className="about-drop-cap text-lg leading-[1.75] text-foreground">
              Most directory apps are an algorithm. AIRA isn&rsquo;t. Every
              listing is reviewed by a person before it appears. No scraped
              records, no auto-imported phone books &mdash; just the places
              your neighbors would actually recommend.
            </p>
          </div>
          <div className="space-y-[22px]">
            <p className="text-lg leading-[1.75] text-foreground">
              We started in Atlanta because that&rsquo;s where Nisarga began.
              We&rsquo;re staying small on purpose. Trusted neighborhoods take
              time to build, and the South Asian community in Atlanta is one of
              those neighborhoods.
            </p>
            <p className="text-lg leading-[1.75] text-foreground">
              The dosa place, the tabla teacher, the mandap rental, the
              immigration lawyer who actually picks up the phone &mdash; the
              people you&rsquo;d ask a friend about before you Googled it.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

