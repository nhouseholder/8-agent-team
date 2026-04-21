# 8-Agent Orchestration System

A multi-agent coding orchestration system for OpenCode. An **orchestrator** routes every request to the right specialist — or chains them together for complex workflows.

## The 8 Agents

| Agent | Role | Example Trigger |
|---|---|---|
| **orchestrator** | Router & coordinator | Always — entry point for all requests |
| **explorer** | Codebase exploration | "Find where X is used", "Map this codebase" |
| **strategist** | Architecture, planning, "what's next" | "How should we build this?", "Plan a feature" |
| **researcher** | External docs & research | "How does this library work?", "Find best practices" |
| **designer** | UI/UX implementation | "Build a dashboard", "Improve this component" |
| **auditor** | Debug, review, improve, fix | "Fix this bug", "Improve this", "Review this code" |
| **council** | Multi-LLM consensus & debate | "What's the best approach?", "Should we...?" |
| **generalist** | Plan executor, medium tasks | "Execute this plan", "Update these configs", "Refactor" |

## How It Works

```
User Request
    ↓
Step -1: Memory Retrieval (check past decisions, patterns, bugfixes)
    ↓
Step 0: Prompt Enhancement (clarify vague prompts, 1-2 questions max)
    ↓
Steps 1-22: Decision Tree (route to the right specialist)
    ↓
Specialist executes → verifies → reports back
```

### Key Principles

- **Err on the side of delegation** — the orchestrator only handles cosmetic edits and trivial lookups
- **Search before guessing** — memory is checked before every non-trivial request
- **Rarely intervene** — clear prompts pass through with zero overhead
- **Chain automatically** — "audit then plan then build" runs without manual handoff

## Quick Start

1. Clone this repo
2. Copy `opencode.json` to `~/.config/opencode/opencode.json` (or merge into your existing config)
3. **Replace `YOUR_OPENROUTER_KEY`** in the `provider.openrouter.options.apiKey` field with your own free OpenRouter key
   - Get one at https://openrouter.ai/keys (free tier, no credit card required)
   - The council agents (GPT-OSS-120B, MiMo-V2-Flash, Qwen3-Thinking) won't work without this
4. Optionally configure MCP servers (engram, mempalace, brain-router) for persistent memory
5. Start a session — the orchestrator handles routing automatically

> **Without an OpenRouter key**: Everything works except council consensus. The orchestrator falls back to @strategist for multi-perspective evaluation when council is requested.

### API Key Setup

The repo `opencode.json` uses a placeholder. You need your own key:

```jsonc
// In your ~/.config/opencode/opencode.json:
{
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "sk-or-v1-YOUR_KEY_HERE"  // ← replace with your key
      }
    }
  }
}
```

1. Go to https://openrouter.ai/keys and create a free account
2. Generate an API key
3. Paste it into `provider.openrouter.options.apiKey` in your config
4. Council models are all free tier — no credits consumed

## Features

- **22-step decision tree** classifies every request and routes to the right agent
- **Memory Retrieval Protocol** — checks engram/mempalace/brain-router before routing
- **Shared Cognitive Kernel** — every core agent defaults to fast mode and escalates to slow mode only when ambiguity, risk, or failures justify it
- **Prompt Enhancement Protocol** — silently clarifies vague prompts (1-2 questions max)
- **Multi-Agent Chains** — sequential requests execute automatically, max depth 4
- **Council DEBATE MODE** — structured idea evaluation (advocate for/against → judge → verdict)
- **Chain Recovery** — failed steps retry, escalate, or pause for user input
- **Persistent Memory** — three MCP memory systems survive across sessions
- **Validation** — `scripts/validate-agents.js` checks source markers, generated prompt freshness, registry wiring, and reasoning-scenario integrity

## Architecture

```
agents/
├── orchestrator.md      # Source prompt: router with decision tree, chain protocol, memory + prompt enhancement
├── explorer.md          # Source prompt: codebase exploration specialist
├── strategist.md        # Source prompt: architecture, planning, spec-writing (8 modes)
├── researcher.md        # Source prompt: external research with source hierarchy
├── designer.md          # Source prompt: UI/UX with intentional minimalism
├── auditor.md           # Source prompt: debug, review, improve, fix (READ/FIX/REFINE modes)
├── council.md           # Source prompt: multi-LLM consensus + DEBATE MODE
├── generalist.md        # Source prompt: plan executor, bounded implementation, verification discipline
├── generated/           # Runtime prompts produced by scripts/compose-prompts.js
│   ├── orchestrator.md
│   ├── explorer.md
│   └── ...
└── _shared/
    ├── cognitive-kernel.md # Shared fast/slow control contract
    ├── memory-systems.md   # Shared memory retrieval and precedence rules
    ├── completion-gate.md  # Shared completion and escalation discipline
    └── council-kernel.md   # Shared council arbitration contract

scripts/
├── compose-prompts.js            # Builds agents/generated/* and manifest.json
├── validate-agents.js            # Validates source, generated, registry, scenarios
└── validate-reasoning-scenarios.js # Lightweight fast/slow architecture checks
```

## Cognitive Model

The system uses a Kahneman-style fast/slow operating contract across the full 8-agent team. It is an agent-control heuristic, not a claim that the repo faithfully implements settled human dual-process psychology.

- **Fast mode** is the default for narrow, familiar, low-risk work
- **The orchestrator owns route-level fast/slow decisions**, while each specialist owns local fast/slow decisions inside its own boundary
- **Slow mode** is triggered by ambiguity, architectural stakes, repeated failure, or missing prior patterns
- **Slow mode starts with a bottom-line gist**, then gathers only the detail that can change or falsify that gist
- **Memory preflight** happens before non-trivial work so agents reuse prior decisions instead of rediscovering them
- **Anti-WYSIATI and conflict checks** run before high-confidence completion on ambiguous or high-stakes work
- **Council** is the expensive slow path for genuinely high-stakes decisions, not routine planning
- **Fast and slow are control modes, not value judgments** — fast is not automatically biased, and slow is not automatically better

## Sources of Truth

| Concern | Canonical file |
|---|---|
| Core routing behavior | `agents/orchestrator.md` |
| Source prompts and per-agent identity | `agents/<name>.md` |
| Shared runtime modules | `agents/_shared/*.md` |
| Generated runtime prompts | `agents/generated/<name>.md` |
| Runtime registry and prompt file wiring | `opencode.json` |
| Release history | `CHANGELOG.md` |

## Multi-Agent Chains

The system detects sequential language and chains agents automatically:

```
"Audit this code, then explore improvements, then make a plan"
→ @auditor (audit) → @explorer (explore) → @strategist (plan)
```

Max chain depth: 4. Recovery: retry → escalate → pause for user input.

## Memory Systems

Three persistent memory systems survive across sessions:

- **engram**: Cross-session observations, decisions, bugfixes, patterns
- **mempalace**: Semantic storage with wings/rooms/drawers + knowledge graph
- **brain-router**: Unified memory routing with conflict detection

## Configuration

- **Config file**: `opencode.json`
- **Source prompts**: `agents/<name>.md`
- **Shared runtime modules**: `agents/_shared/*.md`
- **Generated runtime prompts**: `agents/generated/<name>.md`
- **Prompt builder**: `scripts/compose-prompts.js`
- **Validation**: `scripts/validate-agents.js`

## Version

1.6.0 — Merged refiner→auditor (REFINE MODE), mandatory C1/C2/C3 memory checkpoints, 9→8 agents

## License

MIT
