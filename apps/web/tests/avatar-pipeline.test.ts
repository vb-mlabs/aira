import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the modules the pipeline reaches for before importing the pipeline itself.
// vi.mock is hoisted, so factory references must not close over outer state.
vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  },
}))
vi.mock("@/lib/db/audit", () => ({
  audit: vi.fn(async () => undefined),
}))
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import sharp from "sharp"
import {
  _setDriverForTesting,
  storage,
  type StorageDriver,
} from "@/lib/storage"
import { audit } from "@/lib/db/audit"
import {
  AvatarError,
  processAndStoreAvatar,
  removeAvatar,
  MAX_BYTES,
  OUTPUT_SIZE,
} from "@/features/avatar/server/pipeline"

function recordingDriver(): {
  driver: StorageDriver
  uploads: { key: string; contentType: string; body: Buffer }[]
  deletes: string[]
} {
  const uploads: { key: string; contentType: string; body: Buffer }[] = []
  const deletes: string[] = []
  const driver: StorageDriver = {
    name: "recording",
    upload: vi.fn(async (args) => {
      uploads.push({ key: args.key, contentType: args.contentType, body: args.body })
      return { url: `/api/storage/${args.key}` }
    }),
    delete: vi.fn(async (key) => {
      deletes.push(key)
    }),
    download: vi.fn(async () => ({ body: Buffer.from(""), contentType: "image/jpeg" })),
    getUrl: (key) => `/api/storage/${key}`,
  }
  return { driver, uploads, deletes }
}

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer()
}

beforeEach(() => {
  vi.mocked(audit).mockClear()
})

afterEach(() => {
  _setDriverForTesting(null)
})

describe("processAndStoreAvatar", () => {
  it("rejects unsupported MIME types", async () => {
    await expect(
      processAndStoreAvatar({
        userId: "u1",
        previousImageUrl: null,
        bytes: Buffer.from("anything"),
        contentType: "image/gif",
      }),
    ).rejects.toMatchObject({ code: "invalid_mime" })
  })

  it("rejects oversize files", async () => {
    await expect(
      processAndStoreAvatar({
        userId: "u1",
        previousImageUrl: null,
        bytes: Buffer.alloc(MAX_BYTES + 1),
        contentType: "image/png",
      }),
    ).rejects.toMatchObject({ code: "too_large" })
  })

  it("rejects undecodable bytes", async () => {
    const err = await processAndStoreAvatar({
      userId: "u1",
      previousImageUrl: null,
      bytes: Buffer.from("not an image"),
      contentType: "image/png",
    }).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarError)
    expect((err as AvatarError).code).toBe("decode_failed")
  })

  it("resizes to 256×256 JPEG and uploads through storage", async () => {
    const { driver, uploads } = recordingDriver()
    _setDriverForTesting(driver)

    const input = await makePng(800, 600)
    const result = await processAndStoreAvatar({
      userId: "user-abc",
      previousImageUrl: null,
      bytes: input,
      contentType: "image/png",
    })

    expect(uploads).toHaveLength(1)
    const upload = uploads[0]!
    expect(upload.contentType).toBe("image/jpeg")
    expect(upload.key).toMatch(/^avatars\/user-abc-\d+\.jpg$/)
    expect(result.url).toMatch(/^\/api\/storage\/avatars\/user-abc-\d+\.jpg$/)

    const meta = await sharp(upload.body).metadata()
    expect(meta.format).toBe("jpeg")
    expect(meta.width).toBe(OUTPUT_SIZE)
    expect(meta.height).toBe(OUTPUT_SIZE)
  })

  it("audits user.avatar_changed before mutating", async () => {
    const { driver } = recordingDriver()
    _setDriverForTesting(driver)
    const input = await makePng(100, 100)

    await processAndStoreAvatar({
      userId: "user-abc",
      previousImageUrl: null,
      bytes: input,
      contentType: "image/png",
    })

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-abc",
        action: "user.avatar_changed",
      }),
    )
  })

  it("deletes the prior avatar after a successful replace", async () => {
    const { driver, deletes } = recordingDriver()
    _setDriverForTesting(driver)
    const input = await makePng(100, 100)

    await processAndStoreAvatar({
      userId: "user-abc",
      previousImageUrl: "/api/storage/avatars/user-abc-OLD.jpg",
      bytes: input,
      contentType: "image/png",
    })
    // Cleanup is fire-and-forget — wait a tick for the promise chain.
    await new Promise((r) => setTimeout(r, 0))

    expect(deletes).toEqual(["avatars/user-abc-OLD.jpg"])
  })

  it("ignores prior URLs from unknown sources (no accidental delete)", async () => {
    const { driver, deletes } = recordingDriver()
    _setDriverForTesting(driver)
    const input = await makePng(100, 100)

    await processAndStoreAvatar({
      userId: "user-abc",
      previousImageUrl: "https://cdn.example.com/some/avatar.jpg",
      bytes: input,
      contentType: "image/png",
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(deletes).toEqual([])
  })
})

describe("removeAvatar", () => {
  it("audits and deletes the stored object", async () => {
    const { driver, deletes } = recordingDriver()
    _setDriverForTesting(driver)

    await removeAvatar({
      userId: "user-abc",
      previousImageUrl: "/api/storage/avatars/user-abc-old.jpg",
    })

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.avatar_removed" }),
    )
    expect(deletes).toEqual(["avatars/user-abc-old.jpg"])
  })

  it("is a no-op for storage when there's no prior image", async () => {
    const { driver, deletes } = recordingDriver()
    _setDriverForTesting(driver)

    await removeAvatar({ userId: "user-abc", previousImageUrl: null })

    expect(deletes).toEqual([])
  })
})

// Reference the storage facade so importing it doesn't get tree-shaken
// before the driver swap happens.
void storage
