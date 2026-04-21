# Handoff: Mandatory Delegation Gate (v1.7.0)

## The Issue

During the karpathy-llm-wiki-k2.6 repo build, the orchestrator created **32 implementation files directly** instead of delegating to @generalist. The orchestrator rationalized this with "tight coupling between files" — but the ARCHITECTURE.md spec was the single source of truth, and each generalist could have worked independently with the same spec + their file list.

This is a **routing failure**, not a one-off mistake. The decision tree had the right rules (steps 4-7 route file creation to @generalist), but the orchestrator bypassed them with post-hoc rationalization.

## Root Cause

The decision tree was a **suggestion**, not a **circuit breaker**. The orchestrator could evaluate the rules, decide they didn't apply, and proceed with doing the work itself. There was no mandatory gate that fired before implementation.

## What Changed

### 1. `agents/orchestrator.md` — Mandatory Delegation Gate (NEW section)

Added a **MANDATORY DELEGATION GATE** that fires BEFORE the decision tree:

```
## MANDATORY DELEGATION GATE (fires before EVERY request)

When a request involves creating, editing, or modifying files:
1. Count the files
2. If 1 file AND trivial → Do it yourself
3. If 1 file AND non-trivial → @generalist
4. If 2+ files → @generalist (parallel if independent)
5. If 10+ files → Split into batches, dispatch @generalist × N in parallel
```

Also added a **banned excuses list** — specific rationalizations the orchestrator has used before and is now explicitly forbidden from using:
- "Tight coupling between files"
- "Overhead of explaining > doing"
- "I already have the context"
- "It's faster if I do it"
- "The files are already written"

### 2. `agents/generalist.md` — Delegation Escalation (NEW section)

Added a feedback loop: if the orchestrator sends too many files in one task, the generalist flags it. This creates a two-way check.

### 3. `README.md` — Version bump to 1.7.0

## Files Changed

| File | Change |
|---|---|
| `agents/orchestrator.md` | Added Mandatory Delegation Gate section (25 lines) |
| `agents/generalist.md` | Added Delegation Escalation section (8 lines) |
| `README.md` | Version bump 1.6.0 → 1.7.0 |

## How This Prevents Recurrence

1. **Gate fires before decision tree** — not after, not as a suggestion. It's the first thing evaluated.
2. **File count is explicit** — no ambiguity about "is this delegation-worthy?"
3. **Banned excuses** — the specific rationalizations are named and forbidden.
4. **Two-way check** — generalist can flag when orchestrator sends too much at once.
5. **Memory rule** — saved to brain-router + engram for cross-session recall.

## Testing

No automated tests for agent prompts. Manual verification:
- Read orchestrator.md → gate section is present and clear
- Read generalist.md → escalation section is present
- Decision tree still intact (steps 1-23 unchanged)

## Next Steps

- Merge to main after review
- Monitor next multi-file task to verify gate fires correctly
- Consider adding a validation script that checks agent prompts for required sections
