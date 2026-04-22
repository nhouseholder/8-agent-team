#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const GENERATED_DIR = path.join(ROOT_DIR, "agents", "generated");
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-install-smoke-"));
const SCRATCH_HOME = path.join(TEMP_ROOT, "home");
const SCRATCH_CONFIG_DIR = path.join(SCRATCH_HOME, ".config", "opencode");

function runNodeScript(scriptPath) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });
}

function runCommand(command, args, env) {
  return spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

function resolveExecutable(commandName) {
  const pathEntries = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
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

function fail(message, details) {
  console.error(`FAIL ${message}`);
  if (details) {
    console.error(details.trim());
  }
  console.error(`Scratch install left at ${TEMP_ROOT}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function warn(message) {
  console.log(`WARN ${message}`);
}

function main() {
  fs.mkdirSync(SCRATCH_CONFIG_DIR, { recursive: true });

  pass(`Created scratch HOME at ${SCRATCH_HOME}`);

  const composeResult = runNodeScript(path.join(ROOT_DIR, "scripts", "compose-prompts.js"));
  if (composeResult.status !== 0) {
    fail("compose-prompts.js failed before scratch install", composeResult.stderr || composeResult.stdout);
  }
  pass("Prompt composition succeeded before scratch install");

  const installResult = spawnSync(process.execPath, [path.join(ROOT_DIR, "scripts", "install-opencode.js"), "--target", SCRATCH_CONFIG_DIR, "--force"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });
  if (installResult.status !== 0) {
    fail("install-opencode.js failed for the scratch profile", installResult.stderr || installResult.stdout);
  }
  pass("Installed repo-managed runtime assets into the scratch config");

  const scratchConfig = JSON.parse(fs.readFileSync(path.join(SCRATCH_CONFIG_DIR, "opencode.json"), "utf8"));
  const missingPromptTargets = Object.entries(scratchConfig.agent || {})
    .map(([agentName, agentConfig]) => ({ agentName, promptFile: agentConfig.prompt_file }))
    .filter(({ promptFile }) => promptFile)
    .filter(({ promptFile }) => !fs.existsSync(path.join(SCRATCH_CONFIG_DIR, promptFile)));

  if (!fs.existsSync(path.join(SCRATCH_CONFIG_DIR, ".opencode", "plugins", "memory-context-loader.js"))) {
    fail("Scratch install is missing the runtime memory plugin", path.join(SCRATCH_CONFIG_DIR, ".opencode", "plugins", "memory-context-loader.js"));
  }

  if ((scratchConfig.plugin || []).includes("oh-my-opencode-slim")
    && !fs.existsSync(path.join(SCRATCH_CONFIG_DIR, "oh-my-opencode-slim.jsonc"))) {
    fail("Scratch install is missing the plugin preset required by opencode.json", path.join(SCRATCH_CONFIG_DIR, "oh-my-opencode-slim.jsonc"));
  }

  if (missingPromptTargets.length > 0) {
    const missingDetails = missingPromptTargets.map((target) => `${target.agentName}: ${target.promptFile}`).join("\n");
    fail("Scratch config is missing one or more configured prompt targets", missingDetails);
  }
  pass("Scratch config prompt targets and runtime plugin resolve correctly");

  if (scratchConfig.provider?.openrouter?.options?.apiKey === "YOUR_OPENROUTER_KEY") {
    warn("Scratch config still uses the placeholder OpenRouter API key; install remains valid unless OpenRouter models are selected");
  }

  const checkDepsResult = runNodeScript(path.join(ROOT_DIR, "scripts", "check-deps.js"));
  if (checkDepsResult.status !== 0) {
    fail("Dependency check failed before scratch runtime validation", checkDepsResult.stderr || checkDepsResult.stdout);
  }
  pass("Dependency check passed before scratch runtime validation");

  const opencodeExecutable = resolveExecutable("opencode");
  if (!opencodeExecutable) {
    fail("Could not find opencode on PATH for scratch runtime validation");
  }

  const helpResult = runCommand(opencodeExecutable, ["--help"], {
    HOME: SCRATCH_HOME,
    XDG_CONFIG_HOME: path.join(SCRATCH_HOME, ".config"),
  });

  if (helpResult.status !== 0) {
    fail("OpenCode failed to parse the scratch config", helpResult.stderr || helpResult.stdout);
  }
  pass("OpenCode parsed the scratch config successfully");

  console.log(`\nScratch install smoke test passed at ${TEMP_ROOT}`);
}

main();