// Custom ESLint rule: no string literal of the brand name outside an allowlist.
// Reads `brand.name` at lint time from the consumer app's config/brand.ts.
//
// Path resolution: looks for {cwd}/src/config/brand.ts first (Next app layout)
// then {cwd}/apps/web/src/config/brand.ts (monorepo layout). Both work during
// the migration; the latter becomes the only one once src/ moves under apps/web/.
//
// Allowlisted paths can mention the brand verbatim (config/, templates/, legal/,
// translations/) — everywhere else must reference brand.name programmatically.
//
// Triggers on string literals AND template literals containing the brand string.

import fs from "node:fs";
import path from "node:path";

let cachedBrandName = null;

function readBrandName(cwd) {
  if (cachedBrandName !== null) return cachedBrandName;
  // Walk up from the lint cwd looking for the brand source. Order:
  //   1. The canonical @mlabs/config location (monorepo).
  //   2. apps/web/src/config/brand.ts (transitional — pre-Task-3 forks).
  //   3. src/config/brand.ts (single-app fallback).
  const candidates = [
    path.join(cwd, "packages/config/src/brand.ts"),
    path.join(cwd, "../../packages/config/src/brand.ts"),
    path.join(cwd, "apps/web/src/config/brand.ts"),
    path.join(cwd, "src/config/brand.ts"),
  ];
  for (const file of candidates) {
    try {
      const src = fs.readFileSync(file, "utf8");
      const match = src.match(/name:\s*["']([^"']+)["']/);
      if (match) {
        cachedBrandName = match[1];
        return cachedBrandName;
      }
    } catch {
      // try next candidate
    }
  }
  cachedBrandName = "";
  return cachedBrandName;
}

const ALLOW_PATTERNS = [
  /[\\/]src[\\/]config[\\/]/,
  /[\\/]templates[\\/]/,
  /[\\/]legal[\\/]/,
  /[\\/]translations[\\/]/,
  /[\\/]docs[\\/]/,
  /[\\/]e2e[\\/]/, // tests legitimately import brand to assert against it
  /[\\/]tests[\\/]/,
  /[\\/]node_modules[\\/]/,
];

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow string literal of brand.name outside allowlisted paths. Use `brand.name` from @/config/brand instead.",
    },
    schema: [],
    messages: {
      noLiteral:
        "Don't hardcode the brand name '{{name}}'. Import { brand } from '@mlabs/config' and use brand.name.",
    },
  },
  create(context) {
    const cwd = context.cwd ?? process.cwd();
    const brandName = readBrandName(cwd);
    if (!brandName) return {};

    const filename = context.filename ?? context.getFilename();
    if (ALLOW_PATTERNS.some((p) => p.test(filename))) return {};

    function check(node, value) {
      if (typeof value === "string" && value.includes(brandName)) {
        context.report({ node, messageId: "noLiteral", data: { name: brandName } });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value?.cooked);
      },
    };
  },
};
