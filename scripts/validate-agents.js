#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const {
  GENERATED_DIR,
  MANIFEST_PATH,
  REQUIRED_MARKERS,
  SHARED_BLOCKS,
  SOURCE_PROMPTS,
  buildEntries,
  checkOutputs,
} = require("./compose-prompts");
const { runScenarioChecks } = require("./validate-reasoning-scenarios");

const ROOT_DIR = path.resolve(__dirname, "..");
const OPENCODE_CONFIG = path.join(ROOT_DIR, "opencode.json");
const MEMORY_PLUGIN_PATH = path.join(ROOT_DIR, ".opencode/plugins/memory-context-loader.js");
const LEGACY_MEMORY_LOADER_PATH = path.join(ROOT_DIR, "hooks/memory-context-loader.js");
const ROOT_README_PATH = path.join(ROOT_DIR, "README.md");
const STANDARD_EXAMPLE_PATH = path.join(ROOT_DIR, "examples/standard.json");

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function color(str, code) {
  return process.stdout.isTTY ? `${code}${str}${colors.reset}` : str;
}

function pass(str) { return color(str, colors.green); }
function fail(str) { return color(str, colors.red); }
function warn(str) { return color(str, colors.yellow); }
function info(str) { return color(str, colors.cyan); }
function bold(str) { return color(str, colors.bold); }

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.+)$/);
    if (kv) fields[kv[1].trim()] = kv[2].trim();
  }

  return fields;
}

function loadOpencodeConfig() {
  if (!fs.existsSync(OPENCODE_CONFIG)) {
    return { config: null, errors: ["opencode.json not found"] };
  }

  try {
    return { config: JSON.parse(fs.readFileSync(OPENCODE_CONFIG, "utf8")), errors: [] };
  } catch (error) {
    return { config: null, errors: [`Failed to parse opencode.json: ${error.message}`] };
  }
}

function validateSharedBlocks() {
  const errors = [];
  const warnings = [];

  for (const relativePath of Object.values(SHARED_BLOCKS)) {
    const absolutePath = path.join(ROOT_DIR, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing shared block: ${relativePath}`);
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8").trim();
    if (content.length === 0) {
      errors.push(`Empty shared block: ${relativePath}`);
    }

    if (!content.startsWith("## ")) {
      warnings.push(`${relativePath} does not start with a section heading`);
    }
  }

  return { label: "shared prompt blocks", errors, warnings };
}

function validateSourcePrompt(filename, schema) {
  const relativePath = path.posix.join("agents", filename);
  const content = readUtf8(relativePath);
  const errors = [];
  const warnings = [];
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) {
    errors.push("Missing frontmatter block");
  } else {
    for (const field of ["name", "description", "mode"]) {
      if (!frontmatter[field]) {
        errors.push(`Missing frontmatter field: ${field}`);
      }
    }
  }

  if (!/##\s+(Your\s+)?Role/i.test(content) && filename !== "council.md") {
    errors.push("Missing Role section");
  }

  if (schema === "core") {
    if (!/##\s+Shared Runtime Contract/i.test(content)) {
      errors.push("Missing Shared Runtime Contract section");
    }
    if (!/##\s+Output Format/i.test(content)) {
      errors.push("Missing Output Format section");
    }
    if (!content.includes("<summary>") || !content.includes("<next>")) {
      errors.push("Output Format missing <summary> or <next> tag");
    }
    if (!/##\s+(Escalation Protocol|Escalation Rules|Error Detection\s*&\s*Escalation)/i.test(content)) {
      errors.push("Missing Escalation Protocol section");
    }
    if (!/Local Fast\/Slow Ownership|Route-Level Fast\/Slow Ownership/i.test(content)) {
      errors.push("Missing explicit fast/slow ownership section");
    }
    if (filename !== "orchestrator.md" && !/may not reroute sideways/i.test(content)) {
      errors.push("Missing no-lateral-reroute boundary rule");
    }
  }

  if (schema === "council" && !/##\s+Shared Council Arbitration Contract/i.test(content)) {
    errors.push("Missing Shared Council Arbitration Contract section");
  }

  const markerMatches = Array.from(content.matchAll(/@compose:insert\s+([a-z0-9-]+)/g)).map((match) => match[1]);
  for (const marker of REQUIRED_MARKERS[schema]) {
    if (!markerMatches.includes(marker)) {
      errors.push(`Missing required marker: ${marker}`);
    }
  }

  if (/See:\s*agents\/_shared\//i.test(content)) {
    warnings.push("Legacy shared-file reference remains; runtime injection now comes from composition markers");
  }

  return { label: relativePath, errors, warnings };
}

function validateSourcePrompts() {
  return Object.entries(SOURCE_PROMPTS).map(([filename, config]) => validateSourcePrompt(filename, config.schema));
}

function validateGeneratedPrompts(entries) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(GENERATED_DIR)) {
    errors.push(`Missing generated prompt directory: ${path.relative(ROOT_DIR, GENERATED_DIR)}`);
    return { label: "generated prompts", errors, warnings };
  }

  if (!fs.existsSync(MANIFEST_PATH)) {
    errors.push(`Missing generated prompt manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`);
  }

  const freshnessIssues = checkOutputs(entries);
  errors.push(...freshnessIssues);

  for (const entry of entries) {
    const generatedPath = path.join(ROOT_DIR, entry.generated);
    if (!fs.existsSync(generatedPath)) {
      continue;
    }

    const content = fs.readFileSync(generatedPath, "utf8");
    if (/@compose:insert/.test(content)) {
      errors.push(`${entry.generated}: unresolved composition marker present`);
    }
    for (const marker of REQUIRED_MARKERS[entry.schema]) {
      if (!content.includes(`BEGIN GENERATED BLOCK: ${marker}`)) {
        errors.push(`${entry.generated}: missing generated block for ${marker}`);
      }
    }
    if (!content.includes("GENERATED FILE. Edit")) {
      warnings.push(`${entry.generated}: missing generated-file header`);
    }
  }

  return { label: "generated prompts", errors, warnings };
}

function validateRegistry(config) {
  const errors = [];
  const warnings = [];

  for (const filename of Object.keys(SOURCE_PROMPTS)) {
    const agentName = filename.replace(/\.md$/, "");
    const registryEntry = config.agent && config.agent[agentName];

    if (!registryEntry) {
      errors.push(`Missing opencode agent entry: ${agentName}`);
      continue;
    }

    const expectedPromptFile = path.posix.join("agents/generated", filename);
    if (registryEntry.prompt_file !== expectedPromptFile) {
      errors.push(`${agentName}: prompt_file should be ${expectedPromptFile}`);
      continue;
    }

    const generatedPath = path.join(ROOT_DIR, registryEntry.prompt_file);
    if (!fs.existsSync(generatedPath)) {
      errors.push(`${agentName}: generated prompt_file not found (${registryEntry.prompt_file})`);
    }
  }

  return { label: "opencode registry", errors, warnings };
}

function validateModelConfiguration(config) {
  const errors = [];
  const warnings = [];

  if (Object.prototype.hasOwnProperty.call(config, "model") && !config.model) {
    errors.push("If opencode.json defines model, it must be non-empty");
  }

  if (Object.prototype.hasOwnProperty.call(config, "models")) {
    errors.push("Unsupported top-level key in opencode.json: models");
  }

  const overriddenAgents = Object.entries(config.agent || {})
    .filter(([, agentConfig]) => Object.prototype.hasOwnProperty.call(agentConfig, "model"))
    .map(([agentName]) => agentName);

  // Council agents may have explicit model overrides for multi-LLM consensus
  const nonCouncilOverrides = overriddenAgents.filter(a => !a.startsWith("council"));
  if (nonCouncilOverrides.length > 0) {
    errors.push(`Default config should let non-council agents inherit the active orchestrator/session model; remove explicit model override(s): ${nonCouncilOverrides.join(", ")}`);
  }

  if (config.provider?.openrouter?.options?.apiKey === "YOUR_OPENROUTER_KEY") {
    warnings.push("OpenRouter provider is still using the placeholder API key; that's fine unless you select an OpenRouter model at runtime");
  }

  return { label: "model inheritance", errors, warnings };
}

function validateRuntimeMemorySurface(config) {
  const errors = [];
  const warnings = [];

  // Self-contained architecture: file-based memory, no external MCP required
  // Optional MCP servers are allowed but not required
  const hasMcp = Object.prototype.hasOwnProperty.call(config, "mcp");
  if (hasMcp) {
    warnings.push("MCP servers are optional in the self-contained architecture; remove mcp block for zero-dependency setup");
  }

  // Check that file-based memory paths are documented
  const memorySystems = readUtf8("_shared/memory-systems.md");
  if (!/~\/\.opencode\/projects/.test(memorySystems)) {
    errors.push("shared memory systems missing file-based memory path");
  }

  return { label: "runtime memory startup", errors, warnings };
}

function validateProductSurfaces(config) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(ROOT_README_PATH)) {
    errors.push("Missing root README.md");
  } else {
    const readme = fs.readFileSync(ROOT_README_PATH, "utf8");

    if (/DEBATE MODE|council_session/i.test(readme)) {
      errors.push("README.md still advertises stale council terminology");
    }

    if (!/Council Fan-Out Protocol|3-agent multi-LLM consensus protocol/i.test(readme)) {
      warnings.push("README.md should explicitly describe council as a 3-agent fan-out protocol");
    }

    if (!/Broad reviews map before judging/i.test(readme) || !/@explorer \(map\) → @auditor \(review\)/i.test(readme)) {
      warnings.push("README.md should explain that unfamiliar broad reviews route through @explorer before @auditor");
    }
  }

  const memorySystems = readUtf8("_shared/memory-systems.md");
  if (/checkpoint\/ledger/i.test(memorySystems)) {
    errors.push("shared memory systems still use checkpoint/ledger hybrid wording");
  }

  if (/brain-router_brain_query|engram_mem_context|mempalace_mempalace_search/i.test(memorySystems)) {
    warnings.push("shared memory systems still reference MCP tools; consider migrating to file-based language");
  }

  const compactorSkill = readUtf8("skills/compactor/SKILL.md");
  if (/checkpoint\/ledger/i.test(compactorSkill)) {
    errors.push("compactor skill still uses checkpoint/ledger hybrid wording");
  }

  if (!fs.existsSync(STANDARD_EXAMPLE_PATH)) {
    errors.push("Missing examples/standard.json");
    return { label: "product surfaces", errors, warnings };
  }

  let standardExample;
  try {
    standardExample = JSON.parse(fs.readFileSync(STANDARD_EXAMPLE_PATH, "utf8"));
  } catch (error) {
    errors.push(`Failed to parse examples/standard.json: ${error.message}`);
    return { label: "product surfaces", errors, warnings };
  }

  const expectedAgents = config.agent || {};
  const exampleAgents = standardExample.agent || {};
  const configHasModel = Object.prototype.hasOwnProperty.call(config, "model");
  const standardHasModel = Object.prototype.hasOwnProperty.call(standardExample, "model");

  if (standardHasModel !== configHasModel) {
    errors.push(`examples/standard.json should ${configHasModel ? "include" : "omit"} the default model field to match opencode.json`);
  }

  if (configHasModel && standardExample.model !== config.model) {
    errors.push(`examples/standard.json default model should be ${config.model}`);
  }

  if (Object.prototype.hasOwnProperty.call(standardExample, "models")) {
    errors.push("examples/standard.json should not define an unsupported top-level models block");
  }

  for (const [agentName, expected] of Object.entries(expectedAgents)) {
    const exampleEntry = exampleAgents[agentName];
    if (!exampleEntry) {
      errors.push(`examples/standard.json missing agent entry: ${agentName}`);
      continue;
    }

    if (exampleEntry.mode !== expected.mode) {
      errors.push(`examples/standard.json ${agentName} mode should be ${expected.mode}`);
    }

    if (exampleEntry.prompt_file !== expected.prompt_file) {
      errors.push(`examples/standard.json ${agentName} prompt_file should be ${expected.prompt_file}`);
    }

    const expectedHasModel = Object.prototype.hasOwnProperty.call(expected, "model");
    const exampleHasModel = Object.prototype.hasOwnProperty.call(exampleEntry, "model");

    if (expectedHasModel !== exampleHasModel) {
      errors.push(`examples/standard.json ${agentName} should ${expectedHasModel ? "include" : "omit"} an explicit model override`);
      continue;
    }

    if (expectedHasModel && exampleEntry.model !== expected.model) {
      errors.push(`examples/standard.json ${agentName} model should be ${expected.model}`);
    }
  }

  for (const agentName of Object.keys(exampleAgents)) {
    if (!expectedAgents[agentName]) {
      warnings.push(`examples/standard.json includes unrecognized agent entry: ${agentName}`);
    }
  }

  if (standardExample.provider?.openrouter?.options?.apiKey !== "YOUR_OPENROUTER_KEY") {
    warnings.push("examples/standard.json should keep the YOUR_OPENROUTER_KEY placeholder");
  }

  return { label: "product surfaces", errors, warnings };
}

function validateOrchestratorReferences(config) {
  const content = readUtf8("agents/orchestrator.md");
  const errors = [];
  const warnings = [];
  const refs = new Set(Array.from(content.matchAll(/@([a-z][a-z0-9-]+)/gi)).map((match) => match[1]));
  const registeredAgents = new Set(Object.keys(config.agent || {}));

  refs.delete("agent");
  refs.delete("compose");

  for (const ref of refs) {
    if (!registeredAgents.has(ref)) {
      errors.push(`Referenced in orchestrator but not registered in opencode.json: @${ref}`);
    }
  }

  if (!/memory arbitration/i.test(content)) {
    warnings.push("Orchestrator should explicitly mention memory arbitration ownership");
  }

  if (!/Broad review rule:/i.test(content) || !/@explorer[^\n]+@auditor|@explorer → @auditor/i.test(content)) {
    errors.push("Orchestrator must explicitly route unfamiliar broad reviews through @explorer before @auditor");
  }

  return { label: "orchestrator references", errors, warnings };
}

function validateReasoningScenarios() {
  const results = runScenarioChecks();
  return results.map((result) => ({
    label: result.label,
    errors: result.pass ? [] : result.failures,
    warnings: [],
  }));
}

function printResults(title, results) {
  console.log(`\n${bold(`${title}:`)}`);
  for (const result of results) {
    const status = result.errors.length === 0
      ? pass("PASS")
      : fail(`FAIL (${result.errors.length} error${result.errors.length > 1 ? "s" : ""})`);
    console.log(`  ${status}  ${result.label}`);
    for (const error of result.errors) {
      console.log(`    ${fail("✗")} ${error}`);
    }
    for (const warning of result.warnings) {
      console.log(`    ${warn("⚠")} ${warning}`);
    }
  }
}

function sum(results, key) {
  return results.reduce((count, result) => count + result[key].length, 0);
}

function parseArgs(argv) {
  const args = { agent: null, check: null, quiet: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--agent=")) {
      args.agent = arg.slice("--agent=".length);
    } else if (arg.startsWith("--check=")) {
      args.check = arg.slice("--check=".length);
    } else if (arg === "--quiet") {
      args.quiet = true;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const checkGroups = args.check ? new Set(args.check.split(",")) : null;
  const runCheck = (name) => !checkGroups || checkGroups.has(name) || checkGroups.has("all");

  if (!args.quiet) {
    console.log(bold("\n=== Agent Surface Validation ===\n"));
    if (args.agent) console.log(info(`  Scope: agent=${args.agent}`));
    if (args.check) console.log(info(`  Scope: check=${args.check}`));
  }

  const { config, errors: configErrors } = loadOpencodeConfig();
  const entries = buildEntries(args.agent || null);

  let sharedResults = [];
  let sourceResults = [];
  let registryResults = [];
  let productResults = [];
  let generatedResults = [];
  let scenarioResults = [];

  if (runCheck("shared") || runCheck("source") || runCheck("all")) {
    sharedResults = [validateSharedBlocks()];
  }

  if (runCheck("source") || runCheck("all")) {
    if (args.agent) {
      const agentFile = `${args.agent}.md`;
      if (SOURCE_PROMPTS[agentFile]) {
        sourceResults = [validateSourcePrompt(agentFile, SOURCE_PROMPTS[agentFile].schema)];
      } else {
        sourceResults = [{ label: agentFile, errors: [`Unknown agent: ${args.agent}`], warnings: [] }];
      }
    } else {
      sourceResults = validateSourcePrompts();
    }
  }

  if (runCheck("registry") || runCheck("all")) {
    registryResults = configErrors.length > 0
      ? [{ label: "opencode.json", errors: configErrors, warnings: [] }]
      : [validateRegistry(config), validateModelConfiguration(config), validateRuntimeMemorySurface(config), validateOrchestratorReferences(config)];
  }

  if (runCheck("product") || runCheck("all")) {
    productResults = configErrors.length > 0 ? [] : [validateProductSurfaces(config)];
  }

  if (runCheck("generated") || runCheck("all")) {
    generatedResults = [validateGeneratedPrompts(entries)];
  }

  if (runCheck("scenarios") || runCheck("all")) {
    scenarioResults = validateReasoningScenarios();
  }

  if (!args.quiet) {
    if (sharedResults.length) printResults("Shared Blocks", sharedResults);
    if (sourceResults.length) printResults("Source Prompts", sourceResults);
    if (registryResults.length) printResults("Registry", registryResults);
    if (productResults.length) printResults("Product Surfaces", productResults);
    if (generatedResults.length) printResults("Generated Prompts", generatedResults);
    if (scenarioResults.length) printResults("Reasoning Scenarios", scenarioResults);
  }

  const allResults = [
    ...sharedResults,
    ...sourceResults,
    ...registryResults,
    ...productResults,
    ...generatedResults,
    ...scenarioResults,
  ];

  const totalErrors = sum(allResults, "errors");
  const totalWarnings = sum(allResults, "warnings");

  console.log(`\n${bold("=== Summary ===")}`);
  if (args.agent || args.check) {
    console.log(`  Scope:             ${info(args.agent || args.check || "all")}`);
  }
  console.log(`  Source prompts:    ${info(String(sourceResults.length || Object.keys(SOURCE_PROMPTS).length))}`);
  console.log(`  Generated prompts: ${info(String(entries.length))}`);
  console.log(`  Errors:            ${totalErrors === 0 ? pass("0") : fail(String(totalErrors))}`);
  console.log(`  Warnings:          ${totalWarnings === 0 ? "0" : warn(String(totalWarnings))}`);

  if (totalErrors > 0) {
    console.log(`\n${fail("Validation FAILED")}\n`);
    process.exit(1);
  }

  console.log(`\n${pass("Validation PASSED")}\n`);
}

main();
