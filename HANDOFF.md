# Handoff — Agent System Consolidation (12 → 10 Agents)

**Date:** 2026-04-19
**Version:** 1.2.0
**Status:** Validation passed (10/10 agents), ready for review

## What Was Done

### Merged 3 Agent Pairs
1. **architect + strategist → @strategist** — Unified advisory agent with 8 modes: SKIP, LITE, FULL (spec→plan), SPRINT, ASSESSMENT, BRIEFING, PREDICTIVE, OPPORTUNISTIC. Deleted `agents/architect.md`.
2. **debrief → @generalist** — Added Summarization Protocol (SESSION SUMMARY, PROGRESS TRACKER, CODE SIMPLIFICATION) to generalist's capability spectrum. Deleted `agents/debrief.md`.
3. **curator + refiner → @refiner** — Single agent with INDEX MODE (memory scanning, backlog maintenance) and REFINE MODE (conservative improvements with tiered action protocol). Deleted `agents/curator.md`.

### Files Updated
| File | Change |
|---|---|
| `opencode.json` | 10 agents, removed duplicate strategist + debrief entries |
| `agents/orchestrator.md` | Team list, decision tree, delegation table, fallback chain updated |
| `agents/strategist.md` | Merged architect+strategist (8 modes, spec/plan workflow) |
| `agents/generalist.md` | Added Summarization Protocol |
| `agents/refiner.md` | Merged curator+refiner (INDEX/REFINE modes) |
| `docs/AGENT-REFERENCE.md` | Rewrote @strategist section, removed @generalist/@strategist, updated all cross-refs |
| `CHANGELOG.md` | Added v1.2.0 entry with merge details |
| `examples/standard.json` | 10-agent roster, v1.2.0 |
| `examples/with-memory.json` | 10-agent roster, v1.2.0 |
| `examples/enterprise.json` | 10-agent roster, v1.2.0 |

### Validation Fixes (35 → 0 errors)
Fixed all 10 agent files to pass `scripts/validate-agents.js`:
- Added `## Role`, `## Constraints`, `## Output Format`, `## Escalation Protocol` section headers
- Added `description` to frontmatter where missing
- Replaced inline ~200-line memory blocks with `agents/_shared/memory-systems.md` reference
- Updated all `@strategist` references to `@strategist`

## Current 10-Agent Roster
| Agent | Role |
|---|---|
| **orchestrator** | Primary router, 21-step decision tree, chain protocol |
| **brainstormer** | Codebase exploration, parallel search protocol |
| **strategist** | Architecture, planning, spec-writing, "what's next" (8 modes) |
| **researcher** | External research, source hierarchy (Tier 1-3) |
| **designer** | UI/UX, intentional minimalism, 5-phase workflow |
| **auditor** | Dual-mode READ/FIX, verification gates |
| **council** | Multi-LLM consensus via council_session |
| **shipper** | Deploy pipeline, pre-flight gates, rollback |
| **generalist** | Medium tasks, compaction, summarization |
| **refiner** | Continuous improvement, INDEX/REFINE modes |

## Validation Result
```
Agents: 10/10 passed
Errors: 0
Warnings: 2 (benign — READ-ONLY vs implementation language in advisory agents)
Decision Tree Coverage: 11/11 task types
```

## Next Steps
1. **Add GitHub remote** — `git remote add origin <repo-url>` then `git push -u origin main`
2. **Delete removed agent files** — `agents/architect.md`, `agents/debrief.md`, `agents/curator.md` (if still present)
3. **Update README.md** — Architecture diagram still shows 11 agents including @generalist and @strategist
4. **Consider**: The `docs/README.md` still references "8-Agent" and "11-agent" in various places — needs consistency pass to "10-Agent"

## Known Gaps
- `docs/README.md` architecture diagram and agent table still list @strategist and @generalist
- `docs/README.md` header says "8-Agent" — should be "10-Agent"
- `docs/README.md` chain example still references @strategist
- Removed agent prompt files (`architect.md`, `debrief.md`, `curator.md`) may still exist on disk
