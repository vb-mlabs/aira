# Implementation report — Listings pagination + scoped search

**Status:** complete
**Plan:** [2026-06-09-listings-pagination-search](../../plans/2026-06-09-listings-pagination-search.md)
**Review:** [2026-06-09-listings-pagination-search](../../reviews/2026-06-09-listings-pagination-search.md)
**Branch:** `feat/rest-api-migration`
**Run window:** 2026-06-09 18:00 → 18:50

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extend BusinessListInputSchema | ✓ done | `d702bfc` |
| 2 | Add getBusinessesByCategoryPaged service fn | ✓ done | `e9d0ea3` |
| 3 | Widen listBusinessesOp handler + output schema | ✓ done | `7213ad0` |
| 4 | Pagination component | ✓ done | `76dd490` |
| 5 | Lift filter state to URL searchParams | ✓ done | `5570246` |
| 6 | Smoke test + run report | ✓ done | `3099560` |

## Commits

```
3099560 chore(mstack): pagination + search run report + API smoke
5570246 feat(listings): URL-driven pagination + search on /listings/[category]
76dd490 feat(listings): add Pagination component
7213ad0 feat(api): paginated branch in listBusinessesOp + widen output schema
e9d0ea3 feat(services): add getBusinessesByCategoryPaged
d702bfc feat(validators): widen BusinessListInputSchema for pagination + search
```

## Deviations from review

- **Task 1 → Tasks 1+3 split.** The review put input + output schema widening
  in Task 1, but the output schema and op handler are tightly coupled —
  widening one without the other breaks runtime (strict output schema rejects
  existing branches' `{ items }` returns). Solution: shipped input schema in
  Task 1; pulled output schema into Task 3 alongside the handler's
  `withFullPageMeta()` helper that synthesizes total/page/pageSize for the
  three non-paginated branches.

- **`.default()` → `.optional()` on `page`/`pageSize`.** Zod's `.default()`
  makes the field required in the resolved type, which the `apiServerFetch`
  inference exposes — broke all 4 existing callers (`/home`, `/admin`,
  `/admin/businesses`, `/listings/[category]`) at compile time. Switched to
  `.optional()` and applied defaults in the op handler (DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE constants).

- **Browser screenshot skipped.** The QA spec auth setup is shaped for the
  Replit HTTPS dev domain (`__Secure-` cookie + `secure: true`), not
  localhost. Two options to fix later: (a) extend prepare-auth.mjs to
  support a `--target localhost` mode that issues a non-secure cookie, or
  (b) run the screenshot pass from the Replit URL itself. For now the
  API-level smoke (`api-smoke.md` in this dir) covers every server-side
  branch with strict-schema validation passing.

## Follow-ups

- **`/admin/businesses` no-filter quirk** (pre-existing). The admin list
  page calls `listBusinessesOp({ input: {} })` which hits the "no-filter =
  featured" fallback, so admin only sees tier1+tier2 businesses. Flagged
  in the review; out of scope for this run. Recommended one-line fix: an
  explicit `all` mode on the op or a dedicated `listAllBusinessesOp` for
  admin.
- **`pg_trgm` GIN index** on `(name, description, address)` if ILIKE perf
  becomes a bottleneck post-launch. Not needed at MVP scale.
- **Mobile parity.** Mobile listings screen, when it ships, consumes the
  same paginated REST endpoint with zero new server work.

## Recommended next step

Run `/mlabs-qa` with focus `listings pagination + search` — Playwright
will exercise the search → URL update → server fetch → tier rendering →
pagination click → category switch → back-button cycle that the API smoke
can't cover. The QA prepare-auth script will need to target the Replit
URL (which it already does by default) and the spec just needs to drive
the UI.
