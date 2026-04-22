#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

function scenario(label, checks) {
  const failures = checks.filter((check) => !check.pass).map((check) => check.message);
  return { label, pass: failures.length === 0, failures };
}

function runScenarioChecks() {
  const orchestrator = read("agents/orchestrator.md");
  const cognitiveKernel = read("agents/_shared/cognitive-kernel.md");
  const memoryPlugin = read(".opencode/plugins/memory-context-loader.js");
  const specialists = [
    "explorer.md",
    "strategist.md",
    "researcher.md",
    "designer.md",
    "auditor.md",
    "generalist.md",
  ].map((filename) => ({ filename, content: read(path.posix.join("agents", filename)) }));
  const councilPrompt = read("agents/council.md");
  const councilFor = read("agents/council-advocate-for.md");
  const councilAgainst = read("agents/council-advocate-against.md");
  const councilJudge = read("agents/council-judge.md");
  const memorySystems = read("agents/_shared/memory-systems.md");
  const councilKernel = read("agents/_shared/council-kernel.md");
  const opencode = JSON.parse(read("opencode.json"));

  return [
    scenario("orchestrator fast -> agent fast", [
      {
        pass: /Default to fast mode/i.test(orchestrator),
        message: "orchestrator missing fast-by-default routing language",
      },
      {
        pass: specialists.every(({ content }) => /\*\*FAST\*\*/.test(content)),
        message: "one or more specialists missing local FAST ownership",
      },
    ]),
    scenario("orchestrator fast -> agent slow", [
      {
        pass: /recommended mode, not a mandatory one/i.test(orchestrator),
        message: "orchestrator missing recommended-mode-only delegation rule",
      },
      {
        pass: specialists.every(({ content }) => /\*\*SLOW\*\*/.test(content)),
        message: "one or more specialists missing local SLOW ownership",
      },
    ]),
    scenario("orchestrator slow -> agent fast", [
      {
        pass: /Handoff Triggers/i.test(orchestrator) && /Route-Level Fast\/Slow Ownership/i.test(orchestrator),
        message: "orchestrator missing explicit route-level slow-mode trigger contract",
      },
      {
        pass: specialists.every(({ content }) => /may not reroute sideways/i.test(content)),
        message: "one or more specialists missing the no-lateral-reroute boundary rule",
      },
    ]),
    scenario("orchestrator slow -> agent slow", [
      {
        pass: /oscillation control|same-evidence stop rule/i.test(orchestrator),
        message: "orchestrator missing route-level oscillation or same-evidence control",
      },
      {
        pass: specialists.every(({ content }) => /Local Fast\/Slow Ownership/i.test(content)),
        message: "one or more specialists missing explicit local fast/slow ownership",
      },
    ]),
    scenario("council bounded arbitration", [
      {
        pass: /@compose:insert shared-council-kernel/.test(councilPrompt)
          && /@compose:insert shared-council-kernel/.test(councilFor)
          && /@compose:insert shared-council-kernel/.test(councilAgainst)
          && /@compose:insert shared-council-kernel/.test(councilJudge),
        message: "council prompt family missing shared council kernel markers",
      },
      {
        pass: /Same-Evidence Stop Rule/i.test(councilKernel),
        message: "shared council kernel missing same-evidence stop rule",
      },
    ]),
    scenario("memory precedence order", [
      {
        pass: /Conflict Resolution/i.test(memorySystems) && /Priority/i.test(memorySystems),
        message: "shared memory systems missing conflict resolution precedence",
      },
      {
        pass: /memory arbitration/i.test(orchestrator),
        message: "orchestrator missing memory arbitration ownership",
      },
    ]),
    scenario("startup memory runtime surface", [
      {
        pass: /experimental\.chat\.system\.transform/.test(memoryPlugin),
        message: "startup memory plugin missing system-transform hook",
      },
      {
        pass: /engram/.test(memoryPlugin) && /mempalace-mempalace_search/.test(memoryPlugin),
        message: "startup memory plugin missing engram or mempalace restore path",
      },
      {
        pass: /brain-router MCP tools live/i.test(memoryPlugin),
        message: "startup memory plugin missing explicit brain-router live-lookup fallback",
      },
    ]),
    scenario("delegation packet metadata", [
      {
        pass: /reasoning_mode/i.test(orchestrator)
          && /model_tier/i.test(orchestrator)
          && /budget_class/i.test(orchestrator)
          && /verification_depth/i.test(orchestrator),
        message: "orchestrator missing delegation packet metadata contract",
      },
    ]),
    scenario("expensive reasoning budget gate", [
      {
        pass: /Budget Gate/i.test(orchestrator) && /budget justification/i.test(orchestrator),
        message: "orchestrator missing explicit expensive-reasoning budget gate",
      },
      {
        pass: /Budget Justification/i.test(councilKernel),
        message: "shared council kernel missing budget justification discipline",
      },
    ]),
    scenario("slow mode fatal-flaw check", [
      {
        pass: /fatal-flaw|fatal flaw/i.test(cognitiveKernel),
        message: "shared cognitive kernel missing explicit fatal-flaw test in slow mode",
      },
      {
        pass: /one self-correction cycle max|one self-correction pass/i.test(cognitiveKernel),
        message: "shared cognitive kernel missing bounded self-correction rule",
      },
    ]),
    scenario("slow mode is model-aware and bounded", [
      {
        pass: /Minimum-Effective Slow Mode/i.test(cognitiveKernel)
          && /up to 3 additional reads|at most 3 additional evidence pulls/i.test(cognitiveKernel),
        message: "shared cognitive kernel missing model-aware minimum-effective slow mode or bounded evidence rule",
      },
      {
        pass: /Model-aware damping rule/i.test(orchestrator)
          && /prefer `model_tier=smart` over `deep-reasoning`/i.test(orchestrator)
          && /at most 3 additional evidence pulls/i.test(orchestrator),
        message: "orchestrator missing model-aware damping or bounded-pass guard for slow mode",
      },
    ]),
    scenario("stable intent stays locked", [
      {
        pass: /Intent Lock/i.test(orchestrator)
          && /do not silently broaden, decompose, or reinterpret a clear request/i.test(orchestrator),
        message: "orchestrator missing explicit stable-intent lock against silent reinterpretation",
      },
      {
        pass: /Stable intent may be reopened only on/i.test(orchestrator),
        message: "orchestrator missing bounded conditions for reopening intent",
      },
    ]),
    scenario("slow mode linear terminal flow", [
      {
        pass: /single forward pass/i.test(orchestrator) && /act, ask, or escalate/i.test(orchestrator),
        message: "orchestrator missing explicit linear slow-mode pass or terminal-state contract",
      },
      {
        pass: /single forward pass/i.test(cognitiveKernel)
          && /one of three terminal states: done, ask, or escalate/i.test(cognitiveKernel),
        message: "shared cognitive kernel missing explicit single-pass terminal slow-mode contract",
      },
    ]),
    scenario("clear implementation defaults stay concrete", [
      {
        pass: /Clear-scope implementation beats meta-analysis/i.test(orchestrator),
        message: "orchestrator missing the clear-scope implementation routing guard",
      },
      {
        pass: /deliverable is concrete[\s\S]*@generalist/i.test(orchestrator)
          && /deliverable itself is unclear[\s\S]*clarification question/i.test(orchestrator),
        message: "orchestrator missing the concrete-deliverable default-to-generalist escalation rule",
      },
    ]),
    scenario("concrete execution requests stay with the execution owner", [
      {
        pass: /Implementation Ownership Guard/i.test(orchestrator),
        message: "orchestrator missing an explicit implementation-ownership guard",
      },
      {
        pass: /patch, wire, finalize, update, clean up, or integrate/i.test(orchestrator)
          && /Do not divert a concrete change request to planning, council, or open-ended analysis merely because it touches multiple files or still contains local execution choices/i.test(orchestrator),
        message: "orchestrator missing the narrow concrete-execution anti-reroute rule",
      },
    ]),
    scenario("agent model inheritance", [
      {
        pass: Boolean(opencode.model),
        message: "opencode.json missing a default model",
      },
      {
        pass: !Object.prototype.hasOwnProperty.call(opencode, "models"),
        message: "opencode.json should not define an unsupported top-level models block",
      },
      {
        pass: Object.values(opencode.agent || {}).every((agentConfig) => !Object.prototype.hasOwnProperty.call(agentConfig, "model")),
        message: "opencode.json should let all agents inherit the active orchestrator/session model by default",
      },
    ]),
  ];
}

function main() {
  const results = runScenarioChecks();
  const failures = results.filter((result) => !result.pass);

  for (const result of results) {
    const prefix = result.pass ? "PASS" : "FAIL";
    console.log(`${prefix}  ${result.label}`);
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runScenarioChecks };
