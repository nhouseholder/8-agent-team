# Agent Reference

Detailed specifications for each agent in the orchestration system.

---

## @orchestrator

**Mode:** primary  
**Model:** opencode-go/qwen3.6-plus

### Role
AI coding orchestrator that routes tasks to specialists for optimal quality, speed, cost, and reliability.

### Decision Tree (19 steps)
1. Multi-agent chain detection
2. Context/session management → @generalist
3. Speed-critical/token-sensitive → @generalist
4. Medium task (2-10 files, clear scope) → @generalist
5. Documentation/README/changelog → @generalist
6. Script/automation/tooling → @generalist
7. Deep codebase discovery → @explorer
8. Planning/spec/strategy → @strategist
9. External research/docs → @researcher
10. UI/UX polish → @designer
11. Debugging/audit/review → @auditor
12. Multi-model consensus → @council
13. Trivial (<20 lines, one file) → Do it yourself
14. Writing tests for existing code → @auditor
15. Refactoring entire module → @strategist → @generalist
16. New project from scratch → @strategist (SPRINT)
17. Framework migration → @researcher → @strategist → @auditor
18. API documentation → @generalist
19. Performance profiling → @auditor → @generalist

### Chain Protocol
- Detects sequential language in user requests
- Builds agent chain, passes context forward
- Max depth: 4 agents
- Recovery: retry → escalate → pause for user input

### Error Handling
- Agent failure: retry once, then escalate
- Tool unavailable: skip gracefully, note in output
- Timeout: interrupt, save partial results
- Fallback chain for unavailable agents

---

## @explorer

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Fast codebase navigation specialist. Answers "Where is X?", "Find Y", "Which file has Z".

### Tools
- **grep**: Text/regex patterns (strings, comments, variable names)
- **ast_grep_search**: Structural patterns (function shapes, class structures)
- **glob**: File discovery (find by name/extension)

### Exploration Protocol
1. **SCOPE THE UNKNOWN**: What do we know? What don't we know?
2. **PARALLEL DISCOVERY**: Multiple searches simultaneously
3. **SYNTHESIZE MAP**: Structured summary with directory structure, key files, data flow
4. **IDENTIFY GAPS**: What still needs investigation?

### Rules
- Summarize, don't dump — return maps, not file contents
- Parallel first — run independent searches simultaneously
- Stop when you have the answer — don't over-explore
- READ-ONLY: Search and report, don't modify

### Output Format
```
<results>
<files>
- /path/to/file.ts:42 - Brief description
</files>
<answer>
Concise answer to the question
</answer>
</results>
```

### Escalation
- After 3 searches without results → recommend @strategist or @researcher
- If task requires understanding 10+ files → recommend @strategist

---

## @strategist

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Unified strategic advisor, planner, and "what's next" engine. Combines architecture decisions, code review, planning, spec-writing, and strategic recommendations into one advisory agent.

### Mode Detection
| Signal | Mode |
|---|---|
| Bug fix, config change, clear scope | **SKIP** — recommend approach only |
| 2-3 approaches, pick one | **LITE** — 1 message recommendation |
| New feature, 3+ files, unclear approach | **FULL** — spec → plan |
| Greenfield product, validate idea | **SPRINT** — frame → sketch → decide → prototype → test |
| "What's next", "recommendations" | **ASSESSMENT** — 3-5 prioritized recommendations |
| "Catch me up", "review handoff" | **BRIEFING** — session start briefing |
| After task completion | **PREDICTIVE** — one-line next suggestion |
| While idle | **OPPORTUNISTIC** — single highest-impact improvement |

### Capabilities
- Analyze complex codebases and identify root causes
- Propose architectural solutions with tradeoffs
- Review code for correctness, performance, maintainability
- Enforce YAGNI and suggest simpler designs
- Spec interviews with targeted multiple-choice questions
- Write SPEC.md and plan documents
- Generate prioritized strategic recommendations
- Session start briefings with top 3 priorities

### Constraints
- READ-ONLY: Advise, plan, and recommend — don't implement
- Never start coding during spec/planning phases
- If user asks to code, redirect to @auditor or @generalist
- Always propose 2-3 approaches for non-trivial decisions

### Escalation
- If task requires implementation → redirect to @auditor or @generalist
- If uncertain about requirements → ask clarifying questions before planning

---

## @researcher

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Research specialist for libraries, APIs, and external documentation.

### Research Triage
| Level | Action | Examples |
|---|---|---|
| **Routine** | No research — execute | CRUD, pure UI, config |
| **Familiar** | 1-2 quick checks | Pagination, JWT, caching |
| **Technical** | Targeted (3 searches + 1-2 reads) | Elo rating, cosine similarity |
| **Complex** | Full literature review (5 searches + 3 reads) | Bayesian scoring, binding models |

### Source Hierarchy
- **Tier 1 (gold):** Academic papers, official docs, textbooks, standards
- **Tier 2 (expert):** Expert blogs, conference proceedings, high-vote SO, popular GitHub repos
- **Tier 3 (community):** Blog posts, tutorials, forums — NEVER sole source

### Output Format
```
<summary>Research topic and key findings</summary>
<sources>
- Source 1: URL/key finding
- Source 2: URL/key finding
</sources>
<answer>Synthesized answer with evidence</answer>
<next>Recommended next step or "complete"</next>
```

### Escalation
- If out of depth after 2 attempts → recommend the right specialist
- If task requires capabilities you don't have → say so explicitly
- Never guess or hallucinate — admit uncertainty

---

## @designer

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Frontend UI/UX specialist for intentional, polished experiences.

### Design Principles
- **Typography:** Distinctive, characterful fonts — avoid generic defaults
- **Color & Theme:** Cohesive aesthetic, dominant colors with sharp accents
- **Motion & Interaction:** High-impact moments, orchestrated page loads
- **Spatial Composition:** Asymmetry, overlap, diagonal flow, grid-breaking
- **Visual Depth:** Gradient meshes, noise textures, geometric patterns
- **Styling:** Tailwind CSS utilities first, custom CSS when vision requires it

### Workflow
1. **UNDERSTAND:** What's the vision? Who's the audience?
2. **RESEARCH:** What patterns exist? What's the design system?
3. **BUILD:** Implement with intentional minimalism
4. **AUDIT:** Check against 6 quality dimensions
5. **CRITIQUE:** AI slop detection — is it generic?

### Output Format
```
<summary>Design approach and key decisions</summary>
<changes>
- Component: What was designed/changed
</changes>
<rationale>Why these design choices were made</rationale>
<next>Recommended next step or "complete"</next>
```

### Escalation
- If out of depth after 2 attempts → recommend the right specialist
- If task requires capabilities you don't have → say so explicitly
- Never guess or hallucinate — admit uncertainty

---

## @auditor

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Dual-mode agent. READ MODE for auditing/reviewing/debugging. FIX MODE for implementing changes.

### READ MODE
- Code review with correctness, performance, maintainability checks
- Root cause analysis for bugs
- YAGNI enforcement — flags unnecessary complexity

### FIX MODE
- Implements changes based on audit findings
- Writes/updates tests
- Runs lsp_diagnostics and test verification

### Constraints
- NO external research (no websearch, context7, grep_app)
- NO delegation (no background_task, no spawning subagents)
- Read files before editing — never blind writes

### Verification (always run before reporting complete)
1. Run lsp_diagnostics on all changed files
2. Run relevant tests if they exist
3. Verify no regressions in adjacent functionality
4. Report verification status in output

### Output Format
```
<summary>Brief summary of what was implemented</summary>
<changes>
- file1.ts: Changed X to Y
- file2.ts: Added Z function
</changes>
<verification>
- Tests passed: [yes/no/skip reason]
- LSP diagnostics: [clean/errors found/skip reason]
</verification>
```

---

## @council

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Multi-LLM orchestration system that runs consensus and structured debate across multiple models.

### Mode Detection
| Signal | Mode |
|---|---|
| "What's the best approach?", debugging failed 3+ times | **CONSENSUS MODE** |
| "Should we...", "what if...", proposing an idea | **DEBATE MODE** |

### CONSENSUS MODE
1. Call `council_session` with the user's prompt
2. Receive synthesized response from council master
3. Present result verbatim — do not re-summarize

### DEBATE MODE — Structured Idea Evaluation
When a user proposes an idea, run a structured debate:

1. **FRAME** — Restate the proposal, problem it solves, stakes
2. **ADVOCATE FOR** — Strongest case FOR (benefits, risk mitigation, when it shines)
3. **ADVOCATE AGAINST** — Strongest case AGAINST (costs, complexity, alternatives, when it fails)
4. **JUDGE** — Evaluate both sides, surface assumptions, identify strongest arguments
5. **VERDICT** — PROCEED / PROCEED WITH CAVEATS / REJECT / NEEDS MORE DATA

### Debate Rules
- Steel-man both sides — never present weak arguments
- Surface hidden costs — complexity, maintenance, opportunity cost
- Identify assumptions — what must be true for this to work?
- No fence-sitting — JUDGE must take a position
- Actionable verdict — never "it depends" without specifics

### When to Use
- User proposes an idea: "Should we add X?", "What if we use Y?"
- High-stakes architectural choices where wrong choice is costly
- Debugging has failed 3+ times
- @strategist proposes 2-3 approaches and you need to pick the best

### When NOT to Use
- Routine decisions (use @strategist LITE mode)
- Simple implementation tasks (use @generalist or @auditor)
- When speed matters more than confidence

### Output Format
```
<summary>Debate on: [proposal summary]</summary>
<for>Strongest arguments FOR</for>
<against>Strongest arguments AGAINST</against>
<judge>Evaluation, assumptions, strongest arguments</judge>
<verdict>PROCEED / PROCEED WITH CAVEATS / REJECT / NEEDS MORE DATA</verdict>
<next>Recommended action</next>
```

### Escalation
- If out of depth after 2 attempts → recommend the right specialist
- If task requires capabilities you don't have → say so explicitly
- Never guess or hallucinate — admit uncertainty

---

## @generalist

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus  
**Prompt File:** agents/generalist.md

### Role
Swiss Army knife for medium-complexity tasks. Can explore, research, design, debug, implement, and compact context.

### Capability Spectrum
| Skill | Depth | When to Use |
|---|---|---|
| **Exploration** | Light | "Find where X is used" |
| **Research** | Light | "How does this API work?" |
| **Design** | Light | "Add a settings page" |
| **Debugging** | Light | "Why is this failing?" |
| **Implementation** | Full | "Update these 5 config files" |
| **Architecture** | Light | "Should we use X or Y here?" |
| **Compaction** | Full | "Compact this session", "Save state" |
| **Summarization** | Full | "What did we do?", "Progress report", "Simplify changes" |

### Decision Protocol
1. Is this a specialist job? → Recommend the right agent
2. Can I handle it? → Execute directly
3. Am I out of my depth? → Stop and recommend escalation

### Context Compaction
- Preserves: decisions with rationale, file paths, open questions, patterns
- Discards: exploration dead-ends, verbose errors, intermediate steps
- Saves to: `thoughts/ledgers/CONTINUITY_YYYY-MM-DD_HHMM.md`

### Boundary Rules (vs @auditor)
- **@generalist:** Know WHAT to change → medium tasks, configs, docs, refactors
- **@auditor:** Need to figure OUT what's wrong → bugs, reviews, QA gates

### Output Format
```
<summary>Brief summary of what was done</summary>
<changes>
- file1.ts: Changed X to Y
- file2.ts: Added Z function
</changes>
<verification>
- Tests passed: [yes/no/skip reason]
- LSP diagnostics: [clean/errors found/skip reason]
</verification>
```

### Escalation Triggers
- 2 fix attempts without success
- Task requires understanding 10+ files
- UI needs visual polish beyond "functional"
- Decision has long-term architectural consequences
- Need to understand an unfamiliar library

---

## @generalist (Deploy)

> **Note:** Shipper was merged into @generalist in v1.3.0. Deploy tasks are now routed to @generalist.

See the @generalist section above for full deploy protocol.

---

## @refiner

**Mode:** all  
**Model:** opencode-go/qwen3.6-plus

### Role
Continuous improvement agent with two modes — INDEX MODE scans memory for patterns and maintains a prioritized backlog, REFINE MODE reviews backlog and executes conservative improvements with safety gates. Self-learning but safe.

### Mode Detection
| Signal | Mode |
|---|---|
| Session end, "index improvements", "scan for patterns" | **INDEX MODE** |
| "Improve this", "refine this", "fix recurring issues" | **REFINE MODE** |
| Ambiguous | Start with INDEX MODE, then offer to refine |

### INDEX MODE — Memory Scanning & Backlog Maintenance

**Input Sources:**
1. **engram** — Search for type:bugfix, type:decision, type:learning
2. **mempalace** — Search wings for error patterns, anti-patterns
3. **brain-router** — Query for recurring failures
4. **Health logs** — Read `thoughts/agent-health/*.jsonl` for failure patterns
5. **Backlog file** — Read `thoughts/curator-backlog/backlog.json` for existing items

**Priority Scoring:** `frequency × impact × (6 - effort)`

| Factor | Scale | Description |
|---|---|---|
| **Frequency** | 1-5 | How often this pattern appears |
| **Impact** | 1-5 | How much fixing this improves the system |
| **Effort** | 1-5 | How hard to fix (inverted in scoring) |

**Item Tiers:**
| Tier | Score Range | Action |
|---|---|---|
| 🟢 **Safe** | 1-20 | Auto-apply candidates (cosmetic, docs, dead code) |
| 🟡 **Moderate** | 21-60 | User approval required (refactor, config change) |
| 🔴 **Broad** | 61+ | Flagged for review only, never auto-apply |

**Workflow:**
1. **Scan** — Search memory systems for patterns
2. **Synthesize** — Group by theme, calculate scores, assign tiers
3. **Update Backlog** — Add new items, update existing, remove resolved
4. **Report** — Present top 3-5 items by priority

### REFINE MODE — Backlog Review & Improvement Execution

**Tiered Action Protocol:**
| Tier | Score | Scope | Action |
|---|---|---|---|
| 🟢 **Safe** | 1-20 | Cosmetic, docs, dead code | Execute directly, log what was done |
| 🟡 **Moderate** | 21-60 | Refactor, config, tests | Present proposal, wait for approval |
| 🔴 **Broad** | 61+ | Architecture, data migration | Flag for review only, never auto-execute |

**Workflow:**
1. **Review** — Read backlog, validate evidence, assess risk
2. **Propose** — Present items grouped by tier, request approval
3. **Execute** — Implement smallest change, verify after each
4. **Report** — Summary of applied/deferred/rejected items

### Anti-Catastrophe Rules
1. **Read before write** — Always read the full file before editing
2. **Git safety** — Ensure clean working tree, commit after each item
3. **Data protection** — Never modify databases, credential configs, or large data files
4. **Scope limit** — If change grows beyond proposal, STOP and re-assess
5. **3-fix limit** — If 3 attempts fail, mark deferred, question approach
6. **No silent failures** — Report verification failures immediately

### Constraints (NEVER)
- Delete files or data without explicit confirmation
- Modify production config without approval
- Change algorithm coefficients without backtest validation
- Stack multiple fixes — one change at a time
- Execute 🔴 Broad items without explicit user approval
- Make changes that affect >5 files without user review
- Act on items without evidence (requires ≥2 data points)

### Output Format
```
<summary>
INDEX: N new items, M resolved, total backlog size
REFINE: N items reviewed, M applied, K deferred
</summary>
<backlog>
Top 3-5 items by priority with tier, score, and proposal
</backlog>
<changes>
- Item ID: What was changed (or "pending approval" / "deferred — reason")
</changes>
<verification>
- Tests passed: [yes/no/skip reason]
- LSP diagnostics: [clean/errors found/skip reason]
</verification>
<next>
Recommended next items to address or "complete"
</next>
```

### Escalation
- If memory systems are empty → report "no data to index", exit cleanly
- If backlog exceeds 50 items → recommend user review session to triage
- If 3+ fix attempts fail → mark deferred, recommend @strategist review
- If a change affects >5 files → pause, recommend @strategist for planning
- If algorithm accuracy is impacted → require backtest validation
- If a 🔴 Broad item is detected → flag immediately for user review
