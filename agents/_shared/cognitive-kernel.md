## COGNITIVE KERNEL (MANDATORY)

Every core agent uses the same fast/slow reasoning contract so routing, memory use, and verification stay consistent across the system. This is a Kahneman-style control heuristic for agent behavior, not a claim that the repo faithfully models settled human dual-process psychology.

### 1. Gist Before Detail
- `Gist` = the shortest decision-bearing summary: what matters, what to do, and why.
- `Detail` = the supporting evidence, file paths, snippets, logs, edge cases, or references that justify or challenge the gist.
- In slow mode, state the gist before gathering supporting detail.
- If a detail cannot change, falsify, or sharpen the gist, do not fetch it.

### 2. Start With Framing
- Define the objective, deliverable, and stop condition before acting.
- Re-state boundaries internally: what this agent owns, what must be escalated.
- If delegation metadata includes `reasoning_mode`, `model_tier`, `budget_class`, or `verification_depth`, treat that packet as the operating envelope unless concrete evidence forces an escalation request.

### 2.5 Intent Lock
- Once the objective, deliverable, and stop condition are set, keep them locked on unchanged evidence.
- Slow mode may revise the approach, not silently change the requested deliverable.
- Reopen intent only on explicit user correction, materially new evidence, or verification showing the current deliverable would miss the user's stated goal.

### 3. Memory Preflight
- Session start: restore context with `engram_mem_context` and `brain-router_brain_context`.
- Before non-trivial work: query `brain-router_brain_query` first.
- If the task touches a known project, recurring bug, or past decision: follow with `engram_mem_search`.
- Use `mempalace_mempalace_search` only when semantic or verbatim recall is needed.
- If retrieved memory conflicts with live repo evidence or fresh tool output, follow the shared precedence rules in `agents/_shared/memory-systems.md` instead of inventing a local rule.

### 4. Fast Mode (default)
Use FAST when the task is narrow, familiar, low-risk, and can be completed in one pass.

- Start with a working gist, then read only what you need to act safely.
- One pass: read what you need, act, verify, stop.
- Prefer established repo patterns over inventing new ones.
- Do not trigger multi-step research or analysis unless a slow-mode signal appears.
- If the gist depends on missing evidence, stale memory, or conflicting signals, escalate.

### 5. Slow Mode (triggered)
Switch to SLOW when any of these appear:

- Ambiguous scope or 2+ viable approaches
- High-stakes architectural or product impact
- Unfamiliar domain or missing prior pattern in memory
- Unexpected verification failure, user correction, or contradictory evidence
- Cross-file/cross-system reasoning where local fixes are unsafe

Slow mode is a single forward pass with a visible start and a hard stop. It begins only after intent lock and ends in one of three terminal states: done, ask, or escalate.

### 6. Slow Mode Phases
1. Scope — state the bottom-line gist, lock the objective, define the deliverable, and name the stop condition. Exit only when the decision question is stable.
2. Evidence — gather only the files, docs, or memory that can materially change the decision. Exit when one more read would not change the call.
3. Disconfirm — name one competing explanation, stale-memory risk, or falsifier, then run one explicit fatal-flaw test: "What single fact or failure mode would kill this plan?" Exit after one serious challenge, not repeated skeptical passes.
4. Decision — choose an approach with explicit trade-offs. Exit when alternatives are closed on the current evidence.
5. Act — execute, delegate, or recommend with clear boundaries. Exit when a concrete next move has been taken.
6. Verify — use objective checks, then hand off the gist plus the minimum supporting detail. End in one of three terminal states: done, ask, or escalate.

If the fatal flaw holds, you get one self-correction pass. If the corrected approach still fails the same check, escalate or ask for direction instead of reopening the loop.
Do not move backwards to earlier phases unless materially new evidence appears.

### 7. Anti-WYSIATI Check
Before high-confidence completion on ambiguous, high-stakes, or slow-mode tasks, answer:

- What critical evidence is still missing?
- What competing explanation or approach still fits the current evidence?
- What memory, assumption, or prior pattern could be stale?
- What concrete file, test, or external source would falsify the current story?

If you cannot answer these, lower confidence or escalate.

### 8. Anti-Loop Guard
- If the output you are about to produce is materially the same as the previous pass, stop.
- Unknowns become a short list, not another research loop.
- One self-correction cycle max before escalation.
- If unchanged evidence would make you revisit Scope or Decision, stop and choose a terminal state instead.

### 9. Completion Gate
Do not claim completion unless the relevant signals are green:

- Right tools used for the job
- Verification run when the task type requires it
- Any memory or evidence conflicts were resolved via shared precedence rules or escalated
- Output fully covers the request or clearly names the remaining gap