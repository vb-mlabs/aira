# Implementation Report: Business Social Links

**Status:** complete
**Date:** 2026-06-08
**Branch:** feat/rest-api-migration

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | DB schema — add social columns | ✓ done | b9bdaa3 |
| 2 | Validator — extend BusinessSchema + update schemas | ✓ done | e0ef664 |
| 3 | Services read — update toBusiness mapper | ✓ done | 2898fd5 |
| 4 | Services write — updateBusiness() | ✓ done | 70674ae |
| 5 | Admin operation — updateBusinessOp | ✓ done | 0fa6a57 |
| 6 | Admin PATCH route | ✓ done | e23e141 |
| 7 | Social icons component | ✓ done | 73bb27a |
| 8 | BusinessCard — social icon row | ✓ done | 0dc7ede |
| 9 | BusinessDetail — social links section | ✓ done | 047a023 |
| 10 | Listings index — re-export SocialLinks | ✓ done | 475a8ba |
| 11 | Admin businesses list page | ✓ done | 2ab6ce9 |
| 12 | Admin business edit page + component | ✓ done | 49be949 |
| 13 | Admin layout nav — Businesses link | ✓ done | 6f6ec9e |

## Commits

- `b9bdaa3` feat(db): add facebook_url, instagram_url, whatsapp_number to businesses
- `e0ef664` feat(validators): extend BusinessSchema + add update schemas for social links
- `2898fd5` feat(services): add social fields to toBusiness mapper
- `70674ae` feat(services): add updateBusiness() mutation for business edit
- `0fa6a57` feat(api): add updateBusinessOp admin operation for business edit
- `e23e141` feat(api): PATCH /api/v1/admin/businesses/[id] route
- `73bb27a` feat(listings): add SocialLinks component with inline SVG brand icons
- `0dc7ede` feat(listings): add social icon row to BusinessCard
- `047a023` feat(listings): add social links to BusinessDetail contact section
- `475a8ba` feat(listings): re-export SocialLinks from listings barrel
- `2ab6ce9` feat(admin): add /admin/businesses list page
- `49be949` feat(admin): add /admin/businesses/[id] edit page and BusinessAdminDetail component
- `6f6ec9e` feat(admin): add Businesses nav link to admin header

## Notes

- `ApiError.notFound` required two args (code + message) — corrected from plan assumption during task 5.
- All 13 commits passed lefthook pre-commit hooks (migrations, server-actions gate, WCAG contrast) without bypass.

## Follow-ups

- None. All acceptance criteria met.

## Recommended next step

Run `/mlabs-qa` focused on: home featured cards (social icons present/absent),
business detail page social section, admin `/admin/businesses` list + edit form
save flow.
