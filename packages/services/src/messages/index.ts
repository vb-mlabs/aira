// Messages domain — public surface.

export {
  openOrCreate1to1,
  listConversations,
  getConversationsFreshness,
  getOtherParticipant,
  _requireParticipant,
  listMessages,
  sendMessage,
  markConversationRead,
  MAX_BODY_CHARS,
} from "./service"

export type {
  ConversationListItem,
  MessageRow,
  OpenOrCreate1to1Args,
  ListMessagesArgs,
  SendMessageArgs,
  MarkConversationReadArgs,
} from "./service"

export { encodeCursor, decodeCursor } from "./cursor"
export type { MessageCursor } from "./cursor"
