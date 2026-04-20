# 10-Agent Orchestration System

A multi-agent coding orchestration system for OpenCode. An **orchestrator** routes every request to the right specialist — or chains them together for complex workflows.

## The 10 Agents

| Agent | Role | Example Trigger |
|---|---|---|
| **orchestrator** | Router & coordinator | Always — entry point for all requests |
| **brainstormer** | Codebase exploration | "Find where X is used", "Map this codebase" |
| **strategist** | Architecture, planning, "what's next" | "How should we build this?", "Plan a feature" |
| **researcher** | External docs & research | "How does this library work?", "Find best practices" |
| **designer** | UI/UX implementation | "Build a dashboard", "Improve this component" |
| **auditor** | Debugging, audit, code review | "Fix this bug", "Review this code", "Write tests" |
| **council** | Multi-LLM consensus & debate | "What's the best approach?", "Should we...?" |
| **shipper** | Deploy, version bump, git sync | "Deploy this", "Ship it", "Bump version" |
| **generalist** | Medium tasks, docs, compaction | "Update these configs", "Write docs", "Refactor" |
| **refiner** | Continuous improvement | "Improve this", "Refine this", session-end indexing |

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

1. Copy `opencode.json` to your OpenCode config directory
2. Configure MCP servers (engram, mempalace, brain-router) for persistent memory
3. Start a session — the orchestrator handles routing automatically

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
├── brainstormer.md      # Codebase exploration specialist
├── strategist.md        # Architecture, planning, spec-writing (8 modes)
├── researcher.md        # External research with source hierarchy
├── designer.md          # UI/UX with intentional minimalism
├── auditor.md           # Debugging, audit, code review (READ/FIX modes)
├── council.md           # Multi-LLM consensus + DEBATE MODE
├── shipper.md           # Deploy pipeline with pre-flight gates
├── generalist.md        # Medium tasks, compaction, summarization
├── refiner.md           # Continuous improvement (INDEX/REFINE modes)
└── _shared/
    └── memory-systems.md  # Shared memory reference for all agents
```

## Multi-Agent Chains

The system detects sequential language and chains agents automatically:

```
"Audit this code, then brainstorm improvements, then make a plan"
→ @auditor (audit) → @brainstormer (explore) → @strategist (plan)
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

1.2.0 — Consolidated 12→10 agents, added prompt enhancement, memory retrieval, council DEBATE MODE

## License

MIT
