// "Why we built this" — editorial 2-column section. No card frame, no UI
// chrome; just paragraphs in Lato body with a drop-cap on the lead. The
// drop-cap uses CSS :first-letter so it survives SSR + works without any
// client-side logic.
//
// Copy is locked from .mstack/mockups/marketing-page/v4/index.html. Marketing
// prose lives inline (allowlisted in tooling/eslint-config — see T9).

import "./about-editorial.css"

export function AboutEditorial() {
  return (
    <section className="px-6 py-[120px] md:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-16 text-center">
          <Ornament />
          <span className="block text-[11px] font-bold uppercase tracking-[3px] text-[color:var(--brand-gold)]">
            Why we built this
          </span>
          <h2 className="mt-3.5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            The opposite of an algorithm and a pile of{" "}
            <em className="font-bold italic text-primary">scraped data</em>.
          </h2>
        </header>

        <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-start gap-[40px] md:grid-cols-2 md:gap-[80px]">
          <div>
            <p className="about-drop-cap text-lg leading-[1.75] text-foreground">
              Most directory apps are an algorithm. AIRA isn&rsquo;t. Every
              listing on AIRA is reviewed by a person before it appears
              &mdash; real businesses, run by real people, sorted by who the
              community actually trusts.
            </p>
          </div>
          <div className="space-y-[22px]">
            <p className="text-lg leading-[1.75] text-muted-foreground">
              We started in Atlanta because that&rsquo;s where Nisarga began.
              We&rsquo;re staying small on purpose. Trusted neighborhoods take
              time to build, and the Indian community in Atlanta is one of
              those neighborhoods.
            </p>
            <p className="text-lg leading-[1.75] text-muted-foreground">
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

function Ornament() {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      <hr className="h-px w-12 border-0 bg-[color:oklch(0.66_0.10_80_/_50%)]" />
      <span className="font-display text-2xl text-[color:var(--brand-gold)]">
        ✦
      </span>
      <hr className="h-px w-12 border-0 bg-[color:oklch(0.66_0.10_80_/_50%)]" />
    </div>
  )
}
