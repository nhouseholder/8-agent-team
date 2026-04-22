---
name: compactor
description: Unified context management and session continuity skill. Combines total-recall, strategic-compact, /ledger, and session continuity. Runs in background to preserve critical context across compaction and sessions.
use_when: >
  The user explicitly says "use compactor", "call compactor", "run compactor",
  "use context manager", "call context manager", "use ledger", "call ledger",
  "use state saver", "call state saver", "use memory", "call memory".
  OR context is getting long, session is about to end, user says "compact", "save context",
  "ledger", "remember this", or starting a new session that needs prior context.
  OR you detect context pressure (responses slowing, tool call count > 50, approaching token limits).
---

# COMPACTOR — Unified Context Management

The single context/continuity skill. Replaces total-recall, strategic-compact, /ledger.

## CRITICAL: Compaction vs Handoff Decision

**This is the #1 cause of sessions getting stuck at 145k+ context.** Follow this decision tree:

| Situation | Action |
|-----------|--------|
| **First time context is low** | Compact — fidelity loss is minimal |
| **After 2+ compactions in a session** | HANDOFF — write handoff.md, start new session |
| **After 3+ compactions in a session** | STRONGLY RECOMMEND new session — context quality degrades significantly |
| **Complex multi-step task still in progress** | HANDOFF — too much state to survive compaction |
| **User has given detailed requirements this session** | HANDOFF — requirements MUST survive intact |
| **Debugging session with deep context** | HANDOFF — root cause analysis needs full detail |
| **Before spawning large agent on heavy context** | Compact first, then spawn — prevents "continue" being impossible |

**Never use extended context to fight compression.** It burns per-minute rate limits. Handoff to a new session instead.

## Background Behavior (always active)

### Context Preservation Points
At logical boundaries (after completing a task, before switching topics, after significant code changes):

```bash
# Capture current state
git status --short
git log --oneline -5
pwd
```

Update `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md`:

```markdown
# Pre-Compact Checkpoint — [Project] — [Date Time]

## Current Task
[What we're working on right now]

## Key Decisions Made
- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

## Critical Context (survives compaction)
- [File paths that matter]
- [Variables/constants that must not change]
- [Patterns/conventions in use]
- [Open questions pending]

## Anti-Patterns to Avoid
- [Specific to this session/project]

## Next Action
[Exactly where to pick up]
```

## Pre-Compaction Checkpoint (MANDATORY)

**Before EVERY compaction, save a checkpoint file.** This is the difference between safe compaction and lossy compaction.

Write to `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md` (overwritten each time):

```markdown
# Pre-Compact Checkpoint — <timestamp>

## What we were doing
<1-2 sentence summary of current task>

## Key numbers / data computed this session
<Any stats, counts, P/L figures, measurements — these WILL be lost in compaction>

## Decisions made
<Approach choices, user preferences stated this session, "we decided X because Y">

## Current progress
<What's done, what's next, any blockers>

## Files modified this session
<List of files changed and why>
```

**After compaction, the first thing to do is re-read this file.** It costs ~200 tokens to read but saves thousands in re-discovery.

**When NOT to checkpoint** (skip the file, just compact):
- Very short sessions (<10 tool calls)
- No data or decisions to preserve
- Session was purely exploratory with no conclusions

## Strategic Compaction

When context approaches limits:

1. **Identify what to keep:**
   - Current task and immediate context
   - Key decisions and their rationale
   - File paths and code patterns
   - Open questions and pending work
   - Anti-patterns discovered

2. **Identify what to discard:**
   - Explored-and-rejected approaches
   - Verbose error messages (keep root cause only)
   - Intermediate debugging steps (keep conclusion only)
   - Repetitive tool outputs

3. **Create compact summary:**
   - 10-15 lines max
   - Preserves all decision rationale
   - Preserves all file paths
   - Preserves all open questions

## Auto-Handoff Protocol (when compaction is NOT appropriate)

When the decision table above says HANDOFF:

1. **Write** `handoff.md` in project memory (`~/.claude/projects/<project>/memory/handoff.md`):
   ```markdown
   # Handoff — [Project] — [Date Time]

   ## Objective
   [What we're trying to achieve]

   ## Current Status
   [Where we are, what's done, what's pending]

   ## Key Decisions
   - [Decision]: [rationale]

   ## Files Modified
   - [path]: [what changed]

   ## Failed Approaches
   - [What we tried and why it didn't work]

   ## Resume Instructions
   [Exactly what to do next, step by step]
   ```

2. **Commit** to GitHub (from /tmp clone if iCloud repo)
3. **Notify** user: "Context compression incoming — handoff prepped. Start new session and say 'read handoff.md and continue'"
4. **Update** `current_work.md` too

## Session Continuity Protocol

### On Session Start:
```bash
# Read the current session checkpoint if it exists
cat ~/.claude/projects/<project>/memory/pre_compact_checkpoint.md 2>/dev/null
# Read project CLAUDE.md, AGENTS.md
# Read recent handoffs
git log --oneline -10
```

### On Session End:
1. Update `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md` with current state
2. Commit ledger changes
3. Output: "Checkpoint saved. Next session will pick up from: [path]"

## Memory Persistence

### Save Rhythm (compaction-paired, NOT scattered)

Memory saves are batched with compaction events — not saved after every task.

| Event | Save action |
|---|---|
| **Before compaction** | Write checkpoint file to disk + `engram_mem_save` key findings + `brain-router_brain_save` critical facts |
| **Session end** | `engram_mem_session_summary` (comprehensive) + final `brain-router_brain_save` |
| **Major decision mid-session** | `engram_mem_save` + `brain-router_brain_save` only — no disk file needed |
| **NEVER** | Do NOT write to mempalace during save rhythm. It's read-only. The checkpoint file handles the human-readable verbatim fallback. |

### Project-Level Memory (disk files)
Each project maintains:
- `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md` — latest session continuity file
- `~/.claude/projects/<project>/memory/handoff.md` — end-of-session summary when compaction is no longer appropriate
- `docs/specs/` — design decisions
- `docs/plans/` — implementation plans

### Global Memory
- `~/.claude/anti-patterns.md` — recurring mistakes across all projects
- `~/.claude/projects/*/memory/MEMORY.md` — project-specific long-term memory

## Compaction Rules

1. **Preserve decisions with rationale** — "why" matters more than "what"
2. **Preserve file paths** — implementers need exact locations
3. **Preserve open questions** — unresolved decisions must survive
4. **Discard exploration dead-ends** — what we tried and rejected
5. **Discard verbose outputs** — keep conclusions, not intermediate steps
6. **Checkpoint before compact** — always save state before context shrinks
7. **Re-inject after compact** — restore critical context from the checkpoint file
8. **Handoff over extended context, always** — never fight compression with rate-limited extended context
9. **Track compaction count** — mentally count compactions; at 2+, switch to handoff
10. **Pre-agent compaction** — before spawning large agents on heavy context, compact first

## Compaction Decision Guide

| Phase Transition | Compact? | Why |
|-----------------|----------|-----|
| Research → Planning | Yes | Research context is bulky; plan is the distilled output |
| Planning → Implementation | Yes | Plan is in TodoWrite or a file; free up context for code |
| Implementation → Testing | Maybe | Keep if tests reference recent code; compact if switching focus |
| Debugging → Next feature | Yes | Debug traces pollute context for unrelated work |
| Mid-implementation | No | Losing variable names, file paths, and partial state is costly |
| After a failed approach | Yes | Clear the dead-end reasoning before trying a new approach |
| **Already compacted once** | **No — use auto-handoff instead** | **Compounding fidelity loss** |

## What Survives Compaction

| Persists | Lost |
|----------|------|
| CLAUDE.md instructions | Intermediate reasoning and analysis |
| TodoWrite task list | File contents you previously read |
| Memory files (`~/.claude/memory/`) | Multi-step conversation context |
| Git state (commits, branches) | Tool call history and counts |
| Files on disk | Nuanced user preferences stated verbally |
