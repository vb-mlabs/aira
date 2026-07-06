// Categories domain — counts + full DB-backed CRUD.

export {
  getBusinessCountsByCategory,
  getCategoriesByCity,
  getCategoryTree,
  getCategoryBySlug,
  getRootCategoriesForCity,
  createCategory,
  updateCategory,
  updateCategoryWithCascade,
  deactivateCategory,
  reorderCategories,
} from "./queries";
export type {
  UpdateCategoryWithCascadeInput,
  UpdateCategoryWithCascadeResult,
} from "./queries";
