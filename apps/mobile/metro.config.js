// Metro configuration for Expo inside a pnpm monorepo.
//
// Default Metro can't find workspace packages (e.g. @mlabs/validators) because
// they live above the project root. We extend the default config to:
//   1. watchFolders — tells Metro to watch the workspace root for changes.
//   2. nodeModulesPaths — tells Metro's resolver to look in BOTH the local
//      node_modules AND the workspace-root node_modules.
//   3. disableHierarchicalLookup — forces resolution to use the explicit paths
//      above only; prevents pnpm's symlink layout from confusing Metro.
//
// Required because .npmrc has shamefully-hoist=true, which hoists everything
// to the workspace root. Without these settings, expo start fails with
// "Unable to resolve module ..." for any workspace package.

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot = __dirname;
// apps/mobile/ → ../../ is the monorepo root.
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
