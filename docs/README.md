# 8-Agent Orchestration System — Documentation

Detailed documentation for the agent orchestration system.

## Documents

| File | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, agent communication patterns |
| [AGENT-REFERENCE.md](AGENT-REFERENCE.md) | Full reference for each agent: modes, capabilities, escalation paths |
| [CHAIN-EXAMPLES.md](CHAIN-EXAMPLES.md) | Multi-agent chain patterns and real examples |
| [USAGE.md](USAGE.md) | How to use the system, configuration, best practices |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions |

## Current Agent Roster (8 total)

| Agent | Role |
|---|---|
| **orchestrator** | Router with 22-step decision tree, memory retrieval, prompt enhancement, chain protocol |
| **explorer** | Codebase exploration with parallel search protocol |
| **strategist** | Unified advisor — architecture, planning, spec-writing, "what's next" (8 modes) |
| **researcher** | External research with source hierarchy (Tier 1-3) |
| **designer** | UI/UX with intentional minimalism philosophy |
| **auditor** | Debug, review, improve, fix (READ/FIX/REFINE modes) |
| **council** | Structured council arbitration via orchestrator fan-out to 3 councillor agents |
| **generalist** | Plan executor, medium tasks, file safety (backup/verify/revert) |

## Sources of Truth

| Concern | Canonical file |
|---|---|
| Core routing behavior | `../agents/orchestrator.md` |
| Source prompts and per-agent identity | `../agents/<name>.md` |
| Shared runtime modules | `../agents/_shared/*.md` |
| Generated runtime prompts | `../agents/generated/<name>.md` |
| Runtime registry | `../opencode.json` |
| Release history | `../CHANGELOG.md` |

## Reasoning Contract

The core prompts use a Kahneman-style fast/slow operating heuristic. Treat it as an agent-control model, not a claim of literal cognitive simulation.

- The canonical prompt contract lives in `../agents/_shared/cognitive-kernel.md`
- Shared memory retrieval and conflict rules live in `../agents/_shared/memory-systems.md`
- Executable runtime prompts are generated into `../agents/generated/` by `../scripts/compose-prompts.js`
- `../opencode.json` points only at generated prompts, not source prompts
- The architecture view of this contract lives in `ARCHITECTURE.md`

## Version

1.7.0 — Scoped validation, incremental prompts, council gating, and skill renaming
