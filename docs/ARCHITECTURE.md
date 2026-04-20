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
│  │  19-Step Decision Tree                           │   │
│  │  1. Chain detection                              │   │
│  │  2-6. Generalist routing                         │   │
│  │  7-12. Specialist routing                        │   │
│  │  13-19. Edge case routing                        │   │
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
    │Brain-  │ │Archi- │ │Res-  │ │Design│ │Auditor│
    │stormer │ │tect   │ │earcher│ │er    │ │       │
    └────────┘ └───────┘ └──────┘ └──────┘ └───────┘
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Council │ │General │ │Strateg │ │Shipper │
    │        │ │ist     │ │ist     │ │        │
    └────────┘ └────────┘ └────────┘ └────────┘
    ┌────────┐
    │Debrief │
    └────────┘
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

## Agent Roles

### Routing Layer
- **orchestrator**: Entry point, decision tree, chain protocol, error handling

### Discovery Layer
- **brainstormer**: Codebase exploration, pattern discovery, file mapping

### Knowledge Layer
- **architect**: Planning, strategy, code review, architectural decisions
- **researcher**: External documentation, library research, best practices

### Implementation Layer
- **designer**: UI/UX implementation, visual polish, responsive design
- **auditor**: Debugging (READ MODE), implementation (FIX MODE), test writing
- **generalist**: Medium tasks, config changes, docs, context compaction

### Meta Layer
- **council**: Multi-LLM consensus for high-stakes decisions
- **strategist**: Strategic recommendations, project assessment
- **shipper**: Deploy, version bump, release, handoff
- **debrief**: Summaries, progress tracking, code simplification

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
During Session → Save observations (engram + brain-router + mempalace)
Session End → Update ledger, save final state
```

## Decision Tree

The orchestrator uses a 19-step decision tree:

1. Multi-agent chain detection
2-6. Generalist routing (context, speed, medium tasks, docs, scripts)
7-12. Specialist routing (brainstormer, architect, researcher, designer, auditor, council)
13. Trivial tasks (do it yourself)
14-19. Edge cases (tests, refactoring, new projects, migrations, API docs, profiling)

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
- **Purpose**: Semantic storage with hierarchical organization
- **Structure**: Wings → Rooms → Drawers
- **Key operations**: search, add_drawer, traverse, knowledge graph

### Brain-Router
- **Purpose**: Unified routing between structured facts and conversation history
- **Key operations**: query, save, context, correct, forget

## Configuration

### File Structure
```
opencode/
├── opencode.json              # Main configuration
├── agents/
│   ├── generalist.md          # File-based prompt
│   └── _shared/
│       └── memory-systems.md  # Shared memory block
├── docs/
│   ├── README.md
│   ├── USAGE.md
│   ├── CHAIN-EXAMPLES.md
│   ├── TROUBLESHOOTING.md
│   ├── ARCHITECTURE.md
│   └── AGENT-REFERENCE.md
├── scripts/
│   └── validate-agents.js     # Validation script
├── examples/
│   ├── minimal.json
│   ├── standard.json
│   ├── with-memory.json
│   └── enterprise.json
└── CHANGELOG.md
```

### Model Configuration
```json
{
  "models": {
    "default": "opencode-go/qwen3.6-plus",
    "fast": "opencode-go/qwen3.6-plus",
    "smart": "opencode-go/qwen3.6-plus",
    "creative": "opencode-go/qwen3.6-plus"
  }
}
```

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
