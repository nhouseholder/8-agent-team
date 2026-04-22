# Memory System Improvement Plan

> **Status:** SPEC — ready for implementation  
> **Date:** 2026-04-22  
> **Author:** @strategist (based on @explorer audit findings)  
> **Scope:** persistent-brain LTM data quality  
> **Estimated Effort:** 6–8 hours across 3 phases  

---

## 1. PROBLEM STATEMENT

### Issue 1: Auto-distill Produces Noise
**Impact:** 109 of 195 observations (55.9%) are auto-distilled "Session summary (auto-distilled)" entries with `type=discovery`. These are raw dumps of engram context with no structure, no topic_key, and near-zero retrieval value. They drown out the 46 actionable observations (decision/bugfix/pattern/architecture) in search results.

**Quantified damage:**
- 55.9% signal-to-noise ratio (44.1% noise)
- FTS5 search returns auto-distill garbage before real facts
- `brain_context` loads stale, unstructured summaries instead of recent decisions
- Agents learn to ignore `type=discovery` entirely, missing the 5 legitimate discoveries mixed in

**Root cause:** `hooks/session-end.sh` unconditionally dumps `engram context` output into a new observation on every session end. No quality gate, no structure requirement, no skip-if-empty logic beyond a 50-char check.

---

### Issue 2: Structured Format Not Enforced
**Impact:** Only 20.5% of observations have topic_keys (40 of 195). Without topic_keys, conflict detection is disabled, upserts don't work, and the same fact gets saved repeatedly. The `content` field is freeform — no `**What**/**Why**/**Where**/**Learned**` enforcement.

**Quantified damage:**
- 79.5% of observations are non-updatable (no topic_key)
- Duplicate facts proliferate (same bug fixed 3×, same pattern learned 4×)
- `brain_correct` can't find the right entry to supersede
- Agent prompts describe structured format but agents ignore it because there's no consequence

**Root cause:** `brain_router.py::engram_save()` accepts any title/content with zero validation. No minimum quality bar, no required fields beyond title+content, no feedback loop.

---

### Issue 3: Project Fragmentation (Worktree Names)
**Impact:** 24 projects exist but 14 are noise (auto-generated worktree names like `vigorous-kirch-204b5b`, `tender-mendel-dcb4d0`). Major projects are under-recorded: mmalogic (4), mystrainai (3), courtside-ai (3), nestwisehq (2), diamondpredictions (1). The real project `8-agent-team` has only 8 observations despite being the most active.

**Quantified damage:**
- `brain_context` for mmalogic returns 4 observations → agents operate blind
- `brain_query` scoped to `diamondpredictions` returns 1 observation → useless
- Cross-project learning is impossible because worktree sessions don't map to canonical projects
- 74% of sessions (80 of 108) produce zero observations because agents don't know which project they're in

**Root cause:** `session-start.sh` uses `basename "$PWD"` as project name. Git worktrees create random directory names. No canonical mapping exists.

---

## 2. PROPOSED SOLUTIONS (with Trade-offs)

### Issue 1: Auto-distill Noise

#### Option A: Fix auto-distill to produce structured output
- Rewrite `session-end.sh` to use an LLM call (or template) to extract structured facts from session context
- Require `**What**/**Why**/**Where**/**Learned**` format
- Only save if ≥1 structured fact extracted
- **Pros:** Keeps safety net, upgrades noise to signal
- **Cons:** Adds latency to shell exit; requires API key; LLM may still hallucinate; adds complexity
- **Effort:** 4–6 hours

#### Option B: Disable auto-distill, require manual saves only
- Delete or no-op the auto-distill block in `session-end.sh`
- Rely on agent `engram_mem_save` calls (already happening for significant work)
- Add a pre-compact checkpoint hook that warns if zero saves this session
- **Pros:** Immediate noise elimination; zero latency; simple; forces agent discipline
- **Cons:** Sessions with no manual saves produce zero observations (already 74% do); risk of losing unsaved context
- **Effort:** 30 minutes

#### Option C: Hybrid — auto-distill only for sessions with >5 manual saves
- Count manual saves per session (track in SQLite or file)
- If count ≥ 5, run auto-distill (high-activity sessions likely have unsaved context)
- If count < 5, skip (low-activity sessions produce noise anyway)
- **Pros:** Targets safety net where it's needed; reduces noise by ~70%
- **Cons:** More complex; requires session-level save tracking; threshold is arbitrary
- **Effort:** 2–3 hours

---

### Issue 2: Structured Format Enforcement

#### Option A: Client-side validation (in agent prompts)
- Update `AGENTS.md` and `_shared/memory-systems.md` to require topic_key for all saves
- Add "Your save was rejected: missing topic_key" to agent instructions
- **Pros:** No code changes; works immediately after prompt regeneration
- **Cons:** Agents can still ignore it; no actual enforcement; same problem as today
- **Effort:** 30 minutes

#### Option B: Server-side validation (in brain_router.py)
- Add `VALID_TYPES = {"decision", "architecture", "bugfix", "pattern", "config", "learning", "manual"}` — reject `discovery` from `brain_save`
- Require `topic_key` for `type != "manual"`
- Require `content` to contain at least one `**` section header
- Return `{"success": false, "error": "...", "hint": "..."}` on validation failure
- **Pros:** Hard enforcement; immediate feedback; no prompt changes needed
- **Cons:** Breaks existing scripts that save `discovery` type; may reject legitimate manual notes
- **Effort:** 1–2 hours

#### Option C: Both
- Server-side validation as gate + client-side prompts as guidance
- Server rejects bad saves; agents learn from rejections and adjust
- **Pros:** Defense in depth; highest compliance rate
- **Cons:** More moving parts; agents may get frustrated by rejections
- **Effort:** 2 hours (A + B)

---

### Issue 3: Project Consolidation

#### Option A: Manual mapping file
- Create `~/.engram/project-map.json`:
  ```json
  {
    "vigorous-kirch-204b5b": "mmalogic",
    "tender-mendel-dcb4d0": "mystrainai",
    "8-agent-team": "8-agent-team"
  }
  ```
- `brain_router.py` reads this file on startup; `session-start.sh` sources it
- **Pros:** Simple; explicit; easy to audit
- **Cons:** Manual maintenance; stale mappings; doesn't catch new worktrees
- **Effort:** 1 hour

#### Option B: Auto-detect worktrees via git
- In `session-start.sh`, check if `$PWD` is a git worktree: `git worktree list --porcelain`
- Extract the branch name or remote URL as canonical project name
- Map `feature-branch` → base project via heuristic (strip prefixes)
- **Pros:** Automatic; catches new worktrees; uses git as source of truth
- **Cons:** Branch names vary (`fix-auth` vs `mmalogic-fix-auth`); requires git dependency; fragile heuristics
- **Effort:** 2–3 hours

#### Option C: Rename on save with canonical mapping
- Keep `project` as directory name in DB (no migration)
- Add `canonical_project` column or virtual mapping in `brain_router.py`
- Queries automatically map worktree names to canonical names
- **Pros:** No DB migration; transparent to callers; queries just work
- **Cons:** Slightly more complex queries; mapping logic lives in code
- **Effort:** 2 hours

---

## 3. RECOMMENDED APPROACH

### Issue 1: **Option B — Disable auto-distill**
**Justification:** The safety net is producing 109 garbage observations. The 74% of sessions that already produce zero manual saves are low-activity sessions (quick lookups, idle chat) that don't need memory. High-activity sessions already have manual saves. The cost of occasional lost context is lower than the cost of drowning valid memories in noise. If we later discover we're losing important context, Option C (hybrid) is an easy upgrade.

### Issue 2: **Option C — Both client-side + server-side**
**Justification:** Client-side alone has already failed (agents ignore prompts). Server-side alone creates friction without guidance. Together, agents get clear instructions AND hard enforcement. The server-side rules should be permissive, not draconian: allow `manual` without topic_key, require topic_key for `decision/architecture/bugfix/pattern`, reject `discovery` from `brain_save` (it's an auto-distill artifact), and warn (not reject) if content lacks `**` headers.

### Issue 3: **Option A + C hybrid — Manual mapping file with query-time resolution**
**Justification:** Auto-detection (Option B) is too fragile — branch names are inconsistent. A manual mapping file (Option A) gives us explicit control. Combine with query-time resolution (Option C) so we don't need to rename 195 existing observations. The mapping file is a simple JSON that @generalist can populate from the audit data.

---

## 4. IMPLEMENTATION PLAN

### Phase 1: Disable Auto-distill (Quick Win — 30 min)

**Goal:** Eliminate 55.9% noise immediately.

| Step | File | Change |
|---|---|---|
| 1.1 | `hooks/session-end.sh:12-29` | Comment out or delete the auto-distill block. Keep session-end and sync blocks. |
| 1.2 | `hooks/session-end.sh` | Add a comment: `# Auto-distill disabled — see docs/specs/2026-04-22-memory-improvement-plan.md` |
| 1.3 | `router/brain_router.py:264-307` | Add validation: reject `type="discovery"` from `engram_save` with error `"discovery is auto-distill only; use type=manual or learning"` |

**Verification:**
- Run `bash hooks/session-end.sh` manually → no new observation created
- Run `python3 -c "from router.brain_router import engram_save; print(engram_save('test','test','discovery'))"` → returns error
- Wait 24h, check `engram stats` → zero new `discovery` entries
- Commit: `git commit -am "fix: disable auto-distill, reject discovery type from brain_save"`

**Rollback:** Uncomment the auto-distill block in `session-end.sh`; remove the `discovery` rejection from `brain_router.py`.

---

### Phase 2: Structured Format Enforcement (1–2 hours)

**Goal:** Increase topic_key usage from 20.5% to >80%.

| Step | File | Change |
|---|---|---|
| 2.1 | `router/brain_router.py:264-307` | Add `VALID_TYPES` and `STRUCTURED_TYPES` constants. Validate in `engram_save()`:
  - `type` must be in `VALID_TYPES`
  - `type` in `STRUCTURED_TYPES` requires `topic_key`
  - `topic_key` must match `^[a-z0-9_-]+(/[a-z0-9_-]+)*$`
  - `content` should contain `**` (warn if missing, don't reject)
  - Return `{"success": false, "error": "...", "hint": "Use topic_key like 'auth/jwt-strategy'"}` |
| 2.2 | `router/brain_router.py:370-375` | Update `brain_save` tool schema: add `topic_key` to `required` array (or note it as strongly recommended); update description to mention structured format |
| 2.3 | `config/AGENTS.md` | Update save instructions: "Always use topic_key for decision/architecture/bugfix/pattern. Format: `**What**/**Why**/**Where**/**Learned**`. See example." |
| 2.4 | `persistent-brain/config/AGENTS.md` | Add a "Memory Quality Checklist" section |

**Verification:**
- `python3 -c "from router.brain_router import engram_save; print(engram_save('test','test','decision'))"` → error (missing topic_key)
- `python3 -c "from router.brain_router import engram_save; print(engram_save('test','test','decision',topic_key='test/key'))"` → success
- `python3 -c "from router.brain_router import engram_save; print(engram_save('test','test','manual'))"` → success (no topic_key required)
- Commit: `git commit -am "feat: enforce topic_key for structured types, validate save format"`

**Rollback:** Revert `brain_router.py` and `AGENTS.md` changes.

---

### Phase 3: Project Consolidation (2–3 hours)

**Goal:** Map worktree names to canonical projects; increase per-project observation counts.

| Step | File | Change |
|---|---|---|
| 3.1 | `~/.engram/project-map.json` | Create mapping file from audit data:
  ```json
  {
    "vigorous-kirch-204b5b": "mmalogic",
    "tender-mendel-dcb4d0": "mystrainai",
    "xenodochial-taussig-fd1165": "courtside-ai",
    "happy-pascal-923191": "nestwisehq",
    "vigilant-franklin-36e937": "diamondpredictions",
    "10-agent-team": "8-agent-team",
    "8-agent-team": "8-agent-team",
    "lucid-satoshi-fad3de": "enhancedhealthai",
    "strange-rhodes-33bd40": "researcharia",
    "unruffled-shirley-13b156": "brewmaps",
    "eager-lewin-665af3": "superpowers",
    "youthful-cray-1caca8": "opencode",
    "bold-banach-628d36": "opencode-agents",
    "optimistic-payne-662d0f": "opencode",
    "nicholashouseholder": "personal"
  }
  ``` |
| 3.2 | `router/brain_router.py:25-26` | Add `PROJECT_MAP_PATH = os.path.expanduser("~/.engram/project-map.json")` and `_load_project_map()` function |
| 3.3 | `router/brain_router.py:202-261` | Update `engram_search` and `engram_context` to accept `canonical_project` param; if provided, query for all worktree names mapped to that canonical name |
| 3.4 | `router/brain_router.py:412-441` | Update `handle_brain_query` to use canonical mapping when `project` param provided |
| 3.5 | `hooks/session-start.sh:7-8` | Add canonical project detection: read `project-map.json`, if current dir basename is a key, emit canonical name in output |
| 3.6 | `scripts/brain-inspect.sh:11` | Update to group by canonical project name in "All Brains" section |

**Verification:**
- `python3 -c "from router.brain_router import _load_project_map; print(_load_project_map().get('vigorous-kirch-204b5b'))"` → `mmalogic`
- `engram search "test" --project mmalogic` returns observations from `vigorous-kirch-204b5b` AND `mmalogic`
- `bash scripts/brain-inspect.sh mmalogic` shows combined count
- Commit: `git commit -am "feat: add canonical project mapping for worktree consolidation"`

**Rollback:** Delete `project-map.json`; revert `brain_router.py`, `session-start.sh`, `brain-inspect.sh`.

---

### Phase 4: Backfill + Cleanup (2 hours)

**Goal:** Fix existing data without breaking anything.

| Step | File | Change |
|---|---|---|
| 4.1 | `scripts/brain-cleanup.sh` (new) | Create cleanup script:
  - Find all `type=discovery` observations with title "Session summary (auto-distilled)"
  - Soft-delete them (set `deleted_at`)
  - Report count deleted
  - Dry-run mode by default |
| 4.2 | Run cleanup script | `bash scripts/brain-cleanup.sh --execute` |
| 4.3 | `scripts/brain-backfill-topickeys.sh` (new) | Create backfill script:
  - Find observations with `type=decision/architecture/bugfix/pattern` and no topic_key
  - Generate topic_key from title (slugify)
  - Update in place
  - Report count updated |
| 4.4 | Run backfill script | `bash scripts/brain-backfill-topickeys.sh --execute` |

**Verification:**
- `sqlite3 ~/.engram/engram.db "SELECT COUNT(*) FROM observations WHERE deleted_at IS NOT NULL AND title LIKE '%auto-distilled%';"` → 109
- `sqlite3 ~/.engram/engram.db "SELECT COUNT(*) FROM observations WHERE type IN ('decision','architecture','bugfix','pattern') AND topic_key IS NULL AND deleted_at IS NULL;"` → 0
- Commit: `git commit -am "chore: backfill topic_keys, soft-delete auto-distill noise"`

**Rollback:** The cleanup script sets `deleted_at`, not hard delete. Rollback = `UPDATE observations SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND title LIKE '%auto-distilled%';`

---

### Phase 5: Documentation + Sync (1 hour)

| Step | Action |
|---|---|
| 5.1 | Update `README.md` with new architecture diagram (engram-only, no mempalace) |
| 5.2 | Update `QUICKREF.md` with new save format examples |
| 5.3 | Commit + push `persistent-brain` changes to GitHub |
| 5.4 | Update `8-agent-team/_shared/memory-systems.md` with new validation rules |
| 5.5 | Regenerate agent prompts (`node scripts/compose-prompts.js`) |
| 5.6 | Commit + push `8-agent-team` changes to GitHub |

---

## 5. SUCCESS METRICS

### Phase 1 (Auto-distill disabled)
| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| New `discovery` observations / week | ~30 | 0 | `engram stats` after 7 days |
| Signal-to-noise ratio | 44.1% | >80% | `(non-discovery / total) * 100` |

### Phase 2 (Structured format enforced)
| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| topic_key usage | 20.5% | >80% | `COUNT(topic_key) / COUNT(*) * 100` |
| Duplicate facts (same title) | ~15 | <5 | `SELECT title, COUNT(*) FROM observations GROUP BY title HAVING COUNT(*) > 1` |
| `brain_save` rejection rate | 0% | 5–10% | Log rejections in `brain_router.py` |

### Phase 3 (Project consolidation)
| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| mmalogic observations | 4 | >20 | Combined worktree + canonical |
| mystrainai observations | 3 | >15 | Combined worktree + canonical |
| courtside-ai observations | 3 | >15 | Combined worktree + canonical |
| diamondpredictions observations | 1 | >10 | Combined worktree + canonical |
| nestwisehq observations | 2 | >10 | Combined worktree + canonical |
| Unique project names in DB | 24 | <12 | `SELECT COUNT(DISTINCT project) FROM observations` |

### Phase 4 (Query relevance)
| Metric | Baseline | Target | Measurement |
|---|---|---|---|
| `brain_query` returns auto-distill in top 3 | ~40% | 0% | Manual spot-check of 10 queries |
| `brain_context` for mmalogic includes relevant decisions | 0 (4 total) | >5 | Manual review |
| Time to find a known fact | ~30s | <10s | Agent self-report |

---

## 6. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Auto-distill removal loses unsaved context** | Medium | Medium | Pre-compact hook already saves checkpoints to `~/.claude/projects/<project>/memory/`; agents can still manual-save before session end |
| **Validation rejects legitimate saves** | Low | Medium | `manual` type has no topic_key requirement; warnings (not rejections) for missing `**` headers; monitor rejection rate |
| **Project map becomes stale** | Medium | Low | Map is JSON — easy to update; `brain-inspect.sh` shows unmapped projects; monthly review |
| **Cleanup script accidentally deletes valid data** | Low | High | Dry-run by default; only targets exact title match "Session summary (auto-distilled)"; soft-delete (recoverable) |
| **Agents confused by new validation errors** | Medium | Low | Updated prompts explain requirements; error messages include `hint` with example topic_key |
| **Existing integrations break** | Low | High | No DB schema changes; no API changes (only added validation); rollback is git revert |
| **Performance hit from canonical mapping** | Low | Low | Map is loaded once at startup; queries use `IN (...)` with at most 2-3 worktree names |

---

## APPENDIX A: File Inventory

### Files to Modify

**persistent-brain repo:**
- `router/brain_router.py` — validation, canonical mapping, query resolution
- `hooks/session-end.sh` — disable auto-distill
- `hooks/session-start.sh` — emit canonical project name
- `scripts/brain-inspect.sh` — group by canonical name
- `config/AGENTS.md` — update save instructions
- `README.md` — update architecture
- `QUICKREF.md` — update examples

### Files to Create

- `~/.engram/project-map.json` — canonical mapping
- `scripts/brain-cleanup.sh` — soft-delete auto-distill noise
- `scripts/brain-backfill-topickeys.sh` — backfill missing topic_keys

### Files to Leave Untouched

- `~/.engram/*.db` — no schema migrations
- `hooks/pre-compact.sh` — already minimal
- `install.sh` — no changes needed
- `bin/` — no changes needed

---

## APPENDIX B: Effort Estimate Breakdown

| Phase | Files | Estimated Time |
|---|---|---|
| 1: Disable auto-distill | 2 (shell + Python) | 0.5h |
| 2: Structured enforcement | 2 (Python + markdown) | 1.5h |
| 3: Project consolidation | 4 (Python + shell + JSON + shell) | 2.5h |
| 4: Backfill + cleanup | 2 (new scripts) | 1.5h |
| 5: Docs + sync | 2 repos | 1h |
| **Contingency** | — | 1h |
| **Total** | — | **~7h** |

---

*End of specification. Ready for @generalist implementation.*
