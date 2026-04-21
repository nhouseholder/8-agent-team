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

function validateModelTiers(config) {
  const errors = [];
  const warnings = [];
  const models = config.models || {};

  for (const tier of ["default", "fast", "smart", "deep-reasoning"]) {
    if (!models[tier]) {
      errors.push(`Missing model tier alias: ${tier}`);
    }
  }

  if (models.fast && models.smart && models.fast === models.smart) {
    errors.push("Model tiers fast and smart must differ");
  }

  if (models.smart && models["deep-reasoning"] && models.smart === models["deep-reasoning"]) {
    errors.push("Model tiers smart and deep-reasoning must differ");
  }

  if (config.agent?.["council-judge"]?.model && models["deep-reasoning"] && config.agent["council-judge"].model !== models["deep-reasoning"]) {
    warnings.push("council-judge model is not aligned with the deep-reasoning tier alias");
  }

  return { label: "model tiers", errors, warnings };
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

function main() {
  console.log(bold("\n=== Agent Surface Validation ===\n"));

  const { config, errors: configErrors } = loadOpencodeConfig();
  const entries = buildEntries();

  const sharedResults = [validateSharedBlocks()];
  const sourceResults = validateSourcePrompts();
  const registryResults = configErrors.length > 0
    ? [{ label: "opencode.json", errors: configErrors, warnings: [] }]
    : [validateRegistry(config), validateModelTiers(config), validateOrchestratorReferences(config)];
  const generatedResults = [validateGeneratedPrompts(entries)];
  const scenarioResults = validateReasoningScenarios();

  printResults("Shared Blocks", sharedResults);
  printResults("Source Prompts", sourceResults);
  printResults("Registry", registryResults);
  printResults("Generated Prompts", generatedResults);
  printResults("Reasoning Scenarios", scenarioResults);

  const allResults = [
    ...sharedResults,
    ...sourceResults,
    ...registryResults,
    ...generatedResults,
    ...scenarioResults,
  ];

  const totalErrors = sum(allResults, "errors");
  const totalWarnings = sum(allResults, "warnings");

  console.log(`\n${bold("=== Summary ===")}`);
  console.log(`  Source prompts:    ${info(String(sourceResults.length))}`);
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
