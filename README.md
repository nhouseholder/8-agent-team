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
| **auditor** | Debugging, audit, code review | "Fix this bug", "Review this code", "Write tests" |
| **council** | Multi-LLM consensus & debate | "What's the best approach?", "Should we...?" |
| **generalist** | Fast execution + plan executor | "Create these files", "Execute this plan", "Refactor" |

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
- **Prompt Enhancement Protocol** — silently clarifies vague prompts (1-2 questions max)
- **Multi-Agent Chains** — sequential requests execute automatically, max depth 4
- **Council DEBATE MODE** — structured idea evaluation (advocate for/against → judge → verdict)
- **Chain Recovery** — failed steps retry, escalate, or pause for user input
- **Persistent Memory** — three MCP memory systems survive across sessions
- **Validation** — `scripts/validate-agents.js` ensures all agents meet format requirements

## Architecture

```
agents/
├── orchestrator.md      # Router with decision tree, chain protocol, memory + prompt enhancement
├── explorer.md          # Codebase exploration specialist
├── strategist.md        # Architecture, planning, spec-writing (8 modes)
├── researcher.md        # External research with source hierarchy
├── designer.md          # UI/UX with intentional minimalism
├── auditor.md           # Debugging, audit, code review (READ/FIX modes)
├── council.md           # Multi-LLM consensus + DEBATE MODE
├── generalist.md        # Plan executor, medium tasks, progress tracking
└── _shared/
    └── memory-systems.md  # Shared memory reference for all agents
```

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
- **Agent prompts**: `agents/<name>.md`
- **Shared resources**: `agents/_shared/memory-systems.md`
- **Validation**: `scripts/validate-agents.js`

## Version

1.6.0 — @fixer removed (didn't exist), @generalist retooled as primary execution specialist with FAST EXECUTION mode, self-audit checkpoint added to orchestrator

## License

MIT
