# Agent System Improvement Plan

**Date:** 2026-04-19
**Status:** Ready for execution
**Scope:** Two-phase improvement — Personal (85%→100%) then Publication (40%→100%)

---

## Phase 1: Personal Use — 85% → 100%

**Goal:** Make the system flawless for daily personal use. Fix all functional gaps, eliminate contradictions, add missing capabilities.

### 1.1 Extract Shared Memory Block → Reference File

**Problem:** 10 agents each carry identical ~200-line memory system blocks (2,083 chars × 10 = 20,830 chars of redundancy).

**Solution:** Create `agents/_shared/memory-systems.md` and replace inline blocks with a reference.

**Files to create:**
- `agents/_shared/memory-systems.md` — single source of truth for all memory system instructions

**Files to modify:**
- All 10 agent prompts in `opencode.json` — replace memory block with: `## Memory Systems\nSee: agents/_shared/memory-systems.md`

**Risk:** Low. OpenCode may not support file references in inline prompts. If it doesn't, we keep inline but at least have a single source file to copy from when updating.

### 1.2 Add Structured Output Format to Every Agent

**Problem:** 7 of 11 agents have no defined output format. Results are inconsistent.

**Agents missing output format:**
- orchestrator, brainstormer, researcher, designer, council, strategist, shipper, debrief

**Solution:** Add a standard output format to each:
```
<summary>What was done</summary>
<output>Agent-specific result</output>
<next>Recommended next step or "complete"</next>
```

**Exception:** @auditor and @generalist already have output formats.

### 1.3 Add Escalation Paths to All Agents

**Problem:** 6 agents have no escalation path when out of depth.

**Agents missing escalation:**
- brainstormer (has it now — added in last round)
- researcher, designer, council, strategist, debrief

**Solution:** Add to each agent:
```
## Escalation Protocol
- If out of depth after 2 attempts → recommend the right specialist
- If task requires capabilities you don't have → say so explicitly
- Never guess or hallucinate — admit uncertainty
```

### 1.4 Add Verification Steps to @auditor

**Problem:** @auditor is the implementation agent but has no verification steps in its prompt.

**Solution:** Add to @auditor prompt:
```
## Verification (always run before reporting complete)
1. lsp_diagnostics on all changed files
2. Run relevant tests if they exist
3. Verify no regressions in adjacent functionality
4. Report verification status in output
```

### 1.5 Add Edge Cases to Decision Tree

**Problem:** These task types fall through the cracks:

| Task | Current Gap | Fix |
|---|---|---|
| "Write tests for existing code" | @auditor or @generalist? | → @auditor (test writing is QA) |
| "Refactor this entire module" | @generalist or @strategist? | → @strategist (plan) → @generalist (implement) |
| "Set up new project from scratch" | Nobody owns this | → @strategist (SPRINT mode) |
| "Migrate framework X to Y" | Complex, multi-agent | → Chain: @researcher → @strategist → @auditor |
| "Write API documentation" | Not explicit | → @generalist |
| "Performance profiling" | Not explicit | → @auditor (review) → @generalist (implement fixes) |

**Solution:** Add these 6 cases to the orchestrator's decision tree (steps 14-19).

### 1.6 Add Chain Recovery Protocol

**Problem:** If a chain breaks mid-sequence (agent fails, hits wall, needs user input), there's no recovery.

**Solution:** Add to orchestrator's chain protocol:
```
## Chain Recovery
- If an agent fails: log the failure, try once more, then escalate
- If an agent needs user input: pause chain, ask user, resume with answer
- If chain exceeds max depth: summarize progress, ask if user wants to continue
- Always save chain state to ledger before pausing
```

### 1.7 Add Agent-Specific Model Selection

**Problem:** All agents use the same model. Cheap tasks waste tokens on expensive model, complex tasks might need more capability.

**Solution:** Configure model per agent based on complexity:
- **orchestrator:** `opencode-go/qwen3.6-plus` (needs reasoning)
- **brainstormer:** `opencode-go/qwen3.6-plus` (fast search)
- **architect:** `opencode-go/qwen3.6-plus` (needs deep reasoning)
- **researcher:** `opencode-go/qwen3.6-plus` (needs comprehension)
- **designer:** `opencode-go/qwen3.6-plus` (needs creativity)
- **auditor:** `opencode-go/qwen3.6-plus` (needs precision)
- **council:** `opencode-go/qwen3.6-plus` (uses council_session tool)
- **strategist:** `opencode-go/qwen3.6-plus` (needs analysis)
- **shipper:** `opencode-go/qwen3.6-plus` (needs precision)
- **generalist:** `opencode-go/qwen3.6-plus` (speed-critical)
- **debrief:** `opencode-go/qwen3.6-plus` (needs summarization)

**Note:** All same model for now since we only have one available. But the config structure should support per-agent model selection for when more models are available.

---

## Phase 2: GitHub Publication — 40% → 100%

**Goal:** Make the system production-ready for public use. Anyone should be able to clone, configure, and run.

### 2.1 Create Documentation Structure

**Files to create:**
```
docs/
├── README.md                    # Main documentation
├── INSTALLATION.md              # Setup guide
├── USAGE.md                     # How to use each agent
├── CHAIN-EXAMPLES.md            # Multi-agent chain examples
├── TROUBLESHOOTING.md           # Common issues and fixes
├── CONTRIBUTING.md              # How to contribute
├── ARCHITECTURE.md              # System design overview
└── AGENT-REFERENCE.md           # Detailed agent specs
```

### 2.2 Convert All Prompts to File-Based Format

**Problem:** 10 agents use inline prompts (hard to version control, hard to read, hard to edit).

**Solution:** Move all prompts to `agents/<name>.md` files with frontmatter:
```markdown
---
name: orchestrator
description: AI coding orchestrator that routes tasks to specialists
mode: primary
---

<prompt content>
```

**Files to create:**
- `agents/orchestrator.md`
- `agents/explorer.md`
- `agents/architect.md`
- `agents/researcher.md`
- `agents/designer.md`
- `agents/auditor.md`
- `agents/council.md`
- `agents/strategist.md`
- `agents/generalist.md`
- `agents/debrief.md`

**Config change:** Update `opencode.json` to use `prompt_file` for all agents.

### 2.3 Add Error Handling & Fallback Mechanisms

**Solution:** Add to orchestrator prompt:
```
## Error Handling Protocol

### Agent Failure
- If an agent returns an error: retry once with clearer instructions
- If retry fails: escalate to next-capable agent or ask user

### Tool Unavailable
- If a required MCP tool is unavailable: skip gracefully, note in output
- If memory systems unavailable: proceed without memory, note in output

### Timeout
- If an agent takes too long: interrupt, save partial results, report status

### Fallback Chain
- @strategist unavailable → @generalist (light planning)
- @researcher unavailable → @generalist (light research)
- @designer unavailable → @generalist (functional UI)
- @auditor unavailable → @generalist (basic debugging)
- @explorer unavailable → orchestrator does targeted search
```

### 2.4 Remove Hardcoded Paths

**Problem:** Designer prompt has `~/.claude/skills/website-design-agent/design-refs/<brand>/DESIGN.md`

**Solution:** Make paths configurable:
```
## Design References
Location: ${DESIGN_REFS_PATH:-~/.claude/skills/website-design-agent/design-refs}
If path doesn't exist: skip brand reference lookup, use design principles directly
```

### 2.5 Add Model Configuration Section

**Solution:** Add to `opencode.json`:
```json
"models": {
  "default": "opencode-go/qwen3.6-plus",
  "fast": "opencode-go/qwen3.6-plus",
  "smart": "opencode-go/qwen3.6-plus",
  "creative": "opencode-go/qwen3.6-plus"
}
```

Then agents reference models by role, not hardcoded string.

### 2.6 Add Version Info & Changelog

**Files to create:**
- `CHANGELOG.md` — semantic versioning, dated entries
- Add `"version": "1.0.0"` to `opencode.json`

### 2.7 Add Testing/Validation Framework

**Solution:** Create `scripts/validate-agents.js`:
```javascript
// Validates:
// 1. All agents have required fields (name, description, mode, prompt)
// 2. No contradictions in prompts (READ-ONLY + execute)
// 3. All agents have output format
// 4. All agents have escalation path
// 5. Decision tree covers all task types
// 6. No hardcoded paths
// 7. Memory blocks are consistent across agents
```

### 2.8 Add Agent Health Monitoring

**Solution:** Create `agents/_shared/health-check.md`:
```markdown
# Agent Health Check

After each agent execution, log:
- Agent name
- Task type
- Success/failure
- Time taken
- Escalation triggered (yes/no)
- User satisfaction (implicit from follow-up)

Store in: thoughts/agent-health/YYYY-MM-DD.jsonl
```

### 2.9 Create Example Configurations

**Files to create:**
```
examples/
├── minimal.json              # Just orchestrator + generalist
├── standard.json             # Full 8-agent system
├── with-memory.json          # Standard + MCP memory systems
└── enterprise.json           # Full + health monitoring + validation
```

### 2.10 Add Contribution Guidelines

**Solution:** Create `CONTRIBUTING.md`:
```markdown
# Contributing

## Adding a New Agent
1. Create `agents/<name>.md` with frontmatter
2. Add to `opencode.json` agent section
3. Add to orchestrator's decision tree
4. Add to delegation table
5. Run `scripts/validate-agents.js`
6. Update docs/AGENT-REFERENCE.md

## Modifying an Agent
1. Edit the agent's `.md` file
2. Run `scripts/validate-agents.js`
3. Test with a sample task
4. Update CHANGELOG.md
```

---

## Execution Order

### Phase 1 (Personal) — 7 tasks, sequential dependencies:
```
1.1 Extract memory block → reference file
  ↓
1.2 Add output formats (depends on 1.1 — cleaner prompts)
  ↓
1.3 Add escalation paths (depends on 1.2)
  ↓
1.4 Add verification to @auditor (independent)
  ↓
1.5 Add edge cases to decision tree (independent)
  ↓
1.6 Add chain recovery (depends on 1.5)
  ↓
1.7 Add model selection config (independent)
```

### Phase 2 (Publication) — 10 tasks, parallel where possible:
```
2.1 Create docs structure (independent)
2.2 Convert prompts to files (independent)
2.3 Add error handling (independent)
2.4 Remove hardcoded paths (independent)
2.5 Add model config (independent)
2.6 Add version/changelog (independent)
2.7 Add validation script (depends on 2.2)
2.8 Add health monitoring (independent)
2.9 Add example configs (depends on 2.2)
2.10 Add contribution guidelines (depends on 2.1)
```

---

## Success Criteria

### Phase 1 (Personal 100%):
- [ ] Zero contradictions in any agent prompt
- [ ] All agents have output format, escalation path, verification
- [ ] Decision tree covers all task types (no gaps)
- [ ] Chain protocol has recovery mechanism
- [ ] Memory block extracted to shared reference
- [ ] Model config supports per-agent selection

### Phase 2 (Publication 100%):
- [ ] All prompts in file-based format
- [ ] Complete documentation (README, usage, examples, troubleshooting)
- [ ] Error handling and fallback mechanisms
- [ ] No hardcoded paths
- [ ] Version info and changelog
- [ ] Validation script passes
- [ ] Example configurations work
- [ ] Contribution guidelines clear
- [ ] Health monitoring functional
