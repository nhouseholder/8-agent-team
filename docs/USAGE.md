# Usage Guide

## How Each Agent Works

### @orchestrator (Router)

The orchestrator is the entry point for all requests. It classifies every message using a 22-step decision tree and dispatches to the right agent.

**You don't call it directly** — it's the default agent. Just talk to it naturally.

**Examples:**
- "Find where authentication is handled" → routes to @explorer
- "Plan a new settings page" → routes to @strategist
- "Fix this null pointer error" → routes to @auditor
- "Audit this code, then plan improvements" → chains @auditor → @strategist

### @explorer (Codebase Exploration)

Fast codebase navigation specialist. Answers "Where is X?", "Find Y", "Which file has Z".

**When to invoke:**
- You need to understand an unfamiliar codebase
- Finding all usages of a function or pattern
- Mapping data flow or entry points

**Example prompts:**
- "Where are all the API routes defined?"
- "Find all components that use useState with loading"
- "Map the authentication flow from login to token refresh"

**Output:** Structured map with file paths, line numbers, and brief descriptions.

### @strategist (Planning & Strategy)

Strategic technical advisor for architecture decisions, code review, and engineering guidance.

**Modes:**
- **SKIP**: Bug fix, config change, clear scope — recommends approach only
- **LITE**: 2-3 approaches, pick one — one message recommendation
- **FULL**: New feature, 3+ files, unclear approach — spec interview → plan
- **SPRINT**: Greenfield product — frame → sketch → decide → prototype → test

**Example prompts:**
- "How should we structure the new payment module?"
- "Plan a migration from REST to GraphQL"
- "Review this architecture for scalability issues"

**Output:** Structured plan with trade-offs, file references, and implementation steps.

### @researcher (External Research)

Research specialist for libraries, APIs, and external documentation.

**Source hierarchy:**
- Tier 1: Academic papers, official docs, textbooks, standards
- Tier 2: Expert blogs, conference proceedings, high-vote Stack Overflow
- Tier 3: Community blogs, tutorials — never used as sole source

**Example prompts:**
- "What's the best approach for rate limiting in Express?"
- "Research WebSocket reconnection patterns"
- "Find the latest React Server Components best practices"

**Output:** Synthesized answer with sources, core concepts, and implementation guidance.

### @designer (UI/UX)

Frontend UI/UX specialist for intentional, polished experiences.

**Design principles:**
- Intentional minimalism — every element has a purpose
- Bespoke layouts — no template aesthetics
- Distinctive typography — avoid generic defaults
- Cohesive color systems — dominant colors with sharp accents

**Example prompts:**
- "Build a dashboard with analytics cards"
- "Redesign the login page with a modern aesthetic"
- "Add micro-interactions to the navigation"

**Output:** Implementation with design rationale, component changes, and visual decisions.

### @auditor (Debugging & Implementation)

Dual-mode agent: READ MODE for auditing/reviewing, FIX MODE for implementing changes.

**READ MODE:**
- Code review with correctness, performance, maintainability checks
- Root cause analysis for bugs
- YAGNI enforcement — flags unnecessary complexity

**FIX MODE:**
- Implements changes based on audit findings
- Writes/updates tests
- Runs lsp_diagnostics and test verification

**Example prompts:**
- "Why is this API returning 500 errors?"
- "Review this PR for security issues"
- "Write tests for the user service"
- "Fix the race condition in the checkout flow"

**Output:** Summary of changes, verification status, and next steps.

### @council (Multi-LLM Consensus)

Runs consensus across multiple models for high-stakes decisions.

**When to use:**
- Critical architectural choices where wrong choice is costly
- Debugging has failed 3+ times
- Need diverse perspectives on ambiguous problems

**When NOT to use:**
- Routine decisions (use @strategist LITE)
- Simple implementation tasks
- When speed matters more than confidence

**Example prompts:**
- "Should we use microservices or monolith for this project?"
- "Three approaches failed — what's the root cause?"

**Output:** Synthesized consensus with confidence level.

### @generalist (Medium Tasks)

Focused plan executor for medium-complexity tasks. It follows plans with backup, verification, and revert checkpoints, or handles bounded multi-file work autonomously.

**Capabilities:**
- Structured plan execution
- Autonomous medium-complexity implementation
- Multi-file config, docs, and tooling updates
- Pre-compaction checkpointing when session state must be preserved

**Example prompts:**
- "Update these 5 config files for the new environment"
- "Write a README for this project"
- "Execute this implementation plan"
- "Add error handling to these API endpoints"

**Output:** Summary of changes, verification status, and next steps.

### @strategist (What's Next)

Recommends highest-impact next actions scoped to the current project.

**Modes:**
- **FULL ASSESSMENT**: "What should I work on?" — 3-5 prioritized recommendations
- **SESSION START**: "Catch me up" — briefing with top 3 priorities
- **PREDICTIVE NEXT**: After task completion — one-line suggestion
- **OPPORTUNISTIC**: While idle — single highest-impact improvement

**Example prompts:**
- "What's next for this project?"
- "Where did we leave off?"
- "Review the handoff from last session"

**Output:** Prioritized recommendations with evidence from git state, handoffs, and memory.

## Multi-Agent Chains

The orchestrator detects sequential language and chains agents automatically.

**Chain detection triggers:**
- "X then Y" language
- "First audit, then plan"
- "Research this, then build it"
- Comma-separated multi-step requests

**Chain examples:**

```
"Audit this code, then brainstorm improvements, then make a plan"
→ @auditor (audit) → @explorer (explore) → @strategist (plan)

"Research the best auth library, then plan the integration"
→ @researcher (research) → @strategist (plan)

"Build the UI, then write tests for it"
→ @designer (build) → @auditor (test)
```

**Chain rules:**
- Max depth: 4 agents
- Recovery: retry once → escalate → pause for user input
- State saved to ledger before pausing
- Resumes from last completed step

## Configuring Council for True Multi-LLM Consensus

Council requires 3 **different** models. With the same model, it's self-talk.

### Option A: OpenRouter (Recommended — Free, 3 Different Reasoning Models)

One free API key gives access to 3 reasoning models with native chain-of-thought.

**The 3 Council Models:**

| Role | Model | Why |
|---|---|---|
| **Advocate For** | `openai/gpt-oss-120b:free` | OpenAI's distribution. Highest MMLU-Pro (90.0%). Adjustable reasoning effort. |
| **Advocate Against** | `xiaomi/mimo-v2-flash:free` | Xiaomi's distribution. Highest AIME 2025 (94.1%). Best SWE-Bench (73.4%). |
| **Judge** | `qwen/qwen3-235b-a22b-thinking-2507:free` | Alibaba's distribution. Best HMMT (83.9%), LiveCodeBench v6 (74.1%). |

**Setup (2 minutes):**

1. Get a free OpenRouter API key: https://openrouter.ai/keys (no credit card)
2. Copy `examples/openrouter-council.json` to your OpenCode config directory as `opencode.json`
3. Replace `YOUR_OPENROUTER_KEY` with your actual key
4. Start a session — council now uses 3 different reasoning models

**Rate limits:** ~200 requests/day per model on the free tier.

**Backup models** (swap in if any primary is unavailable): DeepSeek R1, Llama 4 Maverick, Gemma 3 27B. See `agents/council.md` for full backup roster.

### Option B: Single Provider (Default — Works Out of the Box)

Council runs in DEBATE MODE with a single model — still valuable for structured idea evaluation. Use `examples/standard.json` or `examples/minimal.json`.
