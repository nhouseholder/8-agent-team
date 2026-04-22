# Changelog

All notable changes to the Agent Orchestration System.

> Historical note: release entries describe the architecture that existed at the time. For the current runtime surface, treat `opencode.json`, `agents/*.md`, and `README.md` as source of truth.

- Added a build-time prompt composition pipeline that generates `agents/generated/*.md` and `agents/generated/manifest.json`
- Added shared `completion-gate.md` and `council-kernel.md` runtime modules
- Switched `opencode.json` to execute generated prompts instead of raw source prompts
- Rebuilt `scripts/validate-agents.js` to check composition markers, generated prompt freshness, registry wiring, and reasoning scenarios
## [Unreleased]

## [1.8.0] - 2026-04-22

### Audit
- Full system audit completed: 234 files inventoried, 15 issues identified

### Memory
- Checkpoint protocol formalized with C1/C2/C3 triggers (Pre-Compaction, Post-Delegation, Session-End)

### Anti-patterns
- Archive rotation implemented for stale pattern management

### Docs
- Migration from Claude to OpenCode completed

## [1.7.1] - 2026-04-21

### Fixed
- Removed the unsupported top-level `models` block that had been reintroduced into `opencode.json`, which was causing OpenCode to reject the config with `Unrecognized key: "models"`
- Restored the dynamic model-inheritance contract in `opencode.json`, `examples/minimal.json`, `examples/openrouter-council.json`, `scripts/validate-reasoning-scenarios.js`, and `docs/ARCHITECTURE.md`
- Reconfirmed that the live installed config at `~/.config/opencode/opencode.json` parses cleanly after reinstalling the runtime assets

## [1.7.0] - 2026-04-21

### Added
- Scoped validation: `scripts/validate-agents.js --agent=<name> --check=<type>` for <200ms iteration
- Incremental prompt generation: `scripts/compose-prompts.js` rebuilds only changed prompts via mtime
- Council Gate: multi-model consensus now triggers only on explicit request, irreversible decisions, or high-stakes competing paths
- Strategist Devil's Advocate mode for low-stakes "should we" questions

### Changed
- Renamed 10 skills in `~/.config/opencode/skills/` to disambiguate from agents (designer→ui-design-system, strategist→planning-kit, etc.)
- Version bumps: opencode.json, examples/*.json all updated to 1.7.0

## [1.6.1] - 2026-04-21

### Fixed
- Reframed the fast/slow model as a Kahneman-style operating contract instead of a literal dual-process claim
- Locked clear prompts against silent reinterpretation and stopped slow-mode rerouting on unchanged evidence
- Kept concrete patch/wire/finalize/update/integrate requests on the execution route instead of bouncing them into meta-analysis or planning
- Synchronized public docs with the 22-step orchestrator routing and the current `@generalist` prompt
- Removed the GSD workflow layer from the repo surface and restored docs/config to the core 8-agent product
- Corrected handoff version-history labels to follow `CHANGELOG.md` as the canonical release history
- Routed broad or unfamiliar reviews through `@explorer -> @auditor` so evaluation starts from a mapped surface instead of generic rediscovery
- Made slow mode model-aware and minimum-effective so already-deliberative models do not inflate analysis on `slow`

### Changed
- Added gist-first slow mode, anti-WYSIATI checks, memory conflict precedence, and bounded council/arbitration rules across the core prompts
- Made slow mode a linear single-pass sequence with explicit terminal states and added validator coverage for intent lock / finite reasoning
- Added warning-only reasoning-contract checks to `scripts/validate-agents.js`
- Simplified `scripts/validate-agents.js` back to the core 8-agent validation surface
- Added a shared cognitive kernel and per-agent fast/slow reasoning triggers across the core prompts
- Added project/date/session memory retrieval conventions to the shared memory protocol
- Added repo ignore rules for local `.opencode/worktrees/` runtime mirrors
- Added model-aware damping and bounded-pass rules to the route-level budget gate and shared cognitive kernel
- Added validator coverage for explorer-before-auditor broad reviews and bounded slow-mode reasoning

## [1.6.0] - 2026-04-20

### Merged: 9 → 8 Agents

- **refiner → @auditor**: REFINE MODE added to auditor. Scans memory for patterns, prioritizes by frequency, proposes improvements with risk tiers (🟢/🟡/🔴). Deleted `agents/refiner.md`.

### Added
- **Mandatory Memory Checkpoint Protocol (C1/C2/C3)**: Risk-anchored saves instead of vague "after significant work". C1 Pre-Compaction, C2 Post-Delegation, C3 Session-End.

### Updated
- `agents/orchestrator.md`: Updated team list (8 agents), delegation table, routing step 20 → @auditor REFINE MODE
- `agents/auditor.md`: Added REFINE MODE section with Refine Protocol
- `agents/generalist.md`: Fixed output format (added `<next>` tags)
- `README.md`: Updated to 8 agents, version 1.6.0
- `docs/ARCHITECTURE.md`: Updated diagram, agent roles, decision tree (22 steps), memory checkpoint protocol
- `docs/AGENT-REFERENCE.md`: Removed @refiner section, updated @auditor (3 modes), updated @generalist
- `docs/TROUBLESHOOTING.md`: Fixed shipper reference → deploy skill
- `examples/*.json`: Removed refiner entries, updated comments to 8-agent
- `CHANGELOG.md`: This file

### Agents (8 total)
- **orchestrator**: Router with 22-step decision tree, chain protocol, memory checkpoints
- **explorer**: Codebase exploration with parallel search protocol
- **strategist**: Architecture, planning, spec-writing, "what's next" (8 modes)
- **researcher**: External research with source hierarchy (Tier 1-3)
- **designer**: UI/UX with intentional minimalism philosophy
- **auditor**: Debug, review, improve, fix (READ/FIX/REFINE modes)
- **council**: Multi-LLM consensus via 3-model fan-out (OpenRouter)
- **generalist**: Plan executor, medium tasks, compaction, deploy

## [1.5.0] - 2026-04-20

### Retooled
- **@generalist**: Rewritten from Swiss Army knife (305 lines) to focused plan executor (~180 lines). PLAN MODE and AUTONOMOUS MODE with backup/verify/checkpoint per step.
- Moved compaction/deploy/summarization to standalone skills (orchestrator invokes directly)

### Added
- **Revert Protocol**: Structured rollback on plan step failure
- **Error Detection & Escalation**: Table-based escalation for generalist failures
- **Two-Phase Compaction Protocol**: Extract to MCP memory first, then summarize

## [1.4.0] - 2026-04-20

### Merged: 10 → 9 Agents
- **shipper → @generalist**: Deploy capabilities absorbed. Shipper was causing broken routing (not registered in opencode.json). Deploy moved to shipper skill.
- Deleted `agents/shipper.md`

## [1.3.0] - 2026-04-20

### Changed
- **brainstormer → @explorer**: Renamed for clarity. Deleted `agents/brainstormer.md`, created `agents/explorer.md`.
- Codified mempalace as READ-ONLY — engram + brain-router for all writes
- Replaced advisory anti-loop guards with structural circuit breakers

## [1.2.0] - 2026-04-19

### Consolidated: 12 → 10 Agents

Merged overlapping agent capabilities to reduce total agent count while keeping each agent's scope wide enough to be useful.

### Merged Agents
- **architect + strategist → @strategist**: Unified into single advisory agent with 8 modes — SKIP, LITE, FULL (spec → plan), SPRINT, ASSESSMENT, BRIEFING, PREDICTIVE, OPPORTUNISTIC. Deleted `agents/architect.md`.
- **debrief → @generalist**: Summarization protocol (SESSION SUMMARY, PROGRESS TRACKER, CODE SIMPLIFICATION) added to generalist's capability spectrum. Deleted `agents/debrief.md`.
- **curator + refiner → @refiner**: Merged into single agent with two modes — INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol). Deleted `agents/curator.md`.

### Updated Files
- `opencode.json`: Updated to 10 agents, removed duplicate strategist entry and debrief entry
- `agents/orchestrator.md`: Updated team list, decision tree, delegation table, custom personalities
- `docs/AGENT-REFERENCE.md`: Updated @strategist section (8 modes, spec/plan workflow), @generalist section (Summarization Protocol), removed @debrief and @architect sections, updated all cross-references
- `CHANGELOG.md`: This file

### Agents (10 total)
- **orchestrator**: Router with 19-step decision tree, chain protocol, error handling
- **brainstormer**: Codebase exploration with parallel search protocol
- **strategist**: Unified advisor — architecture, planning, spec-writing, "what's next" (8 modes)
- **researcher**: External research with source hierarchy (Tier 1-3)
- **designer**: UI/UX with intentional minimalism philosophy
- **auditor**: Dual-mode (READ/FIX) with verification gates
- **council**: Multi-LLM consensus via council_session tool
- **shipper**: Deploy pipeline with pre-flight gates and rollback
- **generalist**: Medium tasks, context compaction, session summarization
- **refiner**: Continuous improvement with INDEX MODE and REFINE MODE

## [1.1.0] - 2026-04-19

### Added
- **@curator** — Continuous improvement backlog from memory synthesis
- **@refiner** — Conservative, targeted improvements with safety gates
- **Curator-Refiner pipeline** — Curator indexes memory → maintains backlog → Refiner reviews and executes tiered improvements
- **Backlog utility** — `scripts/curator-backlog.js` for CLI backlog management
- Validation script for agent configuration
- Example configurations (minimal, standard, with-memory, enterprise)
- Health monitoring framework

### Fixed
- @auditor identity conflict (was "You are Fixer")
- @architect contradictions (READ-ONLY + execute)
- Duplicate text in decision tree step 13
- Missing output formats in 7 agents
- Missing escalation paths in 5 agents
- Missing verification steps in @auditor
- Missing edge cases in decision tree (6 new cases)
- Missing chain recovery protocol

## [1.0.0] - 2026-04-19

### Added
- 12-agent orchestration system with intelligent routing
- 21-step decision tree for task classification
- Multi-agent chain protocol with automatic detection
- Chain recovery: retry → escalate → pause/resume
- Structured output format for all agents
- Escalation protocol for all agents
- Verification steps for @auditor (lsp_diagnostics + tests)
- Three persistent memory systems (engram, mempalace, brain-router)
- Context compaction protocol in @generalist
- Model configuration structure (default/fast/smart/creative)
- Error handling and fallback mechanisms
- Complete documentation (README, USAGE, CHAIN-EXAMPLES, TROUBLESHOOTING, ARCHITECTURE, AGENT-REFERENCE)
- File-based prompt format for all agents
- Contribution guidelines

### Agents
- **orchestrator**: Router with 21-step decision tree, chain protocol, error handling
- **brainstormer**: Codebase exploration with parallel search protocol
- **architect**: Planning & strategy with SKIP/LITE/FULL/SPRINT modes
- **researcher**: External research with source hierarchy (Tier 1-3)
- **designer**: UI/UX with intentional minimalism philosophy
- **auditor**: Dual-mode (READ/FIX) with verification gates
- **council**: Multi-LLM consensus via council_session tool
- **generalist**: Medium tasks with context compaction capabilities
- **strategist**: Strategic recommendations with 4 modes
- **shipper**: Deploy pipeline with pre-flight gates and rollback
- **debrief**: Summaries with 3 modes (session/progress/simplify)
- **refiner**: Continuous improvement with two modes — INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol)
