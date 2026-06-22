// @aira/services — domain-grouped server-side business logic.
//
// Every function takes (db, ctx, args). Authorization checks live in the
// service, not in the route. Cross-domain calls go through the named
// subpath imports below — never reach into sibling ./<domain>/service.ts
// files. The ESLint rule in @aira/eslint-config enforces this.
//
// Subpath imports:
//   - @aira/services/notifications  — getUnreadCount, listInbox,
//                                       markAllRead, markRead,
//                                       createNotification
//   - @aira/services/messages       — openOrCreate1to1, listConversations,
//                                       listMessages, sendMessage,
//                                       markConversationRead
//   - @aira/services/users          — deleteAccount
//   - @aira/services/admin          — changeRole, banUser, unbanUser,
//                                       preparePasswordReset,
//                                       sendAdminNotification
//   - @aira/services/billing        — getStripe, handleStripeEvent
//                                       (generic Stripe primitives; forks
//                                       add handlers)
//   - @aira/services/businesses     — getFeaturedBusinesses,
//                                       getBusinessesByCategory,
//                                       getBusinessById
//   - @aira/services/categories     — getBusinessCountsByCategory +
//                                       getCategoriesByCity, getCategoryTree,
//                                       createCategory, updateCategory, etc.
//   - @aira/services/cities         — listCities, getCityBySlug,
//                                       createCity, updateCity
//   - @aira/services/app_settings   — getAppSetting, updateAppSetting

export * as notifications from "./notifications"
export * as messages from "./messages"
export * as users from "./users"
export * as admin from "./admin"
export * as billing from "./billing"
export * as businesses from "./businesses"
export * as favorites from "./favorites"
export * as categories from "./categories"
export * as cities from "./cities"
export * as appSettings from "./app_settings"
export * as membershipPlans from "./membership-plans"
export * as businessSubscriptions from "./business-subscriptions"
export * as sponsorshipTiers from "./sponsorship-tiers"
export * as sponsorships from "./sponsorships"
export * as cron from "./cron"
export * as community from "./community"
export * as subscriptionFollowups from "./subscription-followups"
export * as userPreferences from "./user-preferences"
