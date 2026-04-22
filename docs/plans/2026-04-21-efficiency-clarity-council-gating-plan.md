# Plan — 8-Agent v1.7: Efficiency, Clarity & Council Gating

**Date:** 2026-04-21  
**Version:** v1.6.1 → v1.7.0  
**Scope:** 4 items — naming collision, static prompts, scoped validation, council overkill  
**Files affected:** ~15 files across scripts/, agents/, skills/, docs/

---

## Phase 1: Scoped Validation (Item 10) — ~20 lines

**File:** `scripts/validate-agents.js`

### 10.1 Add CLI argument parser
Parse `--agent=<name>`, `--check=<type>`, `--quiet` from `process.argv`.

Supported `--check` values: `source`, `generated`, `registry`, `product`, `scenarios`, `memory`, `all` (default).  
Supported `--agent` values: any key from `SOURCE_PROMPTS` (e.g., `auditor`, `orchestrator`).

### 10.2 Gate check groups by flag
- If `--agent=auditor` → only run `validateSourcePrompt('auditor.md', 'core')` + its generated prompt check. Skip all other agents.
- If `--check=source` → only run `validateSourcePrompts()` + `validateSharedBlocks()`.
- If `--check=registry` → only run `validateRegistry()` + `validateModelConfiguration()`.
- If `--check=product` → only run `validateProductSurfaces()`.
- If `--check=scenarios` → only run `validateReasoningScenarios()`.
- If `--check=memory` → only run `validateRuntimeMemorySurface()`.
- No flags → run all (current behavior).

### 10.3 Update summary output
When scoped, show only the relevant sections in the summary. Add a line: `Scope: <agent or check> (filtered)`.

### 10.4 Add `--quiet` flag
Suppress per-check PASS lines. Only print FAIL lines + final summary. Useful for CI.

**Validation:** `node scripts/validate-agents.js --agent=auditor` should run in <200ms vs ~3s full suite.

---

## Phase 2: Incremental Prompt Generation (Item 9) — ~15 lines

**File:** `scripts/compose-prompts.js`

### 9.1 Add `needsRegeneration()` function
```js
function needsRegeneration(entry) {
  const generatedPath = path.join(ROOT_DIR, entry.generated);
  if (!fs.existsSync(generatedPath)) return true; // missing → must build

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
```

### 9.2 Update `buildEntries()` to accept optional agent filter
```js
function buildEntries(agentFilter = null) {
  return Object.keys(SOURCE_PROMPTS)
    .sort()
    .filter(filename => !agentFilter || filename === `${agentFilter}.md`)
    .map(filename => composePrompt(filename));
}
```

### 9.3 Update `writeOutputs()` to skip unchanged
```js
function writeOutputs(entries) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  let rebuilt = 0;

  for (const entry of entries) {
    if (!needsRegeneration(entry)) continue; // skip — already fresh
    fs.writeFileSync(path.join(ROOT_DIR, entry.generated), `${entry.output.trimEnd()}\n`, "utf8");
    rebuilt++;
  }

  // Always rebuild manifest (it references all entries)
  const manifest = buildManifest(entries);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { rebuilt, total: entries.length };
}
```

### 9.4 Add `--agent=<name>` flag to compose-prompts.js
When `--agent=auditor` is passed, only compose that one prompt. Pass the filter through to `buildEntries()`.

### 9.5 Update console output
```
// Before: "Generated 11 prompts in agents/generated."
// After:  "Regenerated 1/11 prompts in agents/generated (10 already fresh)."
// Or:     "Generated 1 prompt in agents/generated (--agent=auditor)."
```

**Validation:** Edit `agents/auditor.md`, run `node scripts/compose-prompts.js` → only auditor.md rebuilt. Run again immediately → 0 rebuilt.

---

## Phase 3: Skill Renaming (Item 8) — tedious but zero-risk

**Files:** `~/.config/opencode/skills/*/` (10 directories)

### 8.1 Rename skill directories
```
designer           → ui-design-system
strategist         → planning-kit
auditor            → code-review-checklist
researcher         → docs-digger
shipper            → deploy-pipeline
compactor          → context-compactor
debrief            → session-wrap
frontend-design    → visual-craft
website-design-agent → site-builder
architect          → system-architect
```

### 8.2 Update frontmatter `name` field in each `SKILL.md`
Change the `name:` YAML field to match the new directory name.

### 8.3 Update `description` field to clarify scope
Add a brief note in each description that distinguishes it from the agent of the same role. Example:
```yaml
description: >
  Planning and strategy skill (NOT the @strategist agent).
  Combines spec-interview, brainstorming, writing-plans...
```

### 8.4 Update any internal cross-references
Search the skill files for references to other skill names and update them.

### 8.5 Update `opencode.json` if it references any skill names
Check `plugin` array and any skill-related config.

**Validation:** `opencode` starts without errors. Skills trigger on their new names. No agent routing broken.

---

## Phase 4: Council Gating (Item 5) — ~30 lines in orchestrator

**File:** `agents/orchestrator.md`

### 5.1 Add "Internal Devil's Advocate" mode to @strategist
Add a new strategist mode called `DA` (devil's advocate):
```
| "Should we X?" — medium-stakes, reversible | @strategist (DA mode) | One model argues both sides, then decides |
```

### 5.2 Tighten council gate criteria
Update the Idea Routing Sub-Decision table. Council only fires when:
- User explicitly says "use council" or "fan out"
- Decision is **irreversible** (data migration, schema change, framework rewrite)
- Decision has **2+ genuinely competing paths** AND high cost if wrong

All other "should we" questions route to `@strategist` (DA mode or LITE/FULL).

### 5.3 Add council gate keywords
```
Council triggers on: "irreversible", "rewrite", "migrate", "schema change", 
"use council", "fan out", "multi-model", OR explicit high-stakes + competing paths.

Everything else → @strategist (internal debate, one model, both sides).
```

### 5.4 Add strategist DA mode description
```
## Devil's Advocate Mode (DA)
When a medium-stakes decision needs pro/con analysis but not full council:
1. State the proposal in one line
2. Present 2-3 strongest arguments FOR
3. Present 2-3 strongest arguments AGAINST  
4. Weigh the evidence and give a verdict
5. One pass, no fan-out, no multi-model
```

**Validation:** Test with scenarios:
- "Should we use TypeScript?" → strategist (DA mode)
- "Should we rewrite the entire backend in Go?" → council (high-stakes, irreversible)
- "Use council for this" → council (explicit)

---

## Execution Order

| Phase | Item | Depends On | Est. Lines | Risk |
|---|---|---|---|---|
| 1 | Scoped validation (10) | None | ~20 | Low |
| 2 | Incremental prompts (9) | None | ~15 | Low |
| 3 | Skill renaming (8) | None | ~30 (tedious) | Low |
| 4 | Council gating (5) | None | ~30 | Medium |

**Total:** ~95 lines of code changes across 4 phases, all independent and parallelizable.

## Verification Checklist

After all phases:
- [ ] `node scripts/validate-agents.js` — 0 errors, 0 warnings
- [ ] `node scripts/validate-agents.js --agent=auditor` — runs in <200ms
- [ ] `node scripts/validate-agents.js --check=source` — only source checks run
- [ ] `node scripts/compose-prompts.js` — only rebuilds changed prompts
- [ ] `node scripts/compose-prompts.js --agent=auditor` — only auditor rebuilt
- [ ] Skills trigger on new names (spot-check 3)
- [ ] Council only fires on high-stakes/explicit triggers
- [ ] "Should we X?" routes to strategist DA mode
- [ ] `node scripts/validate-reasoning-scenarios.js` — passes

## Rollout

1. Implement all 4 phases in one branch
2. Run full validation suite
3. Bump version to 1.7.0 in `CHANGELOG.md`, `README.md`, `docs/README.md`, examples
4. Commit, push, tag `v1.7.0`
5. Write handoff
