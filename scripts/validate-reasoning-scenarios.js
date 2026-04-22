#!/usr/bin/env node

const { createReasoningHarness } = require("./reasoning-eval");

function runScenarioChecks() {
  return createReasoningHarness().runCases();
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
