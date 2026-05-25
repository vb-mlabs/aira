// @mlabs/services/billing — generic Stripe primitives.
//
// The template ships:
//   - getStripe(secretKey): lazy SDK singleton, cached by key
//   - handleStripeEvent(db, event, stripe?): event dispatcher with built-in
//     idempotency via the webhook_event table
//
// Forks extend by adding case branches inside handleStripeEvent's switch
// and adding their own domain services (e.g. wallet credit, signal
// purchase) that the cases call. The template intentionally ships an
// empty switch — no domain-specific handlers — so the fork's first Stripe
// integration sets the conventions for that fork.

export { getStripe, type Stripe } from "./stripe-client"
export { handleStripeEvent } from "./webhook"
