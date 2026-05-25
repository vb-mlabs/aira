import { afterEach, describe, expect, it, vi } from "vitest"
import { _setDriverForTesting, storage, type StorageDriver } from "@/lib/storage"

function recordingDriver(opts?: { failOn?: "upload" | "delete" | "download" }): {
  driver: StorageDriver
  uploads: { key: string; contentType: string }[]
  deletes: string[]
} {
  const uploads: { key: string; contentType: string }[] = []
  const deletes: string[] = []
  const driver: StorageDriver = {
    name: "recording",
    upload: vi.fn(async (args) => {
      if (opts?.failOn === "upload") throw new Error("upload boom")
      uploads.push({ key: args.key, contentType: args.contentType })
      return { url: `/api/storage/${args.key}` }
    }),
    delete: vi.fn(async (key) => {
      if (opts?.failOn === "delete") throw new Error("delete boom")
      deletes.push(key)
    }),
    download: vi.fn(async (key) => {
      if (opts?.failOn === "download") throw new Error("download boom")
      return { body: Buffer.from(`bytes-for-${key}`), contentType: "image/png" }
    }),
    getUrl: (key) => `/api/storage/${key}`,
  }
  return { driver, uploads, deletes }
}

afterEach(() => {
  _setDriverForTesting(null)
})

describe("storage facade", () => {
  it("upload returns a URL through the proxy route", async () => {
    const { driver, uploads } = recordingDriver()
    _setDriverForTesting(driver)

    const result = await storage.upload({
      key: "avatars/abc.jpg",
      body: Buffer.from("fake jpg"),
      contentType: "image/jpeg",
    })

    expect(result.url).toBe("/api/storage/avatars/abc.jpg")
    expect(uploads).toEqual([{ key: "avatars/abc.jpg", contentType: "image/jpeg" }])
  })

  it("delete forwards to the active driver", async () => {
    const { driver, deletes } = recordingDriver()
    _setDriverForTesting(driver)

    await storage.delete("avatars/abc.jpg")
    expect(deletes).toEqual(["avatars/abc.jpg"])
  })

  it("download returns body + contentType", async () => {
    const { driver } = recordingDriver()
    _setDriverForTesting(driver)

    const result = await storage.download("avatars/abc.jpg")
    expect(result.body.toString()).toBe("bytes-for-avatars/abc.jpg")
    expect(result.contentType).toBe("image/png")
  })

  it("getUrl uses the driver's URL builder", () => {
    const { driver } = recordingDriver()
    _setDriverForTesting(driver)

    expect(storage.getUrl("foo/bar.png")).toBe("/api/storage/foo/bar.png")
  })

  it("driver upload failure bubbles (caller surfaces the error)", async () => {
    const { driver } = recordingDriver({ failOn: "upload" })
    _setDriverForTesting(driver)

    await expect(
      storage.upload({
        key: "avatars/x.jpg",
        body: Buffer.from(""),
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow("upload boom")
  })
})
