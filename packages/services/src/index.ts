// @mlabs/services — domain-grouped server-side business logic.
//
// Every function takes (db, ctx, args). Authorization checks live in the
// service, not in the route. Cross-domain calls go through the named
// subpath imports below — never reach into sibling ./<domain>/service.ts
// files. The ESLint rule in @mlabs/eslint-config enforces this.
//
// Subpath imports:
//   - @mlabs/services/notifications  — getUnreadCount, listInbox,
//                                       markAllRead, markRead,
//                                       createNotification
//   - @mlabs/services/messages       — openOrCreate1to1, listConversations,
//                                       listMessages, sendMessage,
//                                       markConversationRead
//   - @mlabs/services/users          — deleteAccount
//   - @mlabs/services/admin          — changeRole, banUser, unbanUser,
//                                       preparePasswordReset,
//                                       sendAdminNotification
//   - @mlabs/services/billing        — getStripe, handleStripeEvent
//                                       (generic Stripe primitives; forks
//                                       add handlers)

export * as notifications from "./notifications"
export * as messages from "./messages"
export * as users from "./users"
export * as admin from "./admin"
export * as billing from "./billing"
