// Categories domain — counts + full DB-backed CRUD.

export {
  getBusinessCountsByCategory,
  getCategoriesByCity,
  getCategoryTree,
  getCategoryBySlug,
  getRootCategoriesForCity,
  createCategory,
  updateCategory,
  deactivateCategory,
  reorderCategories,
} from "./queries";
