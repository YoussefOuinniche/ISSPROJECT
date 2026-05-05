const path = require("path");
const fs   = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Support 3D model assets
config.resolver.assetExts.push('glb', 'gltf', 'bin');

// Stable cache key
config.cacheVersion = "9";

// --- Workspace root detection ---
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

const workspaceRoot = findWorkspaceRoot(__dirname);
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

// --- Force Three.js CJS ---
const THREE_CJS = path.resolve(
  workspaceRoot,
  "node_modules/.pnpm/three@0.169.0/node_modules/three/build/three.cjs"
);

// --- Expo file system fix ---
const PNPM = path.resolve(__dirname, "node_modules/.pnpm");
const EFS_STORE  = "expo-file-system@19.0.21_ex_1193765b6b79915ebf3999d4ad95dbe0";
const EMC_STORE  = "expo-modules-core@3.0.29_re_d8d66d5ff832393ebf0d7974e5e37b8f";

const EFS_DIR = path.resolve(PNPM, EFS_STORE, "node_modules/expo-file-system");
const EMC_DIR = path.resolve(PNPM, EMC_STORE, "node_modules/expo-modules-core");

if (!fs.existsSync(path.resolve(__dirname, "node_modules/expo-file-system"))) {
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    "expo-file-system": EFS_DIR,
    "expo-modules-core": EMC_DIR,
  };
  config.watchFolders = [...(config.watchFolders || []), EFS_DIR, EMC_DIR];
}

// --- Custom resolver ---
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "three" ||
    /three[\\/]build[\\/]three(?:\.(?:cjs|js|mjs))?$/.test(moduleName)
  ) {
    return { filePath: THREE_CJS, type: "sourceFile" };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;