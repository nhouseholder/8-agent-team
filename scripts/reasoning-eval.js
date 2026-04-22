#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const FIXTURES = require(path.join(ROOT_DIR, "tests", "golden", "reasoning-cases.js"));

function getByPath(value, pathExpression) {
  return String(pathExpression || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, segment) => (current == null ? undefined : current[segment]), value);
}

function createReasoningHarness() {
  const textCache = new Map();
  const jsonCache = new Map();

  function readText(relativePath) {
    if (!textCache.has(relativePath)) {
      textCache.set(relativePath, fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8"));
    }
    return textCache.get(relativePath);
  }

  function readJson(relativePath) {
    if (!jsonCache.has(relativePath)) {
      jsonCache.set(relativePath, JSON.parse(readText(relativePath)));
    }
    return jsonCache.get(relativePath);
  }

  function resolveSources(assertion) {
    if (assertion.set) {
      return FIXTURES.sourceSets[assertion.set] || [];
    }
    if (assertion.sources) {
      return assertion.sources;
    }
    return assertion.source ? [assertion.source] : [];
  }

  function runAssertion(assertion) {
    const sources = resolveSources(assertion);

    switch (assertion.type) {
      case "regex": {
        const content = readText(assertion.source);
        return new RegExp(assertion.pattern, assertion.flags || "").test(content);
      }
      case "every_regex": {
        const regex = new RegExp(assertion.pattern, assertion.flags || "");
        return sources.every((source) => regex.test(readText(source)));
      }
      case "json_truthy": {
        const value = getByPath(readJson(assertion.source), assertion.path);
        return Boolean(value);
      }
      case "json_missing_or_truthy": {
        const document = readJson(assertion.source);
        const segments = String(assertion.path || "").split(".").filter(Boolean);
        const key = segments.at(-1);
        const parent = segments.length > 1
          ? getByPath(document, segments.slice(0, -1).join("."))
          : document;

        if (!parent || !key || !Object.prototype.hasOwnProperty.call(parent, key)) {
          return true;
        }

        return Boolean(getByPath(document, assertion.path));
      }
      case "json_missing_key": {
        const document = readJson(assertion.source);
        return !Object.prototype.hasOwnProperty.call(document, assertion.key);
      }
      case "json_every_missing_key": {
        const container = getByPath(readJson(assertion.source), assertion.path) || {};
        return Object.values(container).every(
          (entry) => !Object.prototype.hasOwnProperty.call(entry, assertion.key),
        );
      }
      default:
        throw new Error(`Unsupported reasoning assertion type: ${assertion.type}`);
    }
  }

  function runCases() {
    return FIXTURES.cases.map((testCase) => {
      const failures = testCase.assertions
        .filter((assertion) => !runAssertion(assertion))
        .map((assertion) => assertion.message);

      return {
        label: testCase.label,
        category: testCase.category,
        pass: failures.length === 0,
        failures,
      };
    });
  }

  return {
    runCases,
  };
}

module.exports = {
  createReasoningHarness,
};