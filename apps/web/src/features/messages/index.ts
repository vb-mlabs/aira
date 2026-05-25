// Public surface of features/messages.
//
// Server logic now lives in @mlabs/services/messages — pages, dev seeds,
// and operations import from there. This barrel only re-exports the UI
// components and the shared row types that the components need to talk
// to API responses. No server modules to hide; the package boundary
// itself enforces "client can't import server-only code".

export { ConversationsList } from "./components/conversations-list"
export { Thread } from "./components/thread"
export { NewConversationForm } from "./components/new-conversation-form"
export type { ConversationListItem, MessageRow } from "./types"
