---
name: researcher
description: Unified deep research skill. Combines deep-research, research-vault, and search-first. Triggers on "research this", "learn about", "find papers on", "save this research", "compile research", or any unfamiliar concept.
use_when: >
  The user explicitly says "use researcher", "call researcher", "run researcher",
  "use research agent", "call research agent", "run research agent",
  "use researcher agent", "call researcher agent",
  "use knowledge base", "call knowledge base".
  OR the user wants to research unfamiliar concepts, algorithms, APIs, statistical methods,
  or save/compile research findings. Before implementing anything non-routine.
---

# RESEARCHER — Unified Deep Research

The single research skill. Replaces deep-research, research-vault, search-first.

## Research Triage

| Level | Action | Examples |
|---|---|---|
| **Routine** | No research — execute | CRUD, pure UI, config |
| **Familiar** | 1-2 quick checks | Pagination, JWT, caching |
| **Technical** | Targeted (3 searches + 1-2 reads) | Elo rating, cosine similarity |
| **Complex** | Full literature review (5 searches + 3 reads) | Bayesian scoring, binding models |

## Phase 1: SCOPE THE KNOWLEDGE GAP

Identify:
- **TOPIC:** What are we researching?
- **WHAT I KNOW:** Honest assessment of current understanding
- **WHAT I DON'T KNOW:** Specific gaps
- **3 KEY QUESTIONS:** What must be answered before building?

## Phase 2: SOURCE HIERARCHY SEARCH

**Tier 1 (gold):** Academic papers (arXiv, Google Scholar), official docs, textbooks, standards
**Tier 2 (expert):** Known expert blogs, conference proceedings, high-vote SO answers, popular GitHub repos
**Tier 3 (community):** Blog posts, tutorials, forums — NEVER sole source

**Sample queries:**
- `"[topic] academic paper methodology"`
- `"[topic] best practices 2025"`
- `"[topic] comparison alternatives benchmark"`
- `"[topic] common pitfalls"`

## Phase 3: DEEP READ

WebFetch top 3-5 sources. Extract:
- Core concept and mathematical foundation
- Assumptions and limitations
- Sensible defaults from literature
- Alternatives and when to use them
- Implementation gotchas

## Phase 4: SYNTHESIZE & PRESENT

**Format (200-400 words, scannable):**

```
WHAT IT IS
----------
[1-2 sentences]

HOW IT WORKS
------------
[Mechanism + math if applicable]

WHEN TO USE / NOT USE
---------------------
- Use when: [...]
- Don't use when: [...]

ALTERNATIVES
------------
| Method | Pros | Cons | Best For |
|--------|------|------|----------|

RECOMMENDATION
--------------
[Which approach and why]

IMPLEMENTATION PLAN
-------------------
[How we'd build it]

SOURCES
-------
1. [Title] — URL
2. [Title] — URL
```

## Phase 5: SEARCH-FIRST (before writing ANY code)

1. **Does it exist in the repo?** → grep modules/tests
2. **Is it a common problem?** → Search npm/PyPI
3. **Is there an MCP for this?** → Check settings.json
4. **Is there a skill for this?** → Check skills directory
5. **Is there a GitHub implementation?** → Search OSS repos

**Decision matrix:**
| Signal | Action |
|---|---|
| Exact match, well-maintained | **Adopt** |
| Partial match, good foundation | **Extend** |
| Multiple weak matches | **Compose** |
| Nothing suitable | **Build** (informed by research) |

## Phase 6: GET APPROVAL, THEN BUILD

**NEVER implement before presenting research.** Wait for user to confirm approach, choose alternatives, or redirect.

## Research Vault (Capture Mode)

When user shares screenshots/articles/tips with reusable knowledge:

```bash
VAULT="research/raw"
DATE=$(date +%Y-%m-%d)
```

Save to `research/raw/YYYY-MM-DD-topic-slug.md`:
```markdown
# [Topic]
**Source:** [where it came from]
**Date captured:** [date]
**Tags:** [2-3 keywords]

## Content
[Key points — not full transcript]

## Relevance
[How this applies to our system]
```

## Domain-Specific Guides

| Domain | Sources | Always Include |
|---|---|---|
| **Stats/ML** | arXiv, Google Scholar | Assumptions, sample size, parametric vs non-parametric |
| **Sports Analytics** | Academic journals, analytics sites | Sample sizes, era adjustments, traditional vs advanced vs ML |
| **Web Dev** | Official docs, MDN | Browser compat, perf benchmarks, built-in solutions first |

## Rules

1. **Research before code** — summary BEFORE implementation
2. **Search-first for tools** — check existing solutions before building
3. **Authoritative sources** — Tier 1 > Tier 2 > Tier 3; every claim needs URL
4. **Alternatives are mandatory** — never present only one option
5. **Max 5 searches + 3 fetches per topic** — be specific
6. **Reuse within session** — don't re-search covered topics
7. **Cross-reference claims** across 2+ sources
