# Anti-Patterns — Known Failures & Working Fixes

> OpenCode agents check this before debugging to avoid repeating known-bad approaches.
> Pruned 2026-04-01: kept recurring behavioral patterns + permanent rules. One-time bug fixes removed (the fix is in the code).
> Last updated: 2026-04-22
>
> **SYSTEM BOUNDARY:** This file is for the **OpenCode 8-agent-team system** ONLY.
> For Claude Code anti-patterns, see the separate system at `~/.claude/anti-patterns.md`.
> Never sync or copy between these two systems.

## UFC — Scraper Display-Text Anchor Collides on Duplicate Listings (BFO_DISPLAY_TEXT_FIRST_MATCH) — 2026-04-16
- **Pattern**: `_find_bfo_event_link()` in `scrape_ou_odds.py` used `page_text.find(display_text)` to anchor on a candidate event link, then checked nearby fighter names. BestFightOdds occasionally lists ONE UFC card under TWO event pages with identical display text — e.g. April 18 prelims (`/events/ufc-winnipeg-4130`) + April 19 main card (`/events/ufc-winnipeg-4145`), both labeled "UFC Winnipeg". `find()` returns the FIRST occurrence, the matcher anchored on prelims, never visited the main card, and the cache silently lost ALL headliner O/U lines (Burns, Malott, Jasudavicius, Silva, Young, Moises, Phillips, Jourdain). Frontend rendered "Over 2.5 skipped — price outside gate" because `over_odds=None` returned the same `over_price_blocked` reason code as a genuinely out-of-gate price. User saw the misleading message and reported it as a gate bug.
- **Why it kept happening**: No silent failure surfaced — the scraper successfully captured 7 prelim fights and looked healthy. No per-fight reconciliation against `prediction_output.json`. The reason-code "over_price_blocked" conflated "no odds fetched" with "odds outside gate", so neither the website nor a logfile gave the truth.
- **What TO do (working design, 2026-04-16)**:
  1. Anchor event-link matching on the UNIQUE href in raw HTML (`page_html.find(href.lower())`), not the display text. Each event has a unique URL even when display text repeats.
  2. Return ALL matching event links (`_find_bfo_event_links`) with strict-match (all fighters present) first, loose-match (any fighter) second.
  3. Add sibling-page expansion: once any candidate matches, also walk every other UFC event link with the same display text. Catches BFO's prelim/main split where headliners only appear on one of the two pages.
  4. Reconciliation: after every scrape, walk `prediction_output.json` fights and `[WARN] BFO missing: <key>` for each unmatched fight. Loud, not silent.
  5. Reason-code split in `ou_contract.py`: `_over_block_reason(over_odds)` returns `over_no_odds` when `over_odds is None`, `over_price_blocked` only when a real odds value fails the gate. Same for under.
  6. Frontend shows "sportsbook line not yet posted" for `*_no_odds` and the existing "price outside gate" message for `*_price_blocked`. Truth, not conflation.
  7. Secondary source: extract DK Total Rounds (`_dk_extract_total_rounds`) from the existing DK API call, merge into `ufc_ou_odds_cache.json` without clobbering BFO entries. Belt-and-suspenders for when BFO lags.
- **DO NOT re-add**:
  - `page_text.find(display_text)` anywhere in scraper anchor logic. Use `page_html.find(href)` — hrefs are unique.
  - A single `over_price_blocked` for both missing-data and out-of-gate cases. Always split: missing-data is a scraper bug, out-of-gate is intended behavior.
  - Returning a single best-match event link when BFO might split a card across pages. Always return the list.
- **Files**: `scrape_ou_odds.py`, `ou_contract.py`, `webapp/frontend/src/lib/pickContract.js`, `UFC_Alg_v4_fast_2026.py` (`_dk_extract_total_rounds`, `_persist_ou_to_cache`, retry tuple at the live-prediction O/U path).
- **Verification**: See plan `~/.claude/plans/lexical-churning-engelbart.md`. Live confirmation 2026-04-16: Burns vs. Malott card cache went from 7 prelim fights to 13 fights total; Jasudavicius/Silva and Young/Moises now show real Over 2.5 bets at -310 and -180 respectively (commit `3a16a72`).


## General — Plan Files Crossed Projects Because PLAN_DIR Is Global (PLAN_FILE_CROSS_PROJECT_CONFUSION) — 2026-04-14
- **Pattern**: User approved `imperative-bubbling-lake.md` in mmalogic, but `plan-execution-guard.py` reported `reactive-spinning-plum.md` (Diamond Predictions) as the pending plan. Cause: every plan-consuming hook used `glob.glob(~/.claude/plans/*.md)` + latest-mtime, which crosses project boundaries. The `go` handler then `os.remove`'d "all other plans" — silent data loss of approved plans from other projects. The 2-hour stale cleanup in both `plan-mode-enforcer.py` and `plan-execution-guard.py` did the same thing every session start.
- **Why it kept happening**: The harness forces plan writes into `~/.claude/plans/<slug>.md` with a random slug and no project metadata. Hooks had no way to tell which project a plan belonged to, so they treated the directory as a single global bucket. cwd checks existed only on the guard sidecar, not on plan discovery.
- **What TO do instead (working design, 2026-04-14)**:
  1. `PostToolUse:Write|Edit` → `plan-relocate.py` moves the real file to `<project-root>/.plans/<YYYY-MM-DD>_<slug>.md` and replaces `~/.claude/plans/<slug>.md` with a symlink so the harness-visible path still resolves.
  2. All plan-consuming hooks import `_plan_utils.find_project_plans()` which returns ONLY the current project's plans (scoped `.plans/` + symlinks whose realpath is inside the project).
  3. Stale cleanup in every hook uses `_plan_utils.clean_stale_project_plans()` — never touches plans outside the current project.
  4. Guard sidecar stores cwd AND the real plan path (two-line format) so downstream hooks can verify the exact file being guarded.
  5. `go` cleanup iterates project-scoped plans only, never `glob(~/.claude/plans/*.md)`.
- **DO NOT re-add**:
  - `glob.glob(os.path.join(PLAN_DIR, "*.md"))` followed by `sorted(..., key=getmtime)` in any hook. Use `_plan_utils.find_project_plans()` instead.
  - `for old_plan in glob.glob(...): os.remove(old_plan)` in stale-cleanup or go-cleanup paths. Scope all deletes to the current project.
  - Treating `~/.claude/plans/` as the source of truth for the real file. It's a harness-compat symlink directory only.
- **Files**: `~/.claude/hooks/_plan_utils.py` (new), `~/.claude/hooks/plan-relocate.py` (new), `~/.claude/hooks/plan-execution-guard.py`, `~/.claude/hooks/plan-mode-enforcer.py`, `~/.claude/hooks/plan-write-guard-activator.py`, `~/.claude/settings.json` (PostToolUse:Write|Edit registration).
- **Verification**: See `Verification` section in `~/.claude/plans/purrfect-growing-neumann.md` (approved + executed 2026-04-14).

## General — Plan Pipeline Must Use ACTIVE_PLAN Pointer, Not Mtime (PLAN_PIPELINE_DETERMINISTIC) — 2026-04-14
- **Pattern**: Plan-execution pipeline (Opus writes plan → user approves → user types `go` → Sonnet executes) used "newest plan by mtime" to resolve THE plan. With multiple concurrent plans, equal mtimes, or relocations modifying mtime, the wrong plan could be picked. Filenames were also opaque random slugs (`purrfect-growing-neumann.md`), so user couldn't tell which plan was current at a glance.
- **What TO do (working design, 2026-04-14)**:
  1. Plans named `<YYYY-MM-DD>_<HHMM>_<topic-slug>.md` — topic extracted from plan H1 heading via `_plan_utils.extract_topic_slug()`.
  2. `<project-root>/.plans/ACTIVE_PLAN` is a single-line pointer file containing the absolute real path of the currently-approved plan. Written by `plan-relocate.py` and `plan-mode-enforcer.py:ExitPlanMode`. Read by `plan-mode-enforcer.py:go` BEFORE any mtime fallback.
  3. `response-format-guard.py` (Stop hook) blocks any response that creates ACTIVE_PLAN within the last 60 sec but lacks the verbatim line `Plan saved. Switch to Sonnet, then type: go`. No silent drift.
  4. `plan-pending-reminder.py` (SessionStart) inspects ACTIVE_PLAN; if pending and < 30 min old, injects a context block telling the next session to nudge the user. Survives session compaction.
- **DO NOT re-add**:
  - Mtime-only resolution in `go` handler — always check ACTIVE_PLAN first.
  - Random-slug filenames as the only naming source — always extract topic from content.
  - Reliance on Claude remembering to say "Switch to Sonnet" — Stop hook enforces it.
- **Files**: `~/.claude/hooks/_plan_utils.py` (active-pointer helpers, topic extractor), `~/.claude/hooks/plan-relocate.py` (topic naming, sets pointer), `~/.claude/hooks/plan-mode-enforcer.py` (reads pointer in `go`), `~/.claude/hooks/response-format-guard.py` (enforces hand-off message), `~/.claude/hooks/plan-pending-reminder.py` (NEW, SessionStart reminder).

## General — Absence From settings.json Does Not Mean Unregistered (HOOK_REGISTRY_INCOMPLETE) — 2026-04-11
- **Pattern**: Deleted `copilot-learning-log.py` from `~/.claude/hooks/` after confirming it had no entry in `~/.claude/settings.json`. Assumed "not in settings.json = dead code." File was actually registered in GitHub Copilot Chat's hook system (PostToolUse + UserPromptSubmit), which uses a SEPARATE config from Claude Code. Deleting it immediately broke Copilot Chat in VS Code.
- **Why this fails**: Claude Code (`~/.claude/settings.json`) and GitHub Copilot Chat (VS Code extension) both support `~/.claude/hooks/` but maintain **independent** hook registries. A file can be active in one system while absent from the other. There may be additional consumers (other editors, scripts, cron jobs) that reference files in this directory.
- **What TO do instead**: Before deleting any file in `~/.claude/hooks/`: (1) Check `~/.claude/settings.json` for Claude Code registration. (2) Check VS Code Copilot Chat hooks config. (3) `grep -r "$(basename $file)" ~/.claude/ ~/.config/ ~/Library/Application\ Support/ 2>/dev/null` to catch other references. Only delete after confirming 0 consumers across ALL hook systems.
- **Recovery**: Restore from local git history: `git show HEAD~1:hooks/filename.py > ~/.claude/hooks/filename.py`

## General — Model Auto-Switch From Hook Is Impossible (PLAN_AUTO_SWITCH_IMPOSSIBLE) — 2026-04-11
- **Pattern**: Tried 10 times across ~2 weeks to auto-switch the running Claude Code session from Opus → Sonnet via a hook (`UserPromptSubmit`, `Stop`, `PreToolUse:ExitPlanMode`) right after plan mode exits, so the user wouldn't have to manually click the dropdown. Every attempt silently failed — the session kept running on Opus regardless of what the hook did.
- **Why it is architecturally impossible**: (1) Claude Code Desktop/Web locks the model at session startup; the running session's model is NOT re-read from any file. (2) Writes to `~/.claude/settings.json` "model" key are recognized only for the **next** session — never the running one. (3) There is no public API/IPC to force a live model change mid-session. (4) `get_current_model()` that reads `settings.json` lies: the file says what's persisted, not what's actually running. Desktop can silently override Sonnet → Opus, so a hook that "confirms the switch happened" by reading settings.json always returns true and removes the guard, letting Opus execute freely. That was the specific bug that cost the most cycles.
- **Secondary root cause (same saga)**: Substring-matching "execute plan" / "go" in prose false-fired on diagnostic text like "why does execute plans fail" — and the guard was being written on conversational plan-intent prose, which then bled across projects via the global `~/.claude/.plan-guard-active` file.
- **What TO do instead** (the current working design, 2026-04-10):
  1. Write the plan to disk (`~/.claude/plans/*.md`).
  2. A cwd-scoped guard (`~/.claude/.plan-guard-active` with cwd stored as content) is created by `PreToolUse:ExitPlanMode` (formal plan mode) OR by `PostToolUse:Write` on any file inside `~/.claude/plans/` (informal prose plan path — added 2026-04-11).
  3. `plan-execution-guard.py` on `PreToolUse:Edit|Write` blocks all non-plan-file edits while the guard exists.
  4. Tell the user EXACTLY (one line): *"Plan saved. Switch to Sonnet, then type: go"*. Do not spell out the dropdown/CLI steps and do not claim to know which model is running.
  5. On `go` (start-anchored regex + length < 80 char filter to avoid prose false-match), remove the guard and inject the plan path + execution instructions. Trust the user — hooks CANNOT verify the switch actually happened.
- **DO NOT re-add any of these**:
  - `get_current_model()` that reads `settings.json` — it lies.
  - Writes to `settings.json` "model" key from any hook — only affects next session.
  - Any text that claims to know which model is running.
  - Substring-match of "execute plan", "go", or similar in prose. Use start-anchored regex + short-prompt length filter.
  - Guard creation on conversational plan-intent prose (`detect_plan_intent`). Only real tool calls (`ExitPlanMode`) or actual writes to `~/.claude/plans/` should create the guard.
  - Global, non-project-scoped guard files. Always store cwd in the guard content and check on read.
- **Files**: `~/.claude/hooks/plan-mode-enforcer.py`, `~/.claude/hooks/plan-execution-guard.py`, `~/.claude/hooks/plan-write-guard-activator.py`, `~/.claude/hooks/plan-exit-model-switch.ARCHIVED.py` (10-commit graveyard).

## UFC — Parlay With Correlated Same-Fighter Props (PARLAY_SAME_FIGHTER_CORRELATED) — 2026-04-10
- **Pattern**: Parlay builder selects two props on the SAME fighter in the SAME fight as legs of one parlay (e.g., "Fighter A by KO" + "Fighter A KO R1"). No sportsbook on any platform allows this — correlated same-fighter props are rejected at the slip.
- **When it happened**: v11.27.0 (Hypothesis 15 v2, 2026-04-09) shipped HM3 with a "correlated legs allowed" gate that bucketed legs by `fight_id` with a `>= 2` counter but never checked fighter identity. UFC 327 produced Murzakanov KO R2 + **Hokit KO R1 + Hokit by KO**. The latter two couldn't be placed.
- **Why the backtest number lied**: V3's "+875.58u" advantage over V2's "+709.01u" was partly paper P/L — 3 of V3's 6 winning parlays relied on same-fight correlated legs that would be rejected by any book (Rodriguez KO R1 + Under 2.5 same fight; Leroy KO + Over 2.5 same fight; De Ridder SUB + Over 2.5 same fight). A backtest that counts un-placeable parlays as wins overstates the strategy. The realizable edge was ≤ V2's +709.01u.
- **Root cause**: Treating fight_id as a dedup bucket (allowing 2 legs per fight) without asserting distinct fighters/markets. The dedup key must ensure every leg is independently placeable as a parlay under sportsbook correlation rules.
- **Permanent rule**: **Parlay construction must enforce 1 leg per fight** unless a rigorous check is implemented for (a) distinct fighters AND (b) independent (non-correlated) market types, verified against the target sportsbook's correlation rules. The naive "2 legs per fight OK" rule is broken by construction.
- **Detection**: Any parlay leg generator that uses a fight-level bucket with count >= 2 must be audited. Grep: `_fight_counts\.get|_live_counts\.get` in UFC_Alg_v4_fast_2026.py — gate must be `>= 1`.
- **Fix applied**: v11.27.2 reverted both paths (backtest `_build_registry_event_entry` + live prediction path) to `>= 1` per fight. Canonical baseline dropped +1631.07u → ~+1464.50u, which is the correct realizable number.
- **Validation check for new parlay builders**: For every output parlay, assert `len(set(fighter(leg) for leg in parlay.legs)) == len(parlay.legs)` AND `len(set(fight_id(leg) for leg in parlay.legs)) == len(parlay.legs)` before claiming a P/L number.
- **Files**: `UFC_Alg_v4_fast_2026.py` (dual-path fix)

## React — Whole-Site Black Screen From One Render Crash (REACT_BLACK_SCREEN_NO_BOUNDARY) — 2026-04-10
- **Pattern**: A single component throws during render (e.g. accessing `.roi` on an undefined nested key), React has no ErrorBoundary, so the entire tree unmounts and `#root` becomes empty. Users see a black/blank page that does NOT recover on refresh. Pipeline success logs are misleading because the backend succeeded — the crash is in the frontend at render time.
- **Why it keeps happening**: Data generators (daily pipelines) produce JSON whose shape can shrink when categories drop below min-sample thresholds (e.g. `tier_breakdown` only contains PLATINUM when DIAMOND/GOLD have too few picks). React code that *destructures and dot-accesses* those keys crashes on the first undefined. Two incidents so far: SeasonCard key mismatch (2026-03) and NHL tier_breakdown (2026-04-10).
- **Root cause (generalized)**: The frontend trusts that the data contract is stable. It isn't — daily regeneration re-shapes it whenever category counts fluctuate. Single crash + no boundary = full-site outage.
- **Fix (permanent, 2 layers — now in place for diamond-predictions)**:
  1. **Defense in depth**: `main.jsx` wraps `<App />` in `RootErrorBoundary` (class component with `getDerivedStateFromError` + `componentDidCatch`). A render crash now shows a recoverable error card, never a blank root. **This is the non-negotiable fix. Any new Vite/React site in Projects must have an ErrorBoundary at `main.jsx`/root mount from day one.**
  2. **Root cause (data-driven rendering)**: Replaced the crashing hardcoded legend `tier_breakdown.DIAMOND.roi / .PLATINUM.roi / .GOLD.roi` with `tierChartData.map(t => ...)` so the legend iterates only existing keys. Applies generally: when rendering from a data object whose keys may be absent, iterate via `Object.entries` or a pre-built array — never dot-access a hardcoded subkey of a variable-shape object.
- **Detection / how to catch it earlier**: 
  1. If a user reports "site down / black screen that doesn't resolve on refresh" — it is almost certainly a React render crash, NOT a deploy/DNS/cache issue. Skip purging Cloudflare. Go straight to: (a) open the live site in Chrome MCP, (b) `read_console_messages onlyErrors:true`, (c) read the TypeError, (d) grep the source for the undefined key. Should be <5 minutes to root cause.
  2. When writing React that pulls from a freshly-regenerated JSON file, **grep the current data file** for the keys you're about to dot-access. If any key might be absent, use `?.` or iterate.
- **Applies when**: Any React code in any Projects site (diamond-predictions, mmalogic, courtside-ai, nestwisehq, mystrainai, enhancedhealth, researcharia). All of them need an ErrorBoundary at root if they don't have one. Audit any project where a daily pipeline regenerates JSON consumed by the React app.

## UFC — O/U Odds Source Mismatch After Contract Unification (OU_ODDS_SOURCE_DRIFT) — 2026-04-07
- **Pattern**: O/U contract unification (v11.23.1, `ou_contract.py`) changed O/U odds source from DEC-prop-derived inline odds (broad coverage, ~438 bets) to BFO scraper cache only (~145 bets). `ufc_ou_odds_cache.json` has 618 flat entries (old derived odds) that are unreachable by `get_ou_odds()` because it requires event-nested keys. This caused a legitimate -104u absolute profit drop while per-bet ROI improved (42% → 55%).
- **Root cause**: `scrape_ou_odds.get_ou_odds(event_name, ...)` does `cache.get(event_name, {})` — only finds event-nested entries. Old derived odds stored as flat `"fighter_a|||fighter_b"` keys are orphaned.
- **Impact**: O/U bets dropped from 438 to 145 (-67%), absolute O/U P/L from +181u to +79u, full combined from +779u to +717u.
- **Status**: RESOLVED v11.23.5 (2026-04-07). DEC-prop-derived fallback added to `get_ou_odds()` + relaxed price gates (floor -400, cap ±600). Recovered 78 O/U bets (+8.65u). Remaining gap (~215 bets) is from prop cache name mismatches and missing DEC props.
- **Applies when**: Any O/U odds infrastructure change. Verify `get_ou_odds()` can reach all cache entry formats.

## UFC — Fabricated O/U Odds Fallback (FABRICATED_ODDS) — 2026-04-03
- **Pattern**: When real BFO O/U odds exceed the ±400 cap, the algorithm silently falls back to hardcoded -150 (Over) or -130 (Under) defaults. These fabricated odds produce inflated P/L (e.g., -150 pays +67% vs real -430 paying +23%).
- **Root cause**: Cap was designed for derived odds (which can hit -2000+) but also rejected legitimate real sportsbook odds at -430 to -500. Fallback to hardcoded default was silent — no indication that real odds were rejected.
- **Impact**: +5.93u inflated P/L from fake odds payouts on heavy-juice Over bets.
- **Fix**: When real BFO odds exist and exceed ±600, SKIP the bet entirely. Never fall back to fabricated defaults. Applies in both prediction path and backtest path. Cap raised from ±400 to ±600 in v11.23.5.
- **Applies when**: Any O/U odds handling. If you add a new odds source, ensure the cap-exceeded path SKIPS rather than falls back to a default.

## UFC — Stale Derived Data Files (STALE_HERO_STATS) — 2026-04-01
- **Pattern**: Registry is updated (via fix_registry_placed_flags.py or manual sweep) but hero_stats.json and algorithm_stats.json are NOT regenerated. Website shows inflated/wrong numbers (+327.99u instead of +300.72u).
- **Root cause**: fix_registry_placed_flags.py wrote the registry but didn't trigger the data pipeline (sync_and_deploy.py). hero_stats.json was a pre-baked snapshot that went stale.
- **Fix (permanent, 2 layers)**:
  1. Frontend `getHeroStats()` now always computes from registry via `computeSummaryFromRegistry()` — never reads hero_stats.json
  2. `fix_registry_placed_flags.py` auto-imports and runs `sync_and_deploy.py`'s regeneration after any registry write
- **Applies when**: Any script modifies ufc_profit_registry.json outside of sync_and_deploy.py. Always verify hero_stats.json and algorithm_stats.json match registry totals after registry modifications.

## UFC — Career Stats Data Leakage in Backtester (CAREER_STATS_LEAKAGE) — 2026-04-01
- **Pattern**: Backtester produces different picks than live predictions for recent events. Pick-flips where backtester "knows" who won.
- **Root cause**: `get_fighter_stats()` returns a single snapshot of career stats (SLpM, StrAcc, TDAvg, etc.) from `ufc_backtest_registry.json` without temporal filtering. After a fighter's latest fight, their stats change on ufcstats.com. The backtest registry stores current stats, so the backtester sees post-fight data for recent events.
- **Impact**: 3 pick-flips, 4 divergences across 3 archived events. +10.44u inflated P/L corrected.
- **Fix (immediate)**: `patch_registry_from_archive.py` — patches divergent bouts using prediction_archive/ as ground truth. Run after every backtest for events that have archives.
- **Fix (long-term needed)**: Compute career stats from fight-level data with temporal cutoff (same approach used for Elo and method profiles). This would require refactoring `get_fighter_stats()` to aggregate from `fight_history` entries filtered by `cutoff_date`.
- **Applies when**: Any backtest re-run. Always cross-check last 5 events against prediction_archive/ after re-running the backtester.

## MyStrainAI — useRatings TDZ Crash from ESLint exhaustive-deps (ESLINT_TDZ) — 2026-04-07
- **Pattern**: ESLint auto-fix added `_computeLocalProfile` to `rateStrain`'s useCallback dependency array. But `_computeLocalProfile` was a `const` declared 37 lines AFTER `rateStrain`. Dependency arrays are evaluated immediately (not lazily), so accessing the `const` before its declaration triggers JavaScript's Temporal Dead Zone → `ReferenceError: Cannot access 'w' before initialization` in minified bundles.
- **Root cause**: Commit `736dd2d` lint fix changed dep array from `[userId, ratings]` to `[_computeLocalProfile, ratings, userId]` without checking declaration order.
- **Fix**: Move `_computeLocalProfile` declaration (entire useCallback block) BEFORE `rateStrain` in `useRatings.js`. Added code comment warning about TDZ.
- **Diagnosis key**: Chrome MCP tools captured the stack trace pointing to `useRatings-B3X3Q6P1.js:1:2024`. Reading the minified bundle showed `const v = useCallback(... [w, o, a])` before `const w = useCallback(...)`.
- **Applies when**: Any ESLint exhaustive-deps auto-fix. Always check that added dependencies are declared BEFORE the hook that references them. `const`/`let` are not hoisted like `function` declarations.

## MyStrainAI — Cloudflare Pages _middleware.js must process all requests (CF_MIDDLEWARE_ASSETS) — 2026-04-07
- **Pattern**: Attempted to skip non-API routes in `_middleware.js` to avoid wrapping static assets in `new Response()`. Result: `_redirects` catch-all (`/*  /index.html  200`) intercepted JS asset requests and served HTML instead of JavaScript.
- **Root cause**: Cloudflare Pages Functions middleware participates in the asset serving chain. When middleware returns `context.next()` for non-API paths, it still correctly routes to static assets. But when you skip middleware entirely for some paths, the `_redirects` catch-all takes priority, serving `index.html` for all paths including `/assets/*.js`.
- **Fix**: Keep middleware processing ALL requests. The `new Response(response.body, response)` wrapper is necessary for static assets to be served correctly.
- **Applies when**: Modifying Cloudflare Pages `_middleware.js`. Never exclude routes — the middleware must call `context.next()` and wrap the response for all paths.

## General — iCloud Filesystem Stalling (ICLOUD_STALL)
- **Pattern**: Grep/read stalls on iCloud files → Claude retries with different tool → same stall → token burn loop
- **Fix**: Clone from GitHub to `/tmp/`, work there. Never retry stalling ops with a different tool — the issue is iCloud, not the tool.

## General — Context Overload From Data Dumps (CONTEXT_FLOOD)
- **Pattern**: Reading 3+ large files + dumping raw JSON in one turn → context full → silent/dead stop
- **Fix**: Max 2 large reads per turn. Never dump raw JSON — use `python3 -c` for targeted queries. Act before reading more.

## General — Empty Output Retry Loop (BLIND_RETRY)
- **Pattern**: Command produces empty output → Claude re-runs 4+ times without diagnosing why
- **Fix**: STOP → check exit code/stderr/cwd/deps → isolate smallest test → fix cause → THEN re-run.

## General — Triple Pivot: Full Pipelines Before Math (TRIPLE_PIVOT)
- **Pattern**: Running full backtests to test parameter changes that could be answered with arithmetic
- **Fix**: Pre-compute gate: (1) Can math answer this? (2) Can a 10-line script? (3) Locked approach? All must pass before running pipeline.

## General — Domain Flip-Flop Without Reading Spec (FLIP_FLOP)
- **Pattern**: Changing betting/scoring/business rules 3-4 times in one session without reading the spec
- **Fix**: Read the spec FIRST. Never change domain rules based on "I think" — read EVENT_TABLE_SPEC.md or the relevant spec file.

## General — Revert Loop (REVERT_LOOP)
- **Pattern**: Implementing a change → reverting → re-implementing → reverting. 5+ reversals of the same decision.
- **Fix**: Lock your approach before starting. Write a 1-sentence plan. If you need to revert, explain WHY in writing before reverting.

## Permanent — NEVER Accept Missing Odds
- Prop odds must be scraped/backfilled, never accepted as null. Missing odds → missing P/L → wrong totals.
- Run `python3 check_prop_odds.py` after any registry modification.

## MLB — Synthetic-Bucket Payouts Inflate Prop Backtest ROI (SYNTHETIC_PAYOUT_OPTIMISM) — 2026-04-18
- **Symptom**: 10 consecutive MLB HR/hits hypotheses killed (H39-H48). User asked "are we sure vegas odds are accurate?" — correct intuition.
- **Root cause**: `mlb_predict/backtest/prop_backtester.py` had **no per-date real-odds path** for HR or hits markets. `backtest_cache/prop_odds/` archived only `K_lines/`. Every HR pick resolved through `HR_MATCHUP_BUCKETS` / `HR_ISO_BUCKETS` (synthetic, single-book BetOnlineAG, +900-capped) or flat `MARKET_JUICE["home_runs"]["over"]` = +600 when ISO/HR9 null. Every hits pick hit flat -172.
- **Evidence** (from `sample_picks` in H39-H48 result JSONs): 6-20 of 20 HR picks had `iso_at_fire: null` → flat +600 fallback. H39 + H42 (hits): 20/20 flat +58 payout.
- **Bias direction**: FAVORABLE to backtester. Flat +600 overpays elite-power wins (real odds ~+280-450 for Judge/Ohtani tier). Measured ROI is an optimistic upper bound — kills still stand, but live ROI on any borderline-pass would be **worse** than measured.
- **Fix (partial, 2026-04-18)**:
  1. Added `MULTIBOOK_ARCHIVE_DIR` + `_load_multibook(date)` + `get_archived_real_payout(market, side, player, line, date)` in `prop_backtester.py`. Resolution order: archived real → empirical cache → synthetic bucket → flat MARKET_JUICE.
  2. Added `PropBacktester.payout_source_counts` provenance dict; `_print_payout_provenance()` reports distribution per run. Any backtest with 0% `archived_real` is bucket-only → treat ROI as optimistic.
  3. `snapshot_prop_lines.py` already runs 2x/day via CI writing to `data/prop_lines_multibook/` with all 5 markets + full books[] array. Archive is forward-only (2026-04-17+).
  4. Wrote `scripts/derive_hits_buckets_multibook.py` (analog to HR derive); both derive scripts GATED at 1000 rows. Hits: 621/1000 currently (~14d to clear). Fixed tuple-key JSON serialization bug in existing HR script.
- **Blocked**: Historical 2024/2025 real prop odds. The Odds API historical = paid-tier only (`HISTORICAL_UNAVAILABLE_ON_FREE_USAGE_PLAN`, HTTP 401). BettingPros scraper live-only. Historical prop backfill requires a paid data source (~$30-100/mo) — user decision.
- **Prevention**: Every new prop hypothesis eval must report payout_source_counts. If `archived_real` is 0%, verdict note must include "synthetic-bucket payouts — ROI is optimistic upper bound". Never cite a prop backtest ROI as "real" when provenance is 100% synthetic.

## Permanent — NEVER Gate Bets by Odds Range
- DEC odds gate caused -91.95u regression. Longshot wins (+300 to +800) cross-subsidize mid-range losses.
- Method bets are a portfolio — never remove the tail.

## Permanent — NEVER Deploy Without Commit
- Cloudflare deploys are irreversible. Deploying from dirty working tree → old code overwrites new frontend.
- Always: commit → push → deploy from clean state.

## Permanent — NEVER Overwrite Firestore/Registry Without Backup
- Size-check before write. If new data is smaller than existing → ABORT. Backup first, merge don't replace, post-write verify.

## Permanent — NEVER Touch Frontend During Backend/Algorithm Updates
- Algorithm update destroyed courtside-ai admin page. Backtester run overwrote live prediction page.
- Scope: if the task says "algorithm," touch ONLY algorithm files. Never modify components, pages, or styles.

## Permanent — NEVER Rename Directories With Active Sessions
- Kills all Claude sessions instantly. Warn user first, ensure handoffs exist.

## UFC — SUB→DEC Fallback Is Optimal (DO NOT OVERRIDE)
- GSA hybrid gate tested: +0.00u delta. Elite grapplers win by DEC (55%), not SUB (25%).
- The blanket SUB→DEC fallback captures the dominant outcome and is mathematically optimal.

## UFC — Live Tracker Scoring Gap (LIVE_TRACKER_SCORING_GAP) — 2026-04-07
- **Pattern**: `scoreFight()` in LiveTrackerPage.jsx only scored ML, Method, and Combo. O/U scoring was completely missing, and method bets had no gating (scored as placed/lost even when no method odds existed). Live-tracked events showed wrong O/U results and phantom method losses.
- **Root cause**: `scoreFight()` was written before O/U bets were added (v11.20.4) and never updated. Method gating was never implemented in the frontend — the Python `track_results.py` has it but the JS function didn't.
- **Fix**: Added O/U scoring (Over: round >= 3; Under: round <= 2 with KO/TKO/SUB finish), method gating (check method odds exist before scoring), and `*_placed` flags to `scoreFight()`. Also fixed Scoreboard to show O/U instead of Round.
- **Rule**: `scoreFight()` in LiveTrackerPage.jsx MUST mirror `track_results.py` scoring logic for ALL bet types. When a new bet type is added to the algorithm, it must be added to BOTH scoring paths.
- **Applies when**: Any new bet type added, any scoring rule change, any Live Tracker modification.

## UFC — Ghost X Bug Prevention
- Always use `*_placed` flags, never infer bet placement from `*_correct !== null`.
- Run `python3 validate_registry_cells.py --strict` after any registry modification.

## UFC — Round Bet Is INDEPENDENT of Method
- Round and method are separate bets. Fighter loss = ALL prop bets lose. SUB gating stays.
- See EVENT_TABLE_SPEC.md for canonical scoring rules.

## UFC — Hypothesis Testing Data Format Traps (HYPOTHESIS_DATA_TRAPS) — 2026-04-08
- **Pattern 1**: `fight_history` in `ufc_backtest_registry.json` uses `'WIN'`/`'LOSS'`, NOT `'W'`/`'L'`. Writing `result not in ('W', 'L')` causes zero activations with no error — silent failure.
- **Pattern 2**: File imports `from datetime import datetime` — so `datetime` is the CLASS, not the module. `datetime.date.fromisoformat()` fails with AttributeError. Correct pattern: `datetime.strptime(date_str, "%Y-%m-%d").date()`.
- **Pattern 3**: Baseline from registry totals (e.g. 745.78u) diverges from fresh backtest run (770.51u). Always establish baseline from a FRESH clean run, never from file reads. Incremental registry totals are stale.
- **Pattern 4**: Backtest overwrites production data files. Must `git restore` ALL data files between coefficient sweep runs or results are confounded.
- **Applies when**: Writing ANY new function in `UFC_Alg_v4_fast_2026.py`. Check data format with `python3 -c` BEFORE writing code. Check imports at top of file BEFORE using stdlib functions.

## Build — Node 25 Rollup Deadlock
- Node 25 + Rollup causes hanging builds. Use `NODE_OPTIONS=--max-old-space-size=4096` or downgrade to Node 22.

## General — Deploy Without GitHub Push (DEPLOY_WITHOUT_PUSH) — 2026-04-01
- **Pattern**: `wrangler pages deploy dist/` runs successfully, version goes live, but source was never committed/pushed to GitHub. Subsequent sessions see stale code, can't review changes, and source is effectively lost in the minified CDN bundles.
- **Root cause**: Previous sessions deployed to Cloudflare Pages directly without committing to git first. 10 versions (v5.168–v5.177 of MyStrainAI) were lost and had to be reverse-engineered from minified production JS.
- **Fix**: ALWAYS commit + push BEFORE deploying. Mandatory sequence: build → commit → push → deploy → verify. Never use `wrangler pages deploy` without a clean git state and pushed commit.
- **Applies when**: Any Cloudflare Pages deploy, any version bump, any `wrangler` command. Check `git status` before deploying — if there are uncommitted changes, commit and push first.

## ResumeForge — PDF Upload Spinner From CDN Worker + Missing Finalizer (PDF_WORKER_SPINNER_TRAP) — 2026-04-08
- **Pattern**: Uploading a PDF leaves the builder stuck on "Reading file" instead of reaching either the editor or an error state.
- **Root cause**: The client parser pointed PDF.js at a CDN-hosted `pdf.worker.min.mjs` URL that failed to load for the shipped version, and `BuilderPage.handleFile()` did not use `try/finally`, so extraction exceptions left `isParsing` true forever.
- **Fix**: Bundle the PDF worker locally via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`, catch text-extraction failures in `parseResume()`, and always clear parsing state in `BuilderPage` with `finally`.
- **Prevention rule**: Never make the upload spinner depend on external worker/CDN availability, and never let async intake flows mutate loading state without a guaranteed cleanup path.
- **Verification**: Upload a PDF in browser automation and confirm the app does not remain on "Reading file"; it must either open the editor or show the intake error state.

## Permanent — ALWAYS Use `tier` Field for Pick Filtering (TIER_FILTER_GATE) — 2026-04-02
- **Pattern**: Frontend filters picks using legacy boolean flags (`is_apex`, `is_agree`, `is_ml_pick`) which miss newer tiers (MADNESS, DISCOVERY, MONEYLINE) that only set `tier` field. Picks appear in grading but never show in bet history.
- **Root cause**: DashboardPage.jsx `unifiedResults` filter checked `!r.is_apex && !r.is_agree && !r.is_ml_pick` — MADNESS picks have `is_madness: true` but this flag was never checked. The `tier` field was introduced later but never used as the canonical filter.
- **Fix**: Filter on `tier` field first (`VALID_TIERS` set), fall back to boolean flags for legacy data. Badge rendering also uses tier-first logic.
- **Rule**: NEVER filter picks using only boolean flags. Always check `tier` field. When adding a new tier, add it to BOTH: (1) `TRACKED_TIERS` in grading files, (2) `VALID_TIERS` in frontend display filters. Both NCAA and NBA.
- **Applies when**: Any new tier is added, any frontend bet history rendering, any grading pipeline change.

## Permanent — NEVER Apply Filters From Small Samples (SMALL_SAMPLE_FILTER) — 2026-04-02
- **Pattern**: Experiment on N=74 showed "|model_spread|>=10 = 48.6% ATS" → applied as production filter. Expanded dataset (N=8,741) showed edge 10+ = 52.0% ATS (profitable). Filter was cutting good picks.
- **Root cause**: Small samples (N<200) produce noisy ATS estimates. A 48.6% finding on N=74 has a 95% CI of roughly [37%, 60%] — it could easily be 55% ATS.
- **Fix**: NEVER apply hard production filters from experiments with N<200 decided bets. Use the auto-learning pipeline (auto-prune with rolling 30-bet windows) instead — it evaluates continuously as data accumulates.
- **Rule**: For any hypothesis to become a hard-coded filter, it must show statistical significance (p<0.05) on N≥200 walk-forward validation data. Below that threshold, log the finding and let auto-prune handle it.
- **Applies when**: Any experiment finding, any backtest result, any "this range underperforms" conclusion.

## Permanent — NCAA Postseason Model FAILS (POSTSEASON_FAIL) — 2026-04-02
- **Pattern**: NCAA MADNESS/tournament tier shows high backtest ATS on small cherry-picked subsets, but 3-season walk-forward on N=350 postseason games = 37-43% ATS consistently. Live record: 2W-3L (40%).
- **Root cause**: Elo ratings from regular season don't transfer to single-elimination tournament play (neutral sites, different team preparation, higher variance). The "69.2% ATS" claim was overfitted.
- **Fix**: MADNESS tier disabled in v12.36.3. Code preserved, `if (false &&` guard.
- **Rule**: Do NOT re-enable postseason picks without a fundamentally different model (not just parameter tuning of Elo). Regular season model works (57.4% ATS, N=8,225).
- **Applies when**: Any discussion of March Madness picks, tournament tier, or postseason model. Read this before re-enabling MADNESS.

## ResearchAria — Systematic Review Prompt Overflow (REVIEW_PROMPT_OVERFLOW) — 2026-04-05
- **Pattern**: The 9-phase literature review UI falls back to "Failed. Please try again." because `/api/review/prompt` sends too much paper context to the AI provider.
- **Root cause**: The review route pulled up to 50 enriched papers and embedded long abstracts plus 2,000-character full-text excerpts into every phase request. Smaller AI-backed flows survived, but the systematic-review prompts exceeded practical context limits and all providers failed.
- **Fix**: Bound the review context before calling the AI. Prioritize papers marked `screening_decision = 'include'`, then highest-scoring remaining papers, cap total prompt context, and never embed raw full-text excerpts in the 9-phase review path. Also surface the backend error message in the UI instead of replacing it with a generic fallback.
- **Prevention rule**: Any multi-paper AI route must set an explicit context budget before calling the model. Never pass an unbounded library dump or raw full-text excerpts into a review-generation prompt.
- **Verification**: Run the bounded review context regression tests and confirm the review route compiles: `node --test --experimental-strip-types test/reviewContext.test.mjs` and `npx tsc --noEmit`.

## ResearchAria — Firebase Popup Hosted Init + Redirect Mismatch Trap (FIREBASE_GOOGLE_AUTH_TRAP) — 2026-04-05
- **Pattern**: Google sign-in breaks in two layers: the Firebase popup path requests `https://aria-research-app.firebaseapp.com/__/firebase/init.json` and gets a hosted 404 page because the Firebase Hosting auth domain has never been deployed, while a naive switch to `https://researcharia.com/__/auth/handler` triggers Google's `redirect_uri_mismatch` error because that redirect URI is not registered on the OAuth client.
- **Root cause**: I treated the popup break as a frontend auth-domain problem instead of checking whether the Firebase Hosting auth domain itself had ever been deployed. Without a deployed Hosting site, the reserved Firebase auth URLs are incomplete.
- **Fix**: Deploy a minimal Firebase Hosting site to `aria-research-app` so `__/firebase/init.json` exists again on `aria-research-app.firebaseapp.com`, keep Firebase `authDomain` on that hosted domain, and continue using Firebase `signInWithPopup`.
- **Flawed assumption**: I burned time on alternative Google auth flows before verifying that the Firebase auth domain itself was still just the default Hosting 404 site.
- **Prevention rule**: For Firebase popup auth failures, check `https://<project>.firebaseapp.com/__/firebase/init.json` first. If it returns a Hosting 404 page, deploy the Firebase Hosting site before rewriting app auth code.
- **Verification**: `curl -s https://aria-research-app.firebaseapp.com/__/firebase/init.json` must return JSON, and a popup probe against `researcharia.com` must no longer show `redirect_uri_mismatch` or a blocking init.json 404.

## BrewMap — Weak Review Flavor Evidence And Permissive Roast Filters (BREWMAP_FLAVOR_FILTER_DRIFT) — 2026-04-05
- **Pattern**: Review-derived flavor tags included one-off words that barely appeared in Yelp reviews, and the Light/Medium/Dark pill filter still showed shops with no roast data.
- **Root cause**: Flavor extraction treated any detected term in the combined review text as meaningful evidence, while the roast filter used a permissive predicate that allowed missing roast metadata to pass through an active roast filter.
- **Fix**: Require a flavor tag to appear in at least 2 separate reviews before it can become a review-derived tag, and fall back to AI flavor estimates when fewer than 2 review-backed tags remain. For roast filters, use explicit roast-bucket matching and exclude shops with no roast data when a roast filter is active.
- **Flawed assumption**: I assumed a single flavor mention across sparse reviews was enough to drive the UI, and that missing roast data should not narrow a positive roast filter.
- **Reasoning lesson**: When the UI claims a value is review-derived or filterable, require repeated evidence and use strict inclusion rules instead of permissive fallthroughs.
- **Applies when**: Extracting structured tags from sparse review text or building categorical filters on partial enrichment data.

## BrewMap — Mobile Scroll Blocked By Container Gesture Locking (BREWMAP_SCROLL_GESTURE_LOCK) — 2026-04-06
- **Pattern**: The site appears not to scroll on mobile because the bottom sheet and list areas ignore normal touch scrolling.
- **Root cause**: The entire mobile `.sidebar` was set to `touch-action:none`, and the global `touchmove` preventer only exempted a few descendants instead of treating the sidebar as a scrollable interaction region.
- **Fix**: Keep gesture locking only on the sheet handle, restore normal touch handling on the sidebar, and let the body-level touch blocker allow any touch interaction inside `.sidebar`, `.detail-panel`, `.city-search-results`, `#map`, and `.loading-overlay`.
- **Flawed assumption**: I treated the whole sheet like a drag surface instead of isolating drag behavior to the handle.
- **Prevention rule**: Never apply `touch-action:none` to an entire mobile container that also holds scrollable content. Restrict drag-only gesture locking to the explicit handle.
- **Verification**: On a mobile viewport, confirm the shop list and featured rails can scroll naturally while the sheet handle still drags the panel.

## NestWise — Portfolio Edit Rows Need Spinnerless Numeric Inputs And Inline Context Labels (NESTWISE_PORTFOLIO_EDIT_ROW_CLIPPING) — 2026-04-07
- **Project**: nestwisehq / dad-financial-planner
- **Page/Component**: `/portfolio` — `components/portfolio/holdings-table.tsx`, `components/portfolio/trade-form.tsx`, `components/portfolio/portfolio-grade.tsx`
- **Bug**: Native browser number steppers crowded the portfolio quantity input until the value was effectively hidden, inline edit cells changed meaning without labels, and the QORE distribution rendered as jammed strings like `61%A 39%B`.
- **Root cause**: Dense financial table inputs reused narrow columns and default browser numeric controls, while edit-mode cells repurposed existing headers without adding local context.
- **Carelessness type**: Didn't check actual rendered output in a cramped layout.
- **Fix**: Added a scoped `.input-no-spinner` utility for the affected portfolio number inputs, widened the inline edit fields slightly, labeled the edit cells as `Shares`, `Basis`, and `P/L`, and rendered QORE distribution values as separated badges.
- **Prevention rule**: In dense financial tables, never ship default browser number steppers or unlabeled edit-mode cells. If a cell changes meaning in edit mode, label it inside the cell and verify the value is readable at the actual table width.
- **Verification**: On `/portfolio`, inline holding edit must show the full quantity value, trade form numeric inputs must render without native Safari steppers, and the Portfolio Grade QORE buckets must render as distinct badges.

## NestWise — Chat Second-Turn Failure And Portfolio Bias (NESTWISE_CHAT_HISTORY_OVERFLOW) — 2026-04-13
- **Project**: nestwisehq / dad-financial-planner
- **Page/Component**: `/assistant` — `app/api/chat/route.ts`, `components/assistant/assistant-chat.tsx`, `lib/chat/runtime.ts`
- **Bug**: The assistant could answer once, then fail on the next turn with a generic error. Broad market or AI-industry questions in General mode also got dragged back into the portfolio context or misread `AI` as ticker `AI`.
- **Root cause**: The route validated every message in the full conversation against the 4,000-character user-message limit, so a long first assistant reply poisoned the second request. Separately, General mode always carried heavy personal portfolio context and a naive uppercase ticker extractor, which biased non-personal questions toward holdings analysis.
- **Carelessness type**: Didn't separate user-input validation from model-history preparation; assumed more context was always better; assumed uppercase token extraction was safe.
- **Fix**: Added `lib/chat/runtime.ts` to validate only user-message length, clip long history before reuse, select context by intent, exclude `AI` and similar false tickers, switch chat default to Gemini 2.5 Flash, and add grounded-search first with plain-Flash fallback. The UI now surfaces the actual backend error instead of a generic placeholder.
- **Prevention rule**: Never apply user input limits to prior assistant messages, and never force full portfolio context into broad live-news questions by default.
- **Verification**: `npm run typecheck`, `npm exec -- vitest --run lib/chat/runtime.test.ts`, and `npm run build` must all pass. In `/assistant`, a second turn after a long first answer must still complete, and a General-mode question about current market or AI developments must not default to the user's portfolio.

## MyStrainAI — esbuild.drop:['console'] Breaks Library Error Handling (ESBUILD_DROP_CONSOLE) — 2026-04-07
- **Pattern**: Using `esbuild: { drop: ['console'] }` in vite.config.js removes ALL console methods including `console.error` and `console.warn`, which breaks libraries that use those methods in their internal error handling paths (FingerprintJS, Firebase Auth).
- **Root cause**: `esbuild.drop: ['console']` is equivalent to `delete console.*` — a blanket removal. On Brave browser with fingerprint protection enabled, FingerprintJS hits error paths that call `console.error` at startup. With the method removed, uninitialized variable propagation fails silently, causing a TDZ (Temporal Dead Zone) ReferenceError that crashes the app.
- **Symptom**: Mobile TDZ crash: `ReferenceError: Cannot access 'X' before initialization` on browsers with privacy protections (Brave, Firefox w/ Enhanced Tracking). Doesn't repro on Chrome/Safari.
- **First fix (wrong)**: Added `Cache-Control: no-cache` + ErrorBoundary stale-chunk reload — didn't fix root cause.
- **Correct fix (v5.217.7)**: Changed to `esbuild: { pure: ['console.log', 'console.debug'] }` — only strips non-essential calls, preserves `console.error`/`console.warn` for library error handling.
- **Rule**: NEVER use `esbuild.drop: ['console']` for production builds. Use `esbuild.pure` targeting only `console.log` and `console.debug`. `console.error` and `console.warn` are load-bearing for third-party libraries.
- **Verification**: Build with `esbuild.pure`, test on Brave with "Shields Up". FingerprintJS initialization must not throw.

## LUCIDE-REACT NEW IMPORT IN STRAIN CARD → TDZ CRASH
- **File**: `frontend/src/components/results/StrainCard.jsx`
- **Symptom**: `ReferenceError: Cannot access 'w' before initialization` — app crashes with ErrorBoundary on all pages that render StrainCard
- **Root cause**: Adding a NEW lucide-react icon (TrendingUp) as a static import to StrainCard changed the Vite chunk graph. The new chunk dependency altered module initialization order, triggering a TDZ in one of the shared chunks (`fmt` or `normalizeStrain` — both have module-scope `const w` declarations).
- **Fix**: Use an icon already imported in StrainCard (Star, Heart, MapPin, etc.) instead of introducing a new import. If a new icon is genuinely needed, use an inline SVG instead.
- **Rule**: Never add a new lucide-react icon import to StrainCard without rebuilding and testing in the browser (not just checking build success).

## Courtside — Props Rollout Must Match The Validated Rule (COURTSIDE_PROP_RULE_DRIFT) — 2026-04-13
- **Project**: courtside-ai
- **Page/Component**: `functions/api/nba-props-generate.js`, `functions/lib/player-stats.js`, `src/lib/prop-systems.js`
- **Bug**: The live NBA props rollout promoted three expected-soft 3PM systems even though only `MJ165` was robust enough to ship, used `line_delta <= -1.5` instead of the researched `<= -0.6`, and averaged the oldest 20 games instead of the most recent 20 in the live baseline helper.
- **Root cause**: The rollout copied the research family name and headline ROI without diffing the live predicates against the backtest predicates line-by-line or re-running the helper math against newest-first logs.
- **Carelessness type**: Didn't verify after; copied without understanding.
- **Fix**: Re-tested the family on clean train/holdout windows, restricted live production to `3PM_UNDER_EXPECTED_SOFT_MJ165`, changed the live threshold to `line_delta <= -0.6`, fixed `computePlayerBaseline()` to use newest-first logs, and updated the visible props catalog.
- **Prevention rule**: When shipping a backtested system, diff the live rule against the research rule line-by-line and run a minimal runtime repro for every rolling helper that feeds it before deploying.
- **Verification**: `node --test functions/lib/player-stats.test.js`, direct newest-first baseline repro, `npm run build`, and source smoke checks confirming only `MJ165` remains live.

## UFC — Backtester Writes combo_correct=True on KO-R1 pred / R2 actual (COMBO_R1_R2_MISMATCH) — 2026-04-14
- **Pattern**: For bouts where predicted_method=KO, predicted_round=1, actual_method=KO, actual_round=2, the backtester or patch script sometimes marks combo_correct=True, producing an inflated combo win.
- **Known affected bout**: Mauricio Ruffy vs Rafael Fiziev at UFC 325: Volkanovski vs. Lopes 2 (combo_pnl +11.0 should be -1.0; combined_pnl +17.63 should be +5.63).
- **Impact**: +12.00u inflation in Combo P/L that survives every 100-event regeneration.
- **Surgical fix**: `scripts/patch_ruffy_combo.py` (run after every backtest until root-cause fix ships).
- **Suspected source**: KO-round-promotion logic (v11.23.2 / v11.23.4) may set an `effective_round` of 2 while the stored `predicted_round` stays at 1, then combo scoring uses effective_round for the equality check. Needs confirmation.
- **Investigation entry points**:
  - `UFC_Alg_v4_fast_2026.py` line 11370-11385 (combo scoring)
  - `patch_registry_from_archive.py` line 173-188 (patch combo scoring)
  - `ko_round_contract.py` — round promotion logic
  - Look for any code that stores `predicted_round` as the ORIGINAL while using `effective_round` for scoring.
- **Permanent rule**: After any registry regen, `verify_registry.py` MUST pass 5/5. Surgical patch is acceptable only while the root cause is being investigated.
- **Applies when**: Any fresh backtest, any 100-event regeneration, any optimizer run.

## UFC — track_results.py parlay_key_map silently skipping new parlay types (DUAL_PATH_DIVERGENCE #7b) — 2026-04-15
- **Seen:** KP2 shipped v11.32.0, OU3 shipped v11.35.0 — both silently unscored on Sunday auto-settlement. Root cause: `track_results.py:808` had a hardcoded 4-entry label→key map ({Ultra High Confidence, High ROI, HC3, ROI3} only). Every parlay type added after ROI3 (v11.28.0) was silently skipped.
- **Fix:** Added `_PARLAY_LABEL_TO_KEY` (10-entry canonical map) + `_settle_parlay_legs()` helper with per-parlay routing: ML parlays use `ml_correct`; MP2/KP2 strip method suffix from leg label and use `method_correct`; OU3 matches bouts by fighter pair + `ou_type` prefix and uses `ou_correct`; HM3/HM2 sniff leg type from label suffix (KO R1/R2, SUB R1, by method, ML, Over/Under). Also expanded `event_entry` init from 4 → 10 parlay slots.
- **Rule (NEW PARLAY SHIPPING CHECKLIST — 6 REQUIRED FILES):** When shipping a new parlay type, confirm it appears in ALL 6:
  1. `UFC_Alg_v4_fast_2026.py` — backtest path
  2. `UFC_Alg_v4_fast_2026.py` — live prediction path
  3. `pnl_contract.py` — PARLAY_KEYS tuple
  4. `fix_registry_placed_flags.py` — rebuild function
  5. `build_event_analysis.py` — PARLAY_LABELS dict
  6. **`track_results.py`** — `_PARLAY_LABEL_TO_KEY` + `_settle_parlay_legs()` case
  Grep all 6 files before declaring ship-ready.
- **Note:** The settlement is only exercised on Sunday auto-tracking (new events). Backtest parlays are scored independently. This means the gap can silently persist for months without obvious symptoms.

## MLB Props — Platoon-Family Conclusively Retired (PLATOON_EXHAUSTED) — 2026-04-18
- **Pattern**: Any batter-vs-pitcher platoon hypothesis (L vs RHP, R vs LHP) using pitcher handedness, split OPS, relative vulnerability percentile, or roster-level stacking conditions.
- **Evidence**: 14 tests (H1-H6, H23, H38, H49-H51 + related killed), 0 activations across hits-over, HR-over, TB-over, hits-under markets. All absolute thresholds killed. All relative-percentile thresholds killed. Joint pitcher-p85-vulnerability + stack≥3 with wOBA-vs-hand ≥ 0.340 also killed (H49 pooled OOS +1.59% p=0.9474; H50 −30.35%; H51 −17.77%).
- **Root cause**: MLB books use platoon splits in line-setting (confirmed per H38 takeaway). Every discoverable platoon signal — regardless of framing (absolute, relative, joint) — is already priced into the line. The advantage is real but fully embedded in the opening line.
- **Rule**: Do NOT retry any platoon-derived prop hypothesis. This applies to: (a) pitcher-split OPS as a standalone gate, (b) relative-vulnerability percentile, (c) lineup/roster stacking conditions, (d) combined pitcher+batter platoon gates, (e) any market (hits, HR, TB, SB, K). Zero exceptions. If a user proposes a platoon-based system, surface this kill record immediately via AskUserQuestion before building anything.
- **Applies when**: MLB prop system design, backtest planning, evaluator.py additions.

## UFC — fight_breakdowns.json predicted_round diverges from registry (FIGHT_BREAKDOWNS_ROUND_DIVERGE) — 2026-04-18
- **Seen:** H26 round-promotion threshold sweep aborted. Baseline re-simulation gave +135.17u vs canonical +118.32u (+16.85u inflation). 5 bouts have fight_breakdowns:predicted_round ≠ registry:predicted_round (e.g., Mauricio Ruffy UFC 325: fb=2, reg=1; Arman Tsarukyan: opposite direction).
- **Root cause:** `patch_registry_from_archive.py` corrects registry `predicted_round` AFTER the backtest run that writes fight_breakdowns.json. The archive patch creates a permanent divergence for ~5 bouts per 100-event window.
- **Rule:** Do NOT use `fight_breakdowns.json:predicted_round` as the baseline for round-sensitive pre-compute simulations (e.g., KO round-promotion threshold sweeps). The registry `predicted_round` is authoritative. For round-promotion sweeps, run full CACHE_ONLY=1 backtests with env-var threshold overrides (e.g., `UFC_KO_R2_LOW_DEC_MAX=X`).
- **Applies when:** Any pre-compute that simulates combo scoring from fight_breakdowns.json round predictions. Safe for other fields (dec_sc, sub_sc, pick_ml — these don't get patched).

## NBA Props — Streak-state backtest includes today's game result (STREAK_LOOKAHEAD) — 2026-04-18
- **Seen:** v12.64.0 shipped `streakLossMin=3` on `3PM_UNDER_EXPECTED_SOFT_MJ165` with claimed +15.05% ROI on N=28 (p=0.0063). Audit of `scripts/backtest_props_streak.py:120-131` showed `team_streak` is updated with today's game result *before* being written to `streak_map[(date, team)]`. Empirical check confirmed: 100.0% of LOSS_3+ rows (1660/1660) were games the team also lost that day. So the filter was implicitly conditioning on today's outcome.
- **Why it mattered:** Production `computeScheduleContext` in `functions/api/nba-props-generate.js` iterates the player's pre-game `gameLog` — it only sees the *entering* streak. Backtest cohort and production cohort are different. Conditioning on today's team loss correlates with 3PM UNDER hitting (blown-out/tight-D games suppress 3PA), so the measured edge was partly a data leak.
- **Root cause:** State-tracking loops that write the post-event state under the event's date key. The `team_last_meeting` revenge check in `backtest_props_schedule_spots.py:151-154` did it right — read BEFORE update. The streak loop did it wrong — update THEN write.
- **Rule:** Any backtest that tags a row with `(date, entity) → state` must write the PRE-event state, not the post-event state. Rule of thumb: look at the update block; if `state_map[...] = state` comes after `state = update(state, event)`, you have lookahead. Either (a) write state BEFORE the update, or (b) shift the key to `(next_date, entity)`.
- **Validation check:** After computing any such map, spot-check — if "team on 3+ loss streak on date D" should describe teams ENTERING D, then NOT 100% of them should have lost on D. If it's near 100%, the streak includes today. Same logic for win streaks, totals streaks, shooting slumps, etc.
- **Applies when:** Any backtest building per-date state (streaks, rolling hit rates, "is B2B", momentum features). Check the state-update order before trusting the results.

## Frontend/Backend field-name drift — speculative UI fields that data never emits — 2026-04-19
- **Seen (diamondpredictions v13.26.0):** Two bugs, same shape. (1) MLB `TotalsPickCard.jsx` read `pick.model_total/model_probability/edge` — but T26 is a rule-based system whose generator (`mlb_predict/totals/live_generator.py:299-302`) explicitly emits `None` for those fields. Card rendered "--" in 3 of 4 stat columns. (2) NHL `NHLPicksContent.jsx` breakdown panel read `pick.wp_pick/wp_prob/wp_edge/stat_pick/stat_agrees/oa_pick/oa_agrees/sys_pick/sys_agrees/sys_n/sys_names/model_prob/kelly_fraction/kelly_multiplier/n_sharp/sharp_signals/n_agree/n_disagree` — none of which the current V17 Playoff pipeline produces. Production data has `consensus_prob/systems_fired/n_systems/units`. All 4 "Model Agreement" cells showed "No signal"; Model Prob / WinProb Edge / Kelly rendered `NaN%`.
- **Why it happened:** Breakdown panel was added in commit `21c62a4` (4 weeks before) anticipating a 4-sub-model conglomerate schema. When the pipeline shifted to V17 Playoff R1 (a narrower schema), the component was never updated. Similarly, TotalsPickCard assumed all systems are model-based; T26 rule-based was added without updating the card.
- **Root cause:** (a) Components read field names that are aspirational, not contracts with the actual JSON emitted by the generator. (b) No schema check between JSON producer and JSX consumer. (c) `(x * 100).toFixed(1)` on `undefined` yields `NaN` silently — fields felt safe to reference without null-guarding.
- **Rule:** When wiring a component to a public JSON artifact, (1) open the current live artifact and list its actual keys, (2) reference ONLY those keys, (3) wrap numeric formatting in a helper that returns `'--'` for `null/undefined/NaN`, (4) add a conditional branch when a field may legitimately be null (rule-based vs model-based picks). Never trust a field name from a sibling algorithm — check the generator.
- **Validation check:** After editing any card that reads `pick.*`, diff the keys referenced by the component against the keys actually in `public/data/<file>.json`. Mismatches = bug. For admin-only panels, check as admin before claiming fix.
- **Applies when:** Any card/panel binding to a JSON data file, especially after a backend algorithm change, or when a new pick-type (rule-based vs model-based, regular season vs playoff) is introduced alongside an existing one.

### 2026-04-20 — DUAL_PATH_DIVERGENCE (anti-pattern #7) — UFC_Alg + fix_registry_placed_flags
**Context:** v11.52.0 mixed-finisher Under gate. Wired gate into `ou_contract.resolve_ou_bet`, both `UFC_Alg_v4_fast_2026.py` vectorized optimizer paths, and the live `_call_resolve_ou`. Backtest produced **zero delta**.
**Root cause:** `fix_registry_placed_flags.fix_bout()` calls `resolve_ou_bet()` independently as the canonicalizer pass that runs after the backtest and OVERWRITES every OU decision the algorithm wrote. This was an undocumented THIRD call site.
**Signal:** If pre-compute predicts a delta but the validated registry shows 0.00u change AND the target bouts still have their original `ou_type`, the gate isn't reaching the final writer.
**Fix:** Any signature change or gate added to `ou_contract.resolve_ou_bet` MUST be echoed in ALL three call sites — the two algorithm paths AND the fix_registry canonicalizer.  Added `_fight_breakdowns_lookup` helper in fix_registry for passing ko_sc/sub_sc.
**Verify:** `grep -n resolve_ou_bet *.py` — expect 3+ matches across UFC_Alg, fix_registry, ou_contract itself. If you only touched one file, you did not ship the gate.

## General — Path Drift in Agent Handoffs (AGENT_HANDOFF_PATH_DRIFT) — 2026-04-22
- **Pattern:** Agent creates file at `~/8-agent-team/docs/specs/2026-04-22-ltm-consolidation-spec.md`. Later agent (or same agent in new context) searches `~/docs/specs/...` or `~/Projects/8-agent-team/docs/specs/...` — both wrong. Results in `File not found`, wasted tool calls, and user-visible inefficiency. Ghost repo at `~/ProjectsHQ/8-agent-team/` (now archived) exacerbated confusion.
- **Why it happened:** (a) Agent assumed repo location without verification. (b) Stale ghost repo with similar structure existed at `~/ProjectsHQ/8-agent-team/`. (c) Handoff did not include explicit canonical path verification. (d) No `ls` preflight before `read`.
- **What TO do (working design, 2026-04-22):**
  1. **Canonical path enforcement:** Live repo is ALWAYS `~/8-agent-team/`. Ghost repo is `~/ProjectsHQ/ARCHIVED-8-agent-team-*/` — never search it.
  2. **Preflight verification:** Before any `read`, run `ls <dir>` or `test -f <file>` to confirm path exists. Do not assume.
  3. **Handoff path anchoring:** When passing file references between agents, include FULL absolute path: `~/8-agent-team/docs/specs/2026-04-22-ltm-consolidation-spec.md`, not relative or abbreviated.
  4. **Ghost repo cleanup:** Already archived with `README-ARCHIVED.md` marker. If another ghost appears, archive immediately.
  5. **Session continuity:** If context compaction occurs between agent delegations, re-verify paths on resume. Do not trust memory of paths across compaction boundaries.
- **DO NOT:**
  - Assume `~/Projects/` or `~/ProjectsHQ/` contains the live repo. Verify with `git remote -v`.
  - Use relative paths (`docs/specs/...`) in handoffs. Always absolute.
  - Search archived repos without checking for `README-ARCHIVED.md` marker first.
  - Skip `ls` preflight before `read` on files created by prior agents.
- **Files:** `~/8-agent-team/agents/orchestrator.md` (handoff protocol), `~/.claude/anti-patterns.md` (this entry).
- **Verification:** `ls ~/8-agent-team/docs/specs/` should show `2026-04-22-ltm-consolidation-spec.md`. `ls ~/ProjectsHQ/ARCHIVED-8-agent-team-*/` should show `README-ARCHIVED.md`.
