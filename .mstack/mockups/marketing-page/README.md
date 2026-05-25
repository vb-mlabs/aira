# AIRA marketing-page mockups

Three static HTML variants for the landing page revamp. All use the locked AIRA design tokens (cream + olive + Cormorant + Lato + paper texture).

## How to view

The HTML files reference the app screen PNGs at `/marketing-assets/...` and are themselves served at `/marketing-mockups/v{1,2,3}/index.html`. After the symlinks are set up (Claude does this in the same turn that creates the mockups), open at your Replit URL:

```
https://<your-repl>.replit.dev/marketing-mockups/v1/index.html
https://<your-repl>.replit.dev/marketing-mockups/v2/index.html
https://<your-repl>.replit.dev/marketing-mockups/v3/index.html
https://<your-repl>.replit.dev/marketing-mockups/COMPARE.html  ← side-by-side
```

## What's different across variants

| | v1 — Hybrid balanced | v2 — Hybrid magazine-leaning | v3 — Pure Magazine |
|---|---|---|---|
| Hero | Medium editorial, email form inline | Full-viewport editorial, no form | Huge tree-of-life, single sentence |
| Email signup | In the hero | Mid-page conversion moment | Subtle, in footer |
| Phone mockups | Mid-page showcase (Home + Listings side-by-side) | Smaller, near bottom | None |
| Categories | Visual grid, tier colors | Spaced editorial layout | Editorial layout, larger |
| Business CTA | Olive-bg panel, mid-page | Compact, near footer | Not foregrounded |
| Conversion intent | High | Medium | Low (intentionally — contrast reference) |

## Files

```
marketing-page/
├── BRIEF.md           # the positioning lock + creative brief
├── README.md          # this file
├── COMPARE.html       # side-by-side iframe view
├── v1/
│   ├── index.html
│   └── NOTES.md
├── v2/
│   ├── index.html
│   └── NOTES.md
└── v3/
    ├── index.html
    └── NOTES.md
```

## After picking a winner

Run `/mlabs-plan` referencing the winner. The plan will break the chosen variant into a shippable code slice — retire the MLabs template marketing components, ship new components under `apps/web/src/components/marketing/`, swap the `page.tsx` imports. Per `roadmap.md` this likely slots into the early sprints alongside Sprint 0/1 work since the marketing page is pre-launch lead-capture and needs to be live before the app ships.

## What was deliberately left out

See BRIEF.md § "What we are NOT showing" — pricing, fake metrics, App Store badges, stock people photos, fake testimonials.
