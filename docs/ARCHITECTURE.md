# Architecture Overview

## System Design

The 8-agent orchestration system implements a **router-dispatcher** pattern with **sequential chain** support and **persistent memory** across sessions.

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Orchestrator                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  22-Step Decision Tree                           │   │
│  │  -1. Memory Retrieval                            │   │
│  │   0. Prompt Enhancement                          │   │
│  │  1-22. Routing to specialists                    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Chain Protocol                                  │   │
│  │  - Detect sequential language                    │   │
│  │  - Build agent chain                             │   │
│  │  - Pass context forward                          │   │
│  │  - Max depth: 4                                  │   │
│  │  - Recovery: retry → escalate → pause            │   │
│  └──────────────────────────────────────────────────┘   │
└────────┬────────┬────────┬────────┬────────┬────────────┘
         │        │        │        │        │
    ┌────▼───┐ ┌──▼────┐ ┌─▼────┐ ┌─▼────┐ ┌▼──────┐
    │Explorer│ │Strate-│ │Res-  │ │Design│ │Auditor│
    │        │ │gist   │ │earcher│ │er    │ │       │
    └────────┘ └───────┘ └──────┘ └──────┘ └───────┘
    ┌────────┐ ┌────────┐
    │Council │ │General │
    │        │ │ist     │
    └────────┘ └────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                  Memory Systems (MCP)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐         │
│  │ Engram   │  │Mempalace  │  │ Brain-Router  │         │
│  │(cross-   │  │(semantic  │  │ (unified      │         │
│  │ session) │  │ storage)  │  │  routing)     │         │
│  └──────────┘  └───────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Shared Cognitive Kernel

All core agents inherit a shared fast/slow control contract from `_shared/cognitive-kernel.md`, injected at build time into the generated runtime prompts.

- **Fast mode** is the default: one-pass, pattern-matched, minimal-tool execution for clear low-risk work
- **The orchestrator owns route-level fast/slow choice**, while each specialist owns local fast/slow choice within its own boundary
- **Delegation packets now carry routing metadata**: `reasoning_mode`, `model_tier`, `budget_class`, and `verification_depth`
- **Clear prompts are intent-locked before slow mode**: prompt enhancement may tighten safety or verification constraints, but it may not silently recast a workflow/routing request as implementation work
- **Slow mode** activates only when ambiguity, risk, unfamiliarity, or failed verification justifies extra latency
- **Slow mode is gist-first**: agents state the bottom-line judgment before gathering supporting detail
- **Slow mode is a single forward pass** with explicit phase exits; it does not reopen completed phases on unchanged evidence
- **Slow mode includes one fatal-flaw test** after evidence gathering so agents challenge the current plan once before acting
- **Slow mode ends in one of three terminal states**: `act`, `ask`, or `escalate`
- **Memory preflight** happens before non-trivial work so agents reuse prior project decisions, bugfixes, and patterns
- **Anti-WYSIATI checks** ask what evidence is missing, what competing story fits, what memory may be stale, and what would falsify the current answer
- **Anti-loop and oscillation guards** prevent repeated re-analysis and boundedly arbitrate repeated specialist disagreement
- **Expensive reasoning is budget-gated**: deep-reasoning tiers and council fan-out require explicit justification instead of becoming the default reflex
- **Clear-scope implementation, cleanup, and finalization requests stay concrete**: they default to `@generalist` unless the user explicitly asked for planning/research or the objective itself is unclear
- This is an operating heuristic influenced by Kahneman-style fast/slow reasoning, not a claim of literal cognitive simulation

## Prompt Composition Pipeline

The prompt system now has two layers:

1. **Source prompts** in `agents/*.md`
  - Preserve each agent's unique role, skills, boundaries, and output contract
  - Contain explicit composition markers for shared runtime blocks
2. **Generated runtime prompts** in `agents/generated/*.md`
  - Built by `scripts/compose-prompts.js`
  - Expand shared blocks into the executable prompt surface used by `opencode.json`

Shared runtime modules live in `_shared/`:

- `cognitive-kernel.md` — shared fast/slow reasoning contract
- `memory-systems.md` — shared retrieval order and precedence rules
- `completion-gate.md` — shared verification and escalation discipline
- `council-kernel.md` — council-only arbitration contract

Validation happens in two passes:

- `node scripts/compose-prompts.js` regenerates `agents/generated/*.md` and `agents/generated/manifest.json`
- `node scripts/validate-agents.js` checks source prompt markers, generated prompt freshness, registry wiring, and reasoning-scenario coverage

## Model Inheritance Policy

The default runtime keeps `opencode.json` simple: it sets one top-level `model`, then lets agent entries inherit from the active session unless you explicitly add an override.

- **Top-level `model`** sets the default session model and can still be overridden by OpenCode runtime selection or CLI flags
- **Primary agents without `model`** inherit the active session/default model
- **Subagents without `model`** inherit the invoking primary agent's model
- **`model_tier` metadata in delegation packets is advisory routing context**, not a requirement to hardcode per-agent model IDs in config
- **Explicit per-agent overrides are optional advanced configuration** when you intentionally want a different model for a specific agent or councillor

This keeps the shipped config valid and portable while still allowing advanced users to opt into manual model specialization.

## Per-Agent Slow-Mode Triggers

| Agent | Stay Fast When | Switch to Slow When |
|---|---|---|
| **orchestrator** | Route is obvious, task is bounded | Multiple viable routes, high-stakes decision, or repeated failure requires deliberate delegation |
| **explorer** | Narrow lookup, 1-3 searches answer the question | Search results conflict, subsystem mapping is needed, or data flow spans multiple files |
| **strategist** | Constraints already known, user wants quick recommendation | Scope is ambiguous, architecture is at stake, or a full spec/plan is required |
| **researcher** | Narrow doc/API lookup | Topic is unfamiliar, architecture-shaping, or needs multi-source synthesis |
| **designer** | Existing design system can be extended directly | New visual direction, redesign, or weak UX requires deliberate creative direction |
| **auditor** | Root cause is visible and fix is bounded | Reproduction is unclear, failures span boundaries, or prior fixes failed |
| **council** | Skip entirely for routine choices | Run full fan-out only for costly, high-uncertainty decisions |
| **generalist** | Plan step is clear, scope is bounded | Scope creeps, dependencies are unclear, or verification failure threatens rollback |

## Agent Roles

### Routing Layer
- **orchestrator**: Entry point, decision tree, chain protocol, error handling, memory checkpoints

### Discovery Layer
- **explorer**: Codebase exploration, pattern discovery, file mapping, parallel search

### Knowledge Layer
- **strategist**: Architecture, planning, spec-writing, "what's next" (8 modes: SKIP, LITE, FULL, SPRINT, ASSESSMENT, BRIEFING, PREDICTIVE, OPPORTUNISTIC)
- **researcher**: External documentation, library research, best practices

### Implementation Layer
- **designer**: UI/UX implementation, visual polish, responsive design
- **auditor**: Debugging (READ MODE), implementation (FIX MODE), conservative improvements (REFINE MODE)
- **generalist**: Plan executor, medium tasks, config changes, docs

### Meta Layer
- **council**: Multi-LLM consensus for high-stakes decisions (3-model fan-out via OpenRouter)

## Data Flow

### Single-Agent Flow
```
User → Orchestrator (classify) → Agent → Output → User
```

### Chain Flow
```
User → Orchestrator (detect chain)
  → Agent 1 (execute, output to context)
  → Agent 2 (receive context, execute, output to context)
  → Agent 3 (receive context, execute, output to context)
  → Final output → User
```

### Memory Flow
```
Session Start → Load context (engram + brain-router)
During Session → Save observations (C1 pre-compaction, C2 post-delegation)
Session End → C3 full summary (engram + brain-router)
```

## Decision Tree

The orchestrator uses a 22-step decision tree:

- **Step -1**: Memory Retrieval Protocol (engram + brain-router + mempalace)
- **Step 0**: Prompt Enhancement (clarify vague prompts)
- **Steps 1-22**: Route to the right specialist (chains, context, speed, medium tasks, docs, scripts, exploration, planning, research, UI/UX, auditing, council, trivial, tests, refactoring, new projects, migrations, API docs, profiling, improvements)

## Chain Protocol

### Detection
- Sequential language: "X then Y", "first X, then Y"
- Comma-separated steps
- Numbered steps
- Sequential verbs

### Execution
1. Parse chain from user request
2. Execute first agent
3. Pass output as context to next agent
4. Repeat until chain complete or max depth (4)

### Recovery
- **Failure**: Retry once → escalate to next-capable agent
- **User input needed**: Pause → save to ledger → ask user → resume
- **Max depth exceeded**: Summarize → ask to continue

## Memory Architecture

### Engram
- **Purpose**: Cross-session observations, decisions, bugfixes, patterns
- **Storage**: SQLite database
- **Key operations**: search, save, timeline, context

### Mempalace
- **Purpose**: Semantic storage with hierarchical organization (READ-ONLY)
- **Structure**: Wings → Rooms → Drawers
- **Key operations**: search, traverse, knowledge graph

### Brain-Router
- **Purpose**: Unified routing between structured facts and conversation history
- **Key operations**: query, save, context, correct, forget

### Retrieval Hierarchy
1. **Project/task framing** — identify project, subsystem, and question
2. **Brain-router query** — broad first-pass lookup
3. **Engram search** — decisions, bugfixes, patterns, and recent sessions
4. **Engram timeline** — when chronology matters
5. **Mempalace search** — semantic or verbatim recall only when needed

### Save Conventions
- `project/<project>/decision/<topic>` for durable choices
- `project/<project>/bugfix/<topic>` for root-cause and fix history
- `project/<project>/pattern/<topic>` for reusable implementation patterns
- `session/<project>/<YYYY-MM-DD>` for resumable session checkpoints

### Conflict Arbitration
- Live repo evidence and fresh tool output win by default.
- Fresh official docs or fresh external research outrank stale comments or stale memory for third-party behavior.
- Structured memory outranks verbatim notes unless exact wording is the point of the lookup.
- Unresolved material conflicts go back to the orchestrator, which routes one bounded arbitration path instead of silently averaging contradictory signals.

### Mandatory Checkpoint Protocol (C1/C2/C3)
- **C1 Pre-Compaction**: Save task state to engram + ledger before any compaction
- **C2 Post-Delegation**: Save specialist's key finding after notable results
- **C3 Session-End**: Full summary via engram + brain-router

## Error Handling

### Agent Failure
- Retry once with clearer instructions
- Escalate to next-capable agent
- Log failure to health monitoring

### Tool Unavailable
- Skip gracefully, note in output
- Proceed without memory if MCP unavailable

### Timeout
- Interrupt, save partial results
- Report status to user

### Fallback Chain
- @strategist unavailable → @generalist (light planning)
- @researcher unavailable → @generalist (light research)
- @designer unavailable → @generalist (functional UI)
- @auditor unavailable → @generalist (basic debugging)
- @explorer unavailable → orchestrator does targeted search
