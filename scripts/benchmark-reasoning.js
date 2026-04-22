#!/usr/bin/env node

const { createReasoningHarness } = require("./reasoning-eval");

function main() {
  const results = createReasoningHarness().runCases();
  const total = results.length;
  const passed = results.filter((result) => result.pass).length;
  const failed = total - passed;
  const categories = new Map();

  console.log("Reasoning benchmark\n");

  for (const result of results) {
    const prefix = result.pass ? "PASS" : "FAIL";
    console.log(`${prefix}  [${result.category}] ${result.label}`);
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }

    const bucket = categories.get(result.category) || { total: 0, passed: 0 };
    bucket.total += 1;
    if (result.pass) {
      bucket.passed += 1;
    }
    categories.set(result.category, bucket);
  }

  console.log("\nSummary");
  console.log(`- Cases: ${total}`);
  console.log(`- Passed: ${passed}`);
  console.log(`- Failed: ${failed}`);
  console.log(`- Score: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("\nCategory Scores");

  for (const [category, bucket] of categories.entries()) {
    console.log(`- ${category}: ${bucket.passed}/${bucket.total}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main();