## MEMORY SYSTEMS (MANDATORY)

You have access to three persistent memory systems via MCP tools:

1. **engram** — Cross-session memory for observations, decisions, bugfixes, patterns, and learnings.
   - Use `engram_mem_search` to find past decisions, bugs fixed, patterns, or context from previous sessions
   - Use `engram_mem_context` when you need an explicit recent-context refresh beyond the automatic startup restore
   - Use `engram_mem_save` to save important observations (decisions, architecture, bugfixes, patterns)
   - Use `engram_mem_timeline` to understand chronological context around an observation
   - ALWAYS search engram before starting work on a project you've touched before

2. **mempalace** — Semantic search + verbatim storage. Wings, rooms, and drawers for content that benefits from semantic retrieval.
    - Use `mempalace_mempalace_search` for semantic search across all stored content
    - Use `mempalace_mempalace_list_wings` and `mempalace_mempalace_list_rooms` to explore structure
    - Use `mempalace_mempalace_traverse` to follow cross-wing connections between related topics
    - Use `mempalace_mempalace_kg_query` for knowledge graph queries about entities and relationships
    - Use `mempalace_mempalace_add_drawer` to save verbatim content for semantic search (see Mempalace Write Path below)

3. **brain-router** — Unified memory router that auto-routes between structured facts and conversation history.
   - Use `brain-router_brain_query` for any memory lookup (auto-routes to the right store)
   - Use `brain-router_brain_save` to save structured facts with conflict detection
   - Use `brain-router_brain_context` only when you intentionally need a live structured-memory refresh inside the session

**RULES:**
- At session start: rely on automatic startup restore when available; otherwise call `engram_mem_context` explicitly. Treat brain-router as a live lookup path, not mandatory startup ceremony.
- Before working on known projects: ALWAYS search engram and mempalace for prior decisions and patterns
- **MANDATORY CHECKPOINTS** (3 triggers — see orchestrator's Mandatory Memory Checkpoint Protocol):
  - **C1 Pre-Compaction**: Save to `engram_mem_save` + `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md` before ANY compaction
  - **C2 Post-Delegation**: Save specialist's key finding to `engram_mem_save` after notable results
  - **C3 Session-End**: Save full summary via `engram_mem_session_summary` + `brain-router_brain_save`
- Mempalace is a secondary write target — write verbatim content that benefits from semantic search (see Mempalace Write Path below)
- When uncertain about past decisions: search before guessing
- Memory systems survive across sessions — use them to maintain continuity

## Retrieval Order (MANDATORY)

Use the memory systems in this order unless the task explicitly needs something else:

1. **Project and task framing** — determine project, subsystem, and question first
2. **`brain-router_brain_query`** — fastest broad lookup across structured memory and conversation history
3. **`mempalace_mempalace_search`** — semantic/verbatim recall. One call can surface relevant content without individual observation fetches.
4. **`engram_mem_search`** or **`engram_mem_context`** — structured observations, decisions, bugfixes, patterns
5. **`engram_mem_timeline`** — when sequence matters more than isolated facts

**Why mempalace before engram:** Mempalace semantic search is a single call that returns verbatim content. If it answers the question, no need to fetch individual engram observations. Engram summaries should be tried only after mempalace.

## Retrieval Budget & Circuit Breaker (MANDATORY)

**Hard limit: Max 3 memory tool calls per routing decision.**

| Call # | Tool | Purpose | Stop Condition |
|---|---|---|---|
| 1 | `brain-router_brain_query` | Fast broad lookup | If result answers the question → STOP |
| 2 | `mempalace_mempalace_search` | Semantic/verbatim recall | If result contains the answer → READ IT, STOP |
| 3 | `engram_mem_search` or `engram_mem_context` | Structured observations / recent context | If summaries contain the answer → READ THEM, STOP. If not, proceed with available info. |

**Rules:**
- **No get_observation in the budget.** `engram_mem_get_observation` is NOT part of the 3-call limit. It was the escape hatch that caused 40-call loops. If summaries are insufficient after 3 calls, proceed with available info.
- **Search returned nothing?** Proceed with available info. Do not expand search with broader queries.
- **Circuit breaker:** After 3 calls, budget is exhausted. Proceed with whatever you have. Do not make additional memory calls for the same routing decision.
- **No retry loops.** If a memory call fails or returns empty, that counts toward the 3-call budget. Move on.

## Trust Summaries Rule (MANDATORY)

`engram_mem_context` and `engram_mem_search` return **summaries**, not full content.

**Read the summaries. Stop there.**

- If the summary answers your question → STOP. Do NOT fetch the full observation.
- If the summary is unclear but you have enough context to proceed → STOP.
- Only fetch full content via `engram_mem_get_observation` if:
  - The summary explicitly references a specific file path or code snippet you need
  - The summary contains a decision or bugfix where the exact rationale matters
  - AND you have not already exhausted your 3-call retrieval budget

**Anti-pattern:** Fetching full observations for every search result "just to be thorough." This is what caused the 40-call loop. Summaries are designed to be sufficient. Trust them.

## Mempalace Write Path (MANDATORY)

Mempalace is a **secondary write target** for verbatim content that benefits from semantic search. It does NOT replace engram for structured observations.

### When to Write to Mempalace

| Content Type | Write to Mempalace? | Wing | Room | Why |
|---|---|---|---|---|
| Session summaries (C3) | YES | project name | session-summaries | Large verbatim text, semantic search valuable |
| Research findings / raw sources | YES | project name | research | Verbatim content, semantic search valuable |
| Error logs / debugging traces | YES | project name | errors | Verbatim content, pattern matching valuable |
| Code snippets / examples | YES | project name | code-snippets | Verbatim content, semantic search valuable |
| Pre-compaction checkpoints (C1) | NO | — | — | Already saved to disk + engram |
| Post-delegation findings (C2) | NO | — | — | Short structured observation; engram is sufficient |
| Decision rationales | NO | — | — | Structured gist; engram is sufficient |
| Bugfix patterns | NO | — | — | Structured gist; engram is sufficient |

### How to Write

Use `mempalace_mempalace_add_drawer`:
- `wing`: project name (e.g., "mmalogic", "diamondpredictions")
- `room`: content type from table above
- `content`: verbatim text (never summarized)

### Rate Limit

Max 1 mempalace write per checkpoint trigger. C1 and C2 do NOT write to mempalace. Only C3 (session-end summary) and explicit research/error logging should write.

## Save Conventions

Keep memory entries easy to retrieve by project, topic, and date.

- **Topic key shape**:
   - `project/<project>/decision/<topic>`
   - `project/<project>/bugfix/<topic>`
   - `project/<project>/pattern/<topic>`
   - `session/<project>/<YYYY-MM-DD>`
- **Titles** should start with the project or agent when possible
- **Content** should capture what changed, why, and the exact next step — not raw logs
- **Do not save** tool transcripts, duplicate file contents, or dead-end exploration

## Validation Rules (enforced by brain-router)

The `brain_save` tool enforces these rules automatically:

| Rule | Behavior |
|---|---|
| **Valid types** | `decision`, `architecture`, `bugfix`, `pattern`, `config`, `learning`, `manual` |
| **topic_key required** | Mandatory for `decision`, `architecture`, `bugfix`, `pattern`, `config` |
| **topic_key format** | `^[a-z0-9_-]+(/[a-z0-9_-]+)*$` — lowercase, hyphens, slashes only |
| **Structured content** | Warn if `content` lacks `**` markers (structured format recommended) |
| **No `discovery` type** | Reserved for auto-distill (disabled); use `manual` or `learning` instead |

**Example structured save:**
```json
{
  "title": "Fixed auth loop on token refresh",
  "content": "**What**: Replaced synchronous token refresh with async queue\n**Why**: Multiple concurrent requests triggered overlapping refreshes\n**Where**: src/auth/refresh.ts, src/middleware/auth.ts\n**Learned**: Always debounce token refresh; never rely on client-side clock",
  "type": "bugfix",
  "topic_key": "project/myapp/bugfix/auth-refresh-race"
}
```

## Representation Model

- `Gist` = the shortest action-guiding representation: decision, constraint, route, or hypothesis.
- `Detail` = the evidence needed to verify or challenge the gist: file paths, snippets, logs, timestamps, quoted text.
- Save gist first, then attach only enough detail or references to reconstruct or falsify it later.
- Engram and brain-router should prefer durable gist plus refs. Mempalace and the checkpoint file remain the place to recover verbatim detail.

## Conflict Resolution

Use this when retrieved memory, live repo evidence, and fresh research disagree.

| Priority | Source | Default role |
|---|---|---|
| 1 | Live repo evidence and fresh tool output | Current code, tests, diagnostics, runtime behavior |
| 2 | Fresh official docs or fresh external research | Current truth for third-party APIs and services |
| 3 | Structured memory (brain-router / engram) | Past decisions, patterns, bugfixes, session context |
| 4 | Verbatim memory (mempalace, checkpoint files, notes) | Exact wording, historical detail, quoted context |

- Specialists may detect conflicts, but the orchestrator owns routing and final arbitration.
- Prefer the highest-priority source that can be directly verified now.
- Fresh official docs can outrank stale repo comments or stale memory when the question is about external behavior.
- Do not average contradictions. Write the competing claims, choose one with reason, or escalate.
- If a conflict remains material after one pass, escalate to orchestrator; high-stakes unresolved conflicts may escalate to council once.
- After resolution, save the winning gist plus the losing claims or references so future agents do not rediscover the same contradiction.

## Session Rhythm

- **Session start**: use automatic startup restore when available, then search the active project explicitly
- **Mid-session**: save only at C1/C2 checkpoints or when a decision would be expensive to rediscover
- **Session end**: write one durable summary keyed to project and date so the next session can resume without re-discovery

## Confidence Gate (MANDATORY — all agents)

**Design philosophy:** Confidence is verified by signals, not self-reported. Agents verify their work against objective signals before claiming success.

### Verification Signals
Before claiming a task is complete, check these signals:

| Signal | Check | Green | Red |
|---|---|---|---|
| **tool_call_coverage** | Did you use the right tools for the task? | Used all relevant tools (read, edit, verify) | Skipped verification tools |
| **test_pass_rate** | Do tests pass? | All tests pass or no tests exist | Tests fail or were skipped when they shouldn't be |
| **lsp_clean** | Any LSP errors in changed files? | `lsp_diagnostics` returns clean | Errors found in changed files |
| **conflict_resolution** | Were conflicting signals resolved? | Source conflict resolved or escalated | Memory, repo, or research conflict ignored |
| **output_scope_ratio** | Did you address everything requested? | All requirements addressed | Partial implementation, TODOs left |

### Confidence Assessment
- **Signals clear** (all green): Proceed, claim completion
- **Signals concern** (any red): Note the concern, attempt fix, or escalate

### Low Confidence Protocol
When signals show concern:
1. Do NOT claim the task is complete
2. Identify which signals are red
3. If fixable: attempt fix, re-verify
4. If not fixable: escalate to @auditor or ask user for direction
