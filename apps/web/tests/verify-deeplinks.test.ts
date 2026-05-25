import { describe, expect, it } from "vitest"
import {
  fetchManifest,
  validateAasa,
  validateAssetlinks,
} from "../../../scripts/verify-deeplinks"

// ---------- AASA validator ----------

describe("validateAasa", () => {
  const wellFormed = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "ABCDE12345.com.example.app",
          paths: ["/verify*", "/reset-password*"],
        },
      ],
    },
  }

  it("passes when appID matches mobile/app.config.ts and required paths present", () => {
    const findings = validateAasa(wellFormed, {
      iosBundleId: "com.example.app",
      appleTeamId: "ABCDE12345",
    })
    expect(findings.every((f) => f.ok)).toBe(true)
  })

  it("treats the literal placeholder appID as acceptable (template state)", () => {
    const placeholder = {
      applinks: {
        details: [
          {
            appID: "{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}",
            paths: ["/verify*", "/reset-password*"],
          },
        ],
      },
    }
    const findings = validateAasa(placeholder, {
      iosBundleId: null,
      appleTeamId: null,
    })
    expect(findings.every((f) => f.ok)).toBe(true)
  })

  it("fails when applinks.details is missing", () => {
    const findings = validateAasa({}, { iosBundleId: null, appleTeamId: null })
    expect(findings.some((f) => !f.ok)).toBe(true)
    expect(findings[0].message).toMatch(/details missing/i)
  })

  it("fails when required paths are missing", () => {
    const missingPath = {
      applinks: {
        details: [
          { appID: "{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}", paths: ["/verify*"] },
        ],
      },
    }
    const findings = validateAasa(missingPath, {
      iosBundleId: null,
      appleTeamId: null,
    })
    const failed = findings.filter((f) => !f.ok)
    expect(failed.some((f) => f.message.includes("/reset-password*"))).toBe(true)
  })

  it("fails when appID mismatches mobile config and no placeholder used", () => {
    const findings = validateAasa(wellFormed, {
      iosBundleId: "com.example.different",
      appleTeamId: "ZZZZZ99999",
    })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("accepts the `appIDs[]` (array) form", () => {
    const arrayForm = {
      applinks: {
        details: [
          {
            appIDs: ["ABCDE12345.com.example.app"],
            paths: ["/verify*", "/reset-password*"],
          },
        ],
      },
    }
    const findings = validateAasa(arrayForm, {
      iosBundleId: "com.example.app",
      appleTeamId: "ABCDE12345",
    })
    expect(findings.every((f) => f.ok)).toBe(true)
  })
})

// ---------- assetlinks validator ----------

describe("validateAssetlinks", () => {
  const realFingerprint =
    "A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90"

  it("passes a well-formed real fingerprint", () => {
    const ok = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.example.app",
          sha256_cert_fingerprints: [realFingerprint],
        },
      },
    ]
    const findings = validateAssetlinks(ok, { androidPackage: "com.example.app" })
    expect(findings.every((f) => f.ok)).toBe(true)
  })

  it("treats placeholder package + fingerprint as acceptable (template state)", () => {
    const placeholder = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "{{ANDROID_PACKAGE}}",
          sha256_cert_fingerprints: ["{{ANDROID_CERT_SHA256}}"],
        },
      },
    ]
    const findings = validateAssetlinks(placeholder, { androidPackage: null })
    expect(findings.every((f) => f.ok)).toBe(true)
  })

  it("fails when relation is wrong", () => {
    const bad = [
      {
        relation: ["wrong"],
        target: {
          namespace: "android_app",
          package_name: "com.example.app",
          sha256_cert_fingerprints: [realFingerprint],
        },
      },
    ]
    const findings = validateAssetlinks(bad, { androidPackage: null })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("fails when namespace is not android_app", () => {
    const bad = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "web",
          package_name: "com.example.app",
          sha256_cert_fingerprints: [realFingerprint],
        },
      },
    ]
    const findings = validateAssetlinks(bad, { androidPackage: null })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("fails when fingerprints are missing", () => {
    const bad = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.example.app",
          sha256_cert_fingerprints: [],
        },
      },
    ]
    const findings = validateAssetlinks(bad, { androidPackage: null })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("fails on malformed fingerprint", () => {
    const bad = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.example.app",
          sha256_cert_fingerprints: ["NOT-A-VALID-FINGERPRINT"],
        },
      },
    ]
    const findings = validateAssetlinks(bad, { androidPackage: null })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("fails when package_name mismatches mobile config", () => {
    const entries = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.example.app",
          sha256_cert_fingerprints: [realFingerprint],
        },
      },
    ]
    const findings = validateAssetlinks(entries, {
      androidPackage: "com.example.different",
    })
    expect(findings.some((f) => !f.ok)).toBe(true)
  })

  it("rejects a non-array payload", () => {
    const findings = validateAssetlinks({}, { androidPackage: null })
    expect(findings[0].ok).toBe(false)
  })
})

// ---------- fetchManifest (mocked) ----------

describe("fetchManifest", () => {
  it("returns status + content-type + body for the URL", async () => {
    const fakeFetch = (async () =>
      new Response('{"ok": true}', {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch

    const r = await fetchManifest("https://example.com/x", fakeFetch)
    expect(r.status).toBe(200)
    expect(r.contentType).toContain("application/json")
    expect(JSON.parse(r.body)).toEqual({ ok: true })
  })

  it("surfaces non-200 status without throwing", async () => {
    const fakeFetch = (async () =>
      new Response("not found", {
        status: 404,
        headers: { "content-type": "text/plain" },
      })) as unknown as typeof fetch

    const r = await fetchManifest("https://example.com/x", fakeFetch)
    expect(r.status).toBe(404)
    expect(r.contentType).toBe("text/plain")
  })
})
