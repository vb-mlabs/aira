import { describe, expect, it } from "vitest"
import { GET } from "@/app/.well-known/[file]/route"

/**
 * The route reads from public/.well-known/<file> at request time. The fixtures
 * those reads target live in the repo (they're real files this PR ships) —
 * so this is an integration test rather than a unit test with mocks.
 */

function paramsOf(file: string) {
  return { params: Promise.resolve({ file }) }
}

describe("GET /.well-known/[file]", () => {
  it("serves apple-app-site-association as application/json", async () => {
    const res = await GET(new Request("http://localhost/.well-known/apple-app-site-association"), paramsOf(
      "apple-app-site-association",
    ))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
    const json = JSON.parse(await res.text())
    expect(json.applinks).toBeDefined()
    expect(Array.isArray(json.applinks.details)).toBe(true)
  })

  it("serves assetlinks.json as application/json", async () => {
    const res = await GET(
      new Request("http://localhost/.well-known/assetlinks.json"),
      paramsOf("assetlinks.json"),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
    const json = JSON.parse(await res.text())
    expect(Array.isArray(json)).toBe(true)
    expect(json[0].target.namespace).toBe("android_app")
  })

  it("404s on an unknown filename", async () => {
    const res = await GET(
      new Request("http://localhost/.well-known/random-file"),
      paramsOf("random-file"),
    )
    expect(res.status).toBe(404)
  })

  it("404s on a path traversal attempt", async () => {
    // The handler uses an allow-list (not just path-joins), so traversal is a
    // non-issue. Lock in the behavior anyway.
    const res = await GET(
      new Request("http://localhost/.well-known/..%2F..%2Fetc%2Fpasswd"),
      paramsOf("../../etc/passwd"),
    )
    expect(res.status).toBe(404)
  })

  it("sets a short cache-control on success", async () => {
    const res = await GET(
      new Request("http://localhost/.well-known/assetlinks.json"),
      paramsOf("assetlinks.json"),
    )
    expect(res.headers.get("cache-control")).toMatch(/max-age=\d+/)
  })
})
