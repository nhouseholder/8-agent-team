---
name: architect
description: Unified planning and strategy skill. Combines spec-interview, brainstorming, writing-plans, design-sprint, and /init into one master workflow. Triggers on "plan this", "spec this", "brainstorm", "design sprint", "how should we build", "think through", "architect", or any non-trivial feature request.
use_when: >
  The user explicitly says "use architect", "call architect", "run architect",
  "use planner", "call planner", "run planner", "use planning", "use spec writer",
  "call spec writer", "run planning session".
  OR the user wants to plan, spec, brainstorm, or design before implementing.
  Task touches 3+ files, has ambiguous requirements, or involves new architecture.
  User says "plan this", "plan X", "spec this", "spec out X", "brainstorm", "design sprint",
  "how should we build", "think through", "architect", "help me think about", "before we code".
---

# ARCHITECT — Unified Planning & Strategy

The single planning skill. Replaces spec-interview, brainstorming, writing-plans, design-sprint, and /init. One workflow, adaptive depth.

## Trigger Detection

| Signal | Depth |
|---|---|
| Bug fix, config change, clear scope | **SKIP** — execute directly |
| 2-3 approaches, pick one | **LITE** — 1 message, recommend + go |
| New feature, 3+ files, unclear approach | **FULL** — spec → plan |
| Greenfield product, validate idea | **SPRINT** — frame → sketch → decide → prototype → test |

## Phase 1: CONTEXT LOAD (always runs)

```bash
# Detect project
pwd && git remote get-url origin 2>/dev/null
# Load existing specs, plans, handoffs
ls docs/specs/ docs/plans/ handoffs/ 2>/dev/null
# Read CLAUDE.md, AGENTS.md, README if they exist
```

Check what's already been decided. Never re-ask covered ground.

## Phase 2: SPEC INTERVIEW (FULL and SPRINT modes)

Ask targeted questions in batches of 2-3. Prefer multiple-choice over open-ended.

**Question Categories (ask only what's unknown):**
1. **Core behavior** — What does it do? What does success look like?
2. **Inputs/outputs** — What data comes in? What gets returned/displayed?
3. **Edge cases** — Empty input, errors, timeouts, invalid state?
4. **Constraints** — Performance, auth, backwards compatibility?
5. **Integration points** — What systems does this touch?
6. **UI/UX** (if applicable) — What does the user see? Existing patterns?
7. **Out of scope** — What explicitly should NOT be in this version?

**For sports/algo projects specifically, always ask:**
- What data source? What time range? Walk-forward or static split?
- What's the baseline accuracy to beat?
- What bet types are in scope?
- What's the minimum sample size for validation?

**For web projects specifically, always ask:**
- What's the target stack? Any existing design system?
- Mobile-first or desktop-first?
- Deploy target (Cloudflare Pages/Workers)?

**Stop asking when you have full clarity.** Don't interview for the sake of interviewing.

## Phase 3: APPROACH DESIGN

### LITE mode (most common):
Present 2-3 approaches with trade-offs in one message. Recommend one. Get user pick. → Phase 4.

### FULL mode:
Propose 2-3 meaningfully different approaches. For each:
- Core architecture (1-2 sentences)
- Key files to create/modify
- Trade-offs (speed vs accuracy vs complexity)
- Your recommendation with reasoning

Present design sections scaled to complexity. Get approval after each section.

### SPRINT mode (greenfield):
Run full 5-phase design sprint:
1. **FRAME** — Long-term goal, riskiest assumptions, target user
2. **SKETCH** — 3 distinct approaches, each with core interaction and differentiation
3. **DECIDE** — Evaluation matrix (solves problem? feasible? simple? addresses risk?)
4. **PROTOTYPE** — Build minimum testable version (one flow, real content, style matters)
5. **TEST** — Walk through core flow, 5-second test, assumption check, kill question

## Phase 4: WRITE SPEC.md

```markdown
# Spec: [Feature Name]
Date: [today]

## Summary
[1-2 sentences]

## Requirements
- [Concrete bullets]

## Out of Scope
- [Explicitly excluded]

## Edge Cases
- [Edge case → expected behavior]

## Technical Constraints
- [Performance, auth, compatibility]

## Integration Points
- [Systems, APIs, databases]

## Acceptance Criteria (BDD)
Given [precondition]
When [action]
Then [expected outcome]

## Open Questions
- [Unresolved decisions]

## Implementation Notes
- [What the implementer must know]
```

Save to `docs/specs/YYYY-MM-DD-<topic>-spec.md`. Commit.

## Phase 5: WRITE PLAN

**Rigor Level** — classify before writing:

| Work Type | Plan Depth |
|---|---|
| Site update | Bullet list, skip alternatives |
| New feature | Step-by-step with file paths |
| New build | Detailed with alternatives + risks |
| Algorithm/model | Detailed + hypothesis + data validation |
| Campaign/one-off | Minimal — speed over thoroughness |

**Plan Structure:**
```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Use executing-plans or dispatching-parallel-agents to implement.

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]

---

### Task 0: Switch to Sonnet
- [ ] Switch model before executing — all decisions are baked in.

---

### Task N: [Component]
**Files:**
- Create: `exact/path`
- Modify: `exact/path:lines`
- Test: `exact/test/path`

- [ ] **Step 1:** Write the failing test
- [ ] **Step 2:** Run to verify it fails
- [ ] **Step 3:** Write minimal implementation
- [ ] **Step 4:** Run to verify it passes
- [ ] **Step 5:** Commit
```

Save to `docs/plans/YYYY-MM-DD-<topic>-plan.md`. Commit.

**Output:** "Plan complete at `<path>`. Switch to Sonnet (`/model sonnet`) before executing — all decisions are baked in, execution is mechanical."

## Rules

1. **Never start coding during spec/planning.** The spec and plan ARE the deliverables.
2. **One question at a time.** Batch 2-3 per message max.
3. **Multiple-choice preferred.** Force clearer thinking.
4. **YAGNI ruthlessly.** Remove unnecessary features.
5. **Explore alternatives.** Always propose 2-3 approaches.
6. **Incremental validation.** Present, get approval, move on.
7. **If user already knows what they want** → skip to Phase 5 (plan only).
8. **If spec already exists** → read it, fill gaps, proceed to plan.
9. **Terminal state after brainstorming is ALWAYS writing-plans.** No other skill.
