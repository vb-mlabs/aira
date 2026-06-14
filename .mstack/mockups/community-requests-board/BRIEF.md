# Mockup brief: Community Requests Board

**Date:** 2026-06-14
**From review:** [2026-06-13-community-requests-board.md](../../reviews/2026-06-13-community-requests-board.md)

## Feature

Community board where AIRA app users post requests for trusted referrals
("Looking for a pediatrician near Alpharetta") and other members tap **"I can
help"** to offer leads — privately, signal-only, no public thread. Two screens
in scope:

1. **Public board** — `/community` — paginated list of approved posts, with
   search and an "Ask the community" CTA.
2. **Post detail** — `/community/[id]` — the post + (author-only) the list of
   respondents with their optional message.

## Users

Atlanta's Indian community on AIRA. The board reader is usually someone
casually browsing for a need they themselves might have, or scanning whether
they can help. Primary actions:

- **"Ask the community"** — submit a new request (Sheet/modal).
- **"I can help"** — tap on someone else's request to register intent + optional
  one-line note.

Voice + brand: warm, neighborly, respects an older demographic. No jargon.
Cormorant Garamond display, Lato body. AIRA olive (#4F653B) + warm cream paper.

## Variant axis

**Hierarchy / layout density** — three patterns for how requests are
presented, since the screen pattern itself is undecided:

- **v1** — compact list rows (classifieds density)
- **v2** — editorial card stack (magazine spread)
- **v3** — featured hero + dense 2-col secondary feed

## Variants

3, each rendering both the board and the post detail using the same density
pattern so the user can judge the system, not just the index page.
