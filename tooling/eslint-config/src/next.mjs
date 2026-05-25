// @mlabs/eslint-config/next — preset for the Next.js web app.
//
// Layers (in order):
//   1. eslint-config-next/core-web-vitals — Next's recommended rules
//   2. eslint-config-next/typescript      — Next TS rules
//   3. base (MLabs custom rules + no-raw-process-env)
//
// Apps consume this via:
//   import nextConfig from "@mlabs/eslint-config/next";
//   export default nextConfig;

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import baseConfig from "./base.mjs";

const nextConfig = [...nextVitals, ...nextTs, ...baseConfig];

export default nextConfig;
