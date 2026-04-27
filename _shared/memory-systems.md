## MEMORY SYSTEMS (MANDATORY)

You have a persistent memory system implemented as **file-based memory**. No external servers or MCP tools required.

### Storage Locations

| Type | Path | Purpose |
|---|---|---|
| Project memory | `~/.opencode/projects/<project>/memory/` | Per-project decisions, bugfixes, patterns |
| Session memory | `~/.opencode/projects/<project>/memory/sessions/` | Session summaries and checkpoints |
| Codebase map | `thoughts/ledgers/codebase-map.json` | Auto-generated repo structure (if present) |
| Pre-compact checkpoint | `~/.opencode/projects/<project>/memory/pre_compact_checkpoint.md` | Emergency state before context compaction |

### Read Protocol

1. **Project framing** — determine project, subsystem, and question first
2. **Read project memory** — scan `~/.opencode/projects/<project>/memory/` for relevant files
3. **Read session history** — check `sessions/` for recent context
4. **Read codebase map** — if `thoughts/ledgers/codebase-map.json` exists, use it to confirm module boundaries

**Retrieval budget: Max 3 file reads per routing decision.**

| Call # | Action | Stop Condition |
|---|---|---|
| 1 | Scan memory directory for relevant topic files | If answer found → STOP |
| 2 | Read specific memory file(s) matching topic | If summaries contain answer → STOP |
| 3 | Read session history or codebase map | If result helps → STOP. If not, proceed with available info. |

**Rules:**
- After 3 reads, budget is exhausted. Proceed with whatever you have.
- No retry loops. If a file is missing or empty, that counts toward the budget. Move on.
- Trust summaries. Do not read full files "just to be thorough."

### Write Protocol

Save important observations as markdown files in the project memory directory.

**Topic key shape for filenames:**
- `project-<project>-decision-<topic>.md`
- `project-<project>-bugfix-<topic>.md`
- `project-<project>-pattern-<topic>.md`
- `session-<project>-<YYYY-MM-DD>.md`

**Content format:**
```markdown
## Compiled Truth
**What**: [concise description]
**Why**: [reasoning or problem]
**Where**: [files/paths affected]
**Learned**: [gotchas or edge cases]

---
## Timeline
- 2026-04-26T17:00:00: Initial implementation

## Auto-Links
- src/auth/refresh.ts
- TokenRefreshQueue
```

**Mandatory Checkpoints:**
- **C1 Pre-Compaction**: Save checkpoint to `pre_compact_checkpoint.md` before ANY compaction
- **C2 Post-Delegation**: Save specialist's key finding after notable results
- **C3 Session-End**: Save full session summary to `sessions/YYYY-MM-DD.md`

### Conflict Resolution

| Priority | Source | Default role |
|---|---|---|
| 1 | Live repo evidence and fresh tool output | Current code, tests, diagnostics |
| 2 | Fresh official docs or external research | Current truth for third-party APIs |
| 3 | Structured memory (project memory files) | Past decisions, patterns, bugfixes |
| 4 | Verbatim memory (session files, notes) | Exact wording, historical detail |

- Prefer the highest-priority source that can be directly verified now.
- Do not average contradictions. Write competing claims, choose one with reason, or escalate.
- After resolution, save the winning gist plus losing claims so future agents don't rediscover the same contradiction.

### Session Rhythm

- **Session start**: read session memory from the most recent session file
- **Mid-session**: save only at C1/C2 checkpoints or when a decision would be expensive to rediscover
- **Session end**: write one durable summary keyed to project and date

### Confidence Gate (MANDATORY — all agents)

**Verification Signals:**

| Signal | Check | Green | Red |
|---|---|---|---|
| **tool_call_coverage** | Did you use the right tools for the task? | Used all relevant tools | Skipped verification |
| **test_pass_rate** | Do tests pass? | All tests pass or none exist | Tests fail or skipped |
| **lsp_clean** | Any LSP errors in changed files? | Clean | Errors found |
| **conflict_resolution** | Were conflicting signals resolved? | Resolved or escalated | Ignored |
| **output_scope_ratio** | Did you address everything requested? | All requirements addressed | Partial implementation |

**Low Confidence Protocol:**
When signals show concern:
1. Do NOT claim completion
2. Identify which signals are red
3. If fixable: attempt fix, re-verify
4. If not fixable: escalate to @auditor or ask user
