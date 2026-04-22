#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PACKAGE_PATH = path.join(ROOT_DIR, "package.json");
const OPCODE_CONFIG_PATH = path.join(ROOT_DIR, "opencode.json");
const GENERATED_DIR = path.join(ROOT_DIR, "agents", "generated");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveExecutable(commandName) {
  const pathValue = process.env.PATH || "";
  const pathEntries = pathValue.split(path.delimiter).filter(Boolean);
  const pathExts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  for (const entry of pathEntries) {
    for (const ext of pathExts) {
      const candidate = path.join(entry, `${commandName}${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function compareNodeVersion(current, minimumMajor) {
  const major = Number(current.split(".")[0]);
  return Number.isFinite(major) && major >= minimumMajor;
}

function parseMinimumNodeVersion(engineValue) {
  const match = String(engineValue || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function formatStatus(icon, message) {
  return `${icon} ${message}`;
}

function main() {
  const errors = [];
  const warnings = [];
  const passes = [];

  let pkg;
  let config;

  try {
    pkg = loadJson(PACKAGE_PATH);
    passes.push(formatStatus("PASS", `Loaded package.json for ${pkg.name}@${pkg.version}`));
  } catch (error) {
    errors.push(formatStatus("FAIL", `Could not parse package.json: ${error.message}`));
  }

  try {
    config = loadJson(OPCODE_CONFIG_PATH);
    passes.push(formatStatus("PASS", "Loaded opencode.json"));
  } catch (error) {
    errors.push(formatStatus("FAIL", `Could not parse opencode.json: ${error.message}`));
  }

  if (pkg?.engines?.node) {
    const minimumNodeMajor = parseMinimumNodeVersion(pkg.engines.node);
    if (minimumNodeMajor === null) {
      warnings.push(formatStatus("WARN", `Could not interpret package.json engines.node value: ${pkg.engines.node}`));
    } else if (compareNodeVersion(process.versions.node, minimumNodeMajor)) {
      passes.push(formatStatus("PASS", `Node ${process.versions.node} satisfies engines.node ${pkg.engines.node}`));
    } else {
      errors.push(formatStatus("FAIL", `Node ${process.versions.node} does not satisfy engines.node ${pkg.engines.node}`));
    }
  }

  const opencodePath = resolveExecutable("opencode");
  if (opencodePath) {
    passes.push(formatStatus("PASS", `Found opencode at ${opencodePath}`));
  } else {
    errors.push(formatStatus("FAIL", "OpenCode CLI not found on PATH (expected `opencode`)"));
  }

  if (config?.provider?.openrouter?.options?.apiKey === "YOUR_OPENROUTER_KEY") {
    warnings.push(formatStatus("WARN", "OpenRouter API key is still the placeholder value; this is fine unless you plan to use OpenRouter models"));
  }

  const missingPromptTargets = Object.entries(config?.agent || {})
    .map(([agentName, agentConfig]) => ({ agentName, promptFile: agentConfig.prompt_file }))
    .filter(({ promptFile }) => promptFile)
    .filter(({ promptFile }) => !fs.existsSync(path.join(ROOT_DIR, promptFile)));

  if ((config?.plugin || []).includes("oh-my-opencode-slim")) {
    const pluginPresetPath = path.join(ROOT_DIR, "oh-my-opencode-slim.jsonc");
    if (fs.existsSync(pluginPresetPath)) {
      passes.push(formatStatus("PASS", "Found runtime plugin preset: oh-my-opencode-slim.jsonc"));
    } else {
      errors.push(formatStatus("FAIL", "Missing runtime plugin preset required by opencode.json: oh-my-opencode-slim.jsonc"));
    }
  }

  if (missingPromptTargets.length > 0) {
    for (const target of missingPromptTargets) {
      errors.push(formatStatus("FAIL", `Missing generated prompt target for ${target.agentName}: ${target.promptFile}`));
    }
  } else if (fs.existsSync(GENERATED_DIR)) {
    passes.push(formatStatus("PASS", "All configured agent prompt targets exist"));
  }

  for (const [serverName, serverConfig] of Object.entries(config?.mcp || {})) {
    if (!serverConfig?.enabled) {
      continue;
    }

    const commandName = Array.isArray(serverConfig.command) ? serverConfig.command[0] : null;
    if (!commandName) {
      warnings.push(formatStatus("WARN", `Enabled MCP server ${serverName} does not declare a command`));
      continue;
    }

    const executablePath = resolveExecutable(commandName);
    if (executablePath) {
      passes.push(formatStatus("PASS", `Found optional MCP command for ${serverName}: ${commandName}`));
    } else {
      warnings.push(formatStatus("WARN", `Optional MCP command for ${serverName} not found on PATH: ${commandName}`));
    }
  }

  console.log("OpenCode install dependency check\n");
  for (const line of passes) console.log(line);
  for (const line of warnings) console.log(line);
  for (const line of errors) console.log(line);
  console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();