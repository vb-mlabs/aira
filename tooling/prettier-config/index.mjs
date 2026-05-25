// @mlabs/prettier-config — shared Prettier preset for every app and package.
//
// Conservative defaults — matches what Next.js + Expo set out of the box,
// plus the Tailwind plugin so class strings stay sorted automatically.
//
// Apps/packages opt in by adding to package.json:
//   "prettier": "@mlabs/prettier-config"
//
// Prettier is NOT currently wired into a `pnpm format` script. The template
// ships the config so forks can adopt formatting cleanly; existing code is
// NOT auto-formatted (avoids a huge stylistic diff at template fork time).

/** @type {import("prettier").Config} */
const config = {
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "all",
  printWidth: 100,
  arrowParens: "always",
  bracketSpacing: true,
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
  // Match how next.js + tailwindcss-plugin discover classnames in our code.
  tailwindFunctions: ["clsx", "cn", "cva", "twMerge"],
};

export default config;
