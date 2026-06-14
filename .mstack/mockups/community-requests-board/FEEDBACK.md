# Feedback: Community Requests Board

**Date:** 2026-06-14
**Winner:** v2 — Editorial cards (magazine spread)
**Reference:** [v2/index.html](./v2/index.html)

## Why v2

Closest match to the existing AIRA aesthetic (warm editorial cards, Cormorant
display, gold-hairline ornament, brand-cream surfaces) — and to the existing
`business-detail.tsx` layout pattern (card-stack composition). Each request
keeps its emotional weight; the gradient "I can help" CTA is satisfying
rather than incidental.

Works well at the volume we expect for soft-launch (a handful of posts → a
few dozen). If volume grows past 50+ active requests, we can revisit v1's
denser list pattern.

## Adjustments applied during review

- **Removed "Message" buttons from respondent cards** — the messages
  feature is not in MVP scope (built in code as scaffolding but not
  surfaced in the user-facing app shell). The respondent's typed note
  IS the help signal; if there's no note, the card simply says so.
  This matches the locked review decision "Name + optional message only".

## For /mlabs-code to follow

- **Board (`/community`)** — editorial card stack, one request per card.
  Centered hero header with Cormorant display headline + gold-hairline
  eyebrow + "Ask the community" gradient CTA + search input.
- **Post detail (`/community/[id]`)** — single editorial article card,
  then a separate respondents card below with inner-cream tiles per
  respondent (name + avatar + relative time + their note). Read-only;
  no Message button.
- **Respondent without a note** — display "No note attached — just wanted
  you to know they can help." (not "Message them to ask").
- **Tokens used** — `--card`, `--primary`, `--brand-gold`, `--brand-cream-bright`,
  `--gradient-primary`, `--shadow-card`, `--shadow-primary-glow`. No new tokens
  needed.
- **Mobile** — the card stack collapses naturally to 1 column. The centered
  hero header stays centered on mobile.
