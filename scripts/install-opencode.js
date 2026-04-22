#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_TARGET_DIR = path.join(os.homedir(), ".config", "opencode");
const RUNTIME_ASSETS = [
  "opencode.json",
  "oh-my-opencode-slim.jsonc",
  path.join("agents", "generated"),
  path.join(".opencode", "plugins"),
];

function parseArgs(argv) {
  const args = {
    force: false,
    dryRun: false,
    target: process.env.OPENCODE_CONFIG_DIR || DEFAULT_TARGET_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      args.force = true;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--target") {
      args.target = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
}

function ensureParentDir(filePath, dryRun) {
  if (dryRun) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyAsset(assetRelativePath, targetDir, force, dryRun) {
  const sourcePath = path.join(ROOT_DIR, assetRelativePath);
  const destPath = path.join(targetDir, assetRelativePath);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing runtime asset in repo: ${assetRelativePath}`);
  }

  const exists = fs.existsSync(destPath);
  if (exists && !force) {
    throw new Error(`Target already exists: ${destPath}. Re-run with --force to overwrite repo-managed runtime files.`);
  }

  if (dryRun) {
    return { assetRelativePath, destPath, skipped: false };
  }

  ensureParentDir(destPath, false);
  fs.cpSync(sourcePath, destPath, { recursive: true, force: true });
  return { assetRelativePath, destPath, skipped: false };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(args.target);
  const copiedAssets = [];

  if (!args.dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const asset of RUNTIME_ASSETS) {
    copiedAssets.push(copyAsset(asset, targetDir, args.force, args.dryRun));
  }

  console.log(`Installed OpenCode runtime assets to ${targetDir}`);
  for (const asset of copiedAssets) {
    console.log(`- ${asset.assetRelativePath}`);
  }
  console.log("\nNotes:");
  console.log("- Replace YOUR_OPENROUTER_KEY in opencode.json only if you plan to use OpenRouter models.");
  console.log("- MCP memory tooling is optional; missing commands degrade memory features but should not block startup.");
}

main();