// Composite (created_at, id) cursor encoding.
//
// Wire format: base64url(JSON.stringify({ created_at, id })). The JSON shape
// is captured by MessageCursor below. Base64 keeps it URL-safe; the JSON
// keeps it self-describing for debugging.

export interface MessageCursor {
  created_at: string
  id: string
}

export function encodeCursor(c: MessageCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url")
}

export function decodeCursor(s: string): MessageCursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(s, "base64url").toString("utf8"),
    ) as unknown
    if (
      parsed &&
      typeof parsed === "object" &&
      "created_at" in parsed &&
      "id" in parsed &&
      typeof (parsed as MessageCursor).created_at === "string" &&
      typeof (parsed as MessageCursor).id === "string"
    ) {
      return parsed as MessageCursor
    }
    return null
  } catch {
    return null
  }
}
