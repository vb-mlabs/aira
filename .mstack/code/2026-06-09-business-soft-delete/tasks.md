# Implementation: Business soft-delete + restore (F13 partial)

**Started:** 2026-06-09 20:30
**Finished:** 2026-06-09 21:10
**Review:** [2026-06-09-business-soft-delete](../../reviews/2026-06-09-business-soft-delete.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Tasks

- [x] **T1:** deleted_at column + partial index — commit `92db3a6`
- [x] **T2:** AuditMeta extension — commit `005fbc9`
- [x] **T3+T4 (combined):** Widen validator + filter archived in queries + admin reads — commit `466dc94`
- [x] **T5:** archive/restore service mutations — commit `0f7a079`
- [x] **T6:** archive/restore/listAdmin/getByIdAdmin ops — commit `816c6b9`
- [x] **T7:** POST routes — commit `5d231e3`
- [x] **T8:** /admin/businesses page rework + featured-only bug fix — commit `3551a29`
- [x] **T9:** ArchiveControl + AlertDialog confirm — commit `e0575c0`
- [x] **T10:** admin detail page → getBusinessByIdAdminOp — commit `8db0856`
- [x] **T11:** API smoke + run report — (this commit)
