# 8-Agent Team — Agent Instructions

## What This Is

An **elaborate prompt template system** for OpenCode. 8 specialized agents route, explore, plan, research, design, audit, arbitrate, and execute coding tasks. No runtime dependencies — pure prompt engineering.

## The 8 Agents

| Agent | Mode | Role |
|---|---|---|
| **orchestrator** | primary | Classify → route → dispatch. Never executes specialist work. |
| **explorer** | all | Codebase reconnaissance, parallel search, mapping |
| **strategist** | all | Architecture decisions, planning, "what's next" |
| **researcher** | all | External docs, APIs, libraries, best practices |
| **designer** | all | UI/UX implementation, visual excellence |
| **auditor** | all | Debugging, code review, conservative improvements |
| **council** | subagent | 3-role arbitration (advocate-for, advocate-against, judge) |
| **generalist** | all | Plan execution, medium tasks, structured build |

## Agent Architecture

```
User Request
    ↓
Orchestrator: Classify + Route
    ↓
Specialist executes → verifies → reports back
    ↓
Orchestrator synthesizes or chains next agent
```

## Core Rules

1. **Orchestrator never executes.** If it types code, it failed.
2. **Err on the side of delegation.** Trivial lookups only.
3. **Search before guessing.** Check memory/files before routing.
4. **Chain automatically.** "Audit then plan then build" needs no manual handoff.
5. **Bounded reasoning.** FAST (0 pulls) → DELIBERATE (1 pull) → SLOW (3 pulls).

## Shared Contracts

All agents import from `_shared/`:
- `cognitive-kernel.md` — 3-tier reasoning (FAST/DELIBERATE/SLOW)
- `memory-systems.md` — File-based memory protocol (no external MCP required)
- `completion-gate.md` — Verification before claiming done
- `council-kernel.md` — Arbitration rules for council rounds

## Quick Reference

| You want... | Route to |
|---|---|
| Find / map / explore | @explorer |
| Plan / strategy / "should we" | @strategist |
| Research / docs / API | @researcher |
| UI / design / frontend | @designer |
| Bug / fix / audit / review | @auditor |
| Build / implement / refactor | @generalist |
| High-stakes arbitration | @council |

## File Layout

```
agents/           # Source prompts (*.md)
  generated/      # Composed prompts (auto-generated, do not edit)
_shared/          # Shared cognitive blocks
scripts/          # compose-prompts.js, validate-agents.js
examples/         # Config examples
skills/           # Skill definitions
```

## Build

```bash
node scripts/compose-prompts.js    # Generate prompts from sources + shared blocks
node scripts/validate-agents.js    # Validate consistency
```

## Install

1. Clone repo
2. Copy `opencode.json` to `~/.config/opencode/opencode.json`
3. Optional: Add OpenRouter API key for council model overrides
4. Run `node scripts/compose-prompts.js`
5. Start OpenCode — orchestrator handles routing automatically
