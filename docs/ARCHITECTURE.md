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
