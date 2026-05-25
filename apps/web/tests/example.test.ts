import { describe, it, expect } from "vitest"
import { brand } from "@mlabs/config"

describe("config/brand", () => {
  it("exposes a brand name", () => {
    expect(brand.name).toBeTruthy()
    expect(typeof brand.name).toBe("string")
  })

  it("exposes a tagline", () => {
    expect(brand.tagline).toBeTruthy()
  })
})
