# Multi-Agent Chain Examples

## What Are Chains?

Multi-agent chains let you describe a multi-step workflow in natural language. The orchestrator detects sequential intent and dispatches agents in order, passing context forward between each step.

## Chain Detection

The orchestrator recognizes these patterns:

| Pattern | Example |
|---|---|
| "X then Y" | "Audit this then plan improvements" |
| "First X, then Y" | "First research the options, then build" |
| Comma-separated steps | "Find the bug, fix it, write a test" |
| Numbered steps | "1. Audit 2. Plan 3. Implement" |
| Sequential verbs | "Research, design, and build this feature" |

## Chain Examples

### 1. Audit → Plan → Implement

**Prompt:** "Audit this authentication module, then plan improvements, then implement the fixes"

**Chain:**
```
@auditor (READ MODE)
  ↓ audit findings, file references
@strategist (LITE MODE)
  ↓ improvement plan with trade-offs
@auditor (FIX MODE)
  ↓ implemented changes + verification
```

**Use case:** Code review followed by planned refactoring.

### 2. Research → Plan → Build

**Prompt:** "Research the best state management approach for this project, then plan the implementation, then build it"

**Chain:**
```
@researcher
  ↓ source hierarchy, best practices, examples
@strategist (FULL MODE)
  ↓ spec interview, implementation plan
@generalist
  ↓ multi-file implementation + verification
```

**Use case:** Greenfield feature requiring external knowledge.

### 3. Explore → Debug → Fix

**Prompt:** "Find where the memory leak is happening, then debug the root cause, then fix it"

**Chain:**
```
@explorer
  ↓ file map, usage patterns, suspect locations
@auditor (READ MODE)
  ↓ root cause analysis with evidence
@auditor (FIX MODE)
  ↓ fix + test verification
```

**Use case:** Complex bug requiring discovery before fixing.

### 4. Research → Design → Build

**Prompt:** "Research modern dashboard patterns, then design a new analytics page, then implement it"

**Chain:**
```
@researcher
  ↓ dashboard patterns, component libraries, best practices
@designer
  ↓ visual design, layout decisions, component specs
@designer (implementation)
  ↓ polished UI + interaction verification
```

**Use case:** UI feature requiring research-backed design.

### 5. Audit → Test → Ship

**Prompt:** "Audit the current codebase, write tests for uncovered areas, then ship"

**Chain:**
```
@auditor (READ MODE)
  ↓ coverage gaps, quality issues
@auditor (FIX MODE)
  ↓ new tests + verification
@generalist
  ↓ pre-flight gates → deploy → verify → handoff
```

**Use case:** Pre-deployment quality gate.

### 6. Explore → Research → Plan

**Prompt:** "Find all the API endpoints in this project, research rate limiting patterns, then plan a throttling strategy"

**Chain:**
```
@explorer
  ↓ endpoint map, current rate limiting (if any)
@researcher
  ↓ rate limiting algorithms, library options, best practices
@strategist (LITE MODE)
  ↓ throttling strategy with trade-offs
```

**Use case:** Infrastructure improvement requiring codebase + external knowledge.

## Chain Recovery

If a chain breaks mid-sequence:

1. **Agent fails**: Retry once with clearer instructions → escalate to next-capable agent
2. **Agent needs user input**: Pause chain, ask user, resume with answer
3. **Chain exceeds max depth (4)**: Summarize progress, ask if user wants to continue
4. **State persistence**: Chain state saved to ledger before any pause

**Example recovery:**
```
Chain: @researcher → @strategist → @auditor
@researcher completes ✅
@strategist needs clarification on scope → PAUSE
User provides scope → RESUME
@strategist completes ✅
@auditor implements ✅
```

## Chain Limits

- **Max depth**: 4 agents per chain
- **No parallel chains**: Chains execute sequentially
- **Context passing**: Each agent receives the previous agent's output as context
- **User input**: Chain pauses for user input at any step
- **Cancellation**: User can interrupt a chain at any point
