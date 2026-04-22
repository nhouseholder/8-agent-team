#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(ROOT_DIR, "agents");
const GENERATED_DIR = path.join(AGENTS_DIR, "generated");
const MANIFEST_PATH = path.join(GENERATED_DIR, "manifest.json");

const MARKER_RE = /<!--\s*@compose:insert\s+([a-z0-9-]+)\s*-->/g;

const SHARED_BLOCKS = {
  "shared-cognitive-kernel": "_shared/cognitive-kernel.md",
  "shared-memory-systems": "_shared/memory-systems.md",
  "shared-completion-gate": "_shared/completion-gate.md",
  "shared-council-kernel": "_shared/council-kernel.md",
};

const SOURCE_PROMPTS = {
  "orchestrator.md": { schema: "core" },
  "explorer.md": { schema: "core" },
  "strategist.md": { schema: "core" },
  "researcher.md": { schema: "core" },
  "designer.md": { schema: "core" },
  "auditor.md": { schema: "core" },
  "generalist.md": { schema: "core" },
  "council.md": { schema: "council" },
  "council-advocate-for.md": { schema: "council" },
  "council-advocate-against.md": { schema: "council" },
  "council-judge.md": { schema: "council" },
};

const REQUIRED_MARKERS = {
  core: [
    "shared-cognitive-kernel",
    "shared-memory-systems",
    "shared-completion-gate",
  ],
  council: ["shared-council-kernel"],
};

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

function insertGeneratedHeader(content, sourceRelPath, schema) {
  const header = `<!-- GENERATED FILE. Edit ${sourceRelPath} and rerun node scripts/compose-prompts.js. Schema: ${schema}. -->\n`;
  const frontmatterMatch = content.match(/^(---\n[\s\S]*?\n---\n)/);

  if (!frontmatterMatch) {
    return `${header}${content}`;
  }

  return `${frontmatterMatch[1]}${header}${content.slice(frontmatterMatch[1].length)}`;
}

function renderSharedBlock(marker, relativePath) {
  const blockContent = readUtf8(relativePath).trimEnd();
  return [
    `<!-- BEGIN GENERATED BLOCK: ${marker} (${relativePath}) -->`,
    blockContent,
    `<!-- END GENERATED BLOCK: ${marker} -->`,
  ].join("\n");
}

function composePrompt(filename) {
  const sourceRelPath = path.posix.join("agents", filename);
  const generatedRelPath = path.posix.join("agents/generated", filename);
  const schema = SOURCE_PROMPTS[filename].schema;
  const sourceContent = readUtf8(sourceRelPath);
  const markersSeen = [];

  const replacedContent = sourceContent.replace(MARKER_RE, (_, marker) => {
    const blockPath = SHARED_BLOCKS[marker];
    if (!blockPath) {
      throw new Error(`${sourceRelPath}: unknown composition marker \"${marker}\"`);
    }

    markersSeen.push(marker);
    return renderSharedBlock(marker, blockPath);
  });

  const missingMarkers = REQUIRED_MARKERS[schema].filter((marker) => !markersSeen.includes(marker));
  if (missingMarkers.length > 0) {
    throw new Error(`${sourceRelPath}: missing required marker(s): ${missingMarkers.join(", ")}`);
  }

  if (/@compose:insert/.test(replacedContent)) {
    throw new Error(`${sourceRelPath}: unresolved composition marker remains after replacement`);
  }

  const output = insertGeneratedHeader(replacedContent, sourceRelPath, schema);
  const inputHashes = {
    [sourceRelPath]: sha256(sourceContent),
  };

  for (const marker of Array.from(new Set(markersSeen))) {
    const blockPath = SHARED_BLOCKS[marker];
    inputHashes[blockPath] = sha256(readUtf8(blockPath));
  }

  const inputsHash = sha256(JSON.stringify(inputHashes, null, 2));
  const outputHash = sha256(output);

  return {
    source: sourceRelPath,
    generated: generatedRelPath,
    schema,
    markers: Array.from(new Set(markersSeen)).sort(),
    inputHashes,
    inputsHash,
    outputHash,
    output,
  };
}

function buildEntries(agentFilter = null) {
  return Object.keys(SOURCE_PROMPTS)
    .sort()
    .filter((filename) => !agentFilter || filename === `${agentFilter}.md`)
    .map((filename) => composePrompt(filename));
}

function needsRegeneration(entry) {
  const generatedPath = path.join(ROOT_DIR, entry.generated);
  if (!fs.existsSync(generatedPath)) return true;

  const genMtime = fs.statSync(generatedPath).mtimeMs;

  // Check source file
  const sourcePath = path.join(ROOT_DIR, entry.source);
  if (fs.statSync(sourcePath).mtimeMs > genMtime) return true;

  // Check shared block dependencies
  for (const marker of entry.markers) {
    const blockPath = SHARED_BLOCKS[marker];
    if (fs.statSync(path.join(ROOT_DIR, blockPath)).mtimeMs > genMtime) return true;
  }

  return false;
}

function buildManifest(entries) {
  return {
    version: 1,
    prompts: entries.map(({ source, generated, schema, markers, inputHashes, inputsHash, outputHash }) => ({
      source,
      generated,
      schema,
      markers,
      inputHashes,
      inputsHash,
      outputHash,
    })),
  };
}

function writeOutputs(entries) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  let rebuilt = 0;
  for (const entry of entries) {
    if (!needsRegeneration(entry)) continue;
    fs.writeFileSync(path.join(ROOT_DIR, entry.generated), `${entry.output.trimEnd()}\n`, "utf8");
    rebuilt++;
  }

  // Always rebuild manifest (it references all entries)
  const manifest = buildManifest(entries);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, rebuilt, total: entries.length };
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function checkOutputs(entries) {
  const manifest = readManifest();
  const expectedManifest = buildManifest(entries);
  const issues = [];

  if (!manifest) {
    issues.push(`Missing manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`);
  } else if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) {
    issues.push(`Stale manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`);
  }

  for (const entry of entries) {
    const generatedPath = path.join(ROOT_DIR, entry.generated);
    if (!fs.existsSync(generatedPath)) {
      issues.push(`Missing generated prompt: ${entry.generated}`);
      continue;
    }

    const existing = fs.readFileSync(generatedPath, "utf8");
    if (existing !== `${entry.output.trimEnd()}\n`) {
      issues.push(`Stale generated prompt: ${entry.generated}`);
    }
  }

  return issues;
}

function parseArgs(argv) {
  const args = { checkOnly: false, agent: null };
  for (const arg of argv.slice(2)) {
    if (arg === "--check") {
      args.checkOnly = true;
    } else if (arg.startsWith("--agent=")) {
      args.agent = arg.slice("--agent=".length);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  try {
    const entries = buildEntries(args.agent || null);

    if (args.checkOnly) {
      const issues = checkOutputs(entries);
      if (issues.length > 0) {
        for (const issue of issues) {
          console.error(issue);
        }
        process.exit(1);
      }

      console.log(`Generated prompts are fresh (${entries.length} files).`);
      return;
    }

    const { rebuilt, total } = writeOutputs(entries);
    const fresh = total - rebuilt;

    if (args.agent) {
      console.log(`Generated 1 prompt in ${path.relative(ROOT_DIR, GENERATED_DIR)} (--agent=${args.agent}).`);
    } else if (rebuilt === 0) {
      console.log(`All ${total} prompts already fresh in ${path.relative(ROOT_DIR, GENERATED_DIR)}.`);
    } else if (fresh > 0) {
      console.log(`Regenerated ${rebuilt}/${total} prompts in ${path.relative(ROOT_DIR, GENERATED_DIR)} (${fresh} already fresh).`);
    } else {
      console.log(`Generated ${rebuilt} prompts in ${path.relative(ROOT_DIR, GENERATED_DIR)}.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  GENERATED_DIR,
  MANIFEST_PATH,
  REQUIRED_MARKERS,
  SHARED_BLOCKS,
  SOURCE_PROMPTS,
  buildEntries,
  buildManifest,
  checkOutputs,
};
