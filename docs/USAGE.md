# Usage Guide

## How Each Agent Works

### @orchestrator (Router)

The orchestrator is the entry point for all requests. It classifies every message using a 19-step decision tree and dispatches to the right agent.

**You don't call it directly** — it's the default agent. Just talk to it naturally.

**Examples:**
- "Find where authentication is handled" → routes to @explorer
- "Plan a new settings page" → routes to @architect
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

### @architect (Planning & Strategy)

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
- Routine decisions (use @architect LITE)
- Simple implementation tasks
- When speed matters more than confidence

**Example prompts:**
- "Should we use microservices or monolith for this project?"
- "Three approaches failed — what's the root cause?"

**Output:** Synthesized consensus with confidence level.

### @generalist (Medium Tasks)

Swiss Army knife for tasks too involved for a quick edit but not warranting a specialist.

**Capabilities:**
- Light exploration, research, design, debugging
- Full implementation for clear-scope tasks
- Context compaction and session continuity

**Example prompts:**
- "Update these 5 config files for the new environment"
- "Write a README for this project"
- "Compact the current session context"
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

### @shipper (Deploy & Release)

Sync, bump, commit, push, deploy, verify, and handoff.

**Full ship sequence:**
1. Detect project state
2. Pre-flight gates (clean tree, version check, lint/test/build)
3. Version bump (PATCH/MINOR/MAJOR)
4. Commit + push
5. Deploy (Cloudflare Pages/Workers)
6. Verify live site
7. Tag release
8. Create handoff

**Example prompts:**
- "Ship this"
- "Deploy to production"
- "Bump version and push"

**Output:** Ship result with step statuses, verification, and handoff location.

### @debrief (Summaries)

Produces concise, factual summaries of work done.

**Modes:**
- **SESSION SUMMARY**: "What did we do?" — bullets with files changed → outcome
- **PROGRESS TRACKER**: "Progress report" — N/M tasks, percentage, ETA
- **CODE SIMPLIFICATION**: "Simplify changes" — review diff for simpler alternatives

**Example prompts:**
- "Summarize what we did today"
- "Progress report"
- "Can these changes be simplified?"

**Output:** Factual summary with git data, current state, and next step.

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
→ @researcher (research) → @architect (plan)

"Build the UI, then write tests for it"
→ @designer (build) → @auditor (test)
```

**Chain rules:**
- Max depth: 4 agents
- Recovery: retry once → escalate → pause for user input
- State saved to ledger before pausing
- Resumes from last completed step
