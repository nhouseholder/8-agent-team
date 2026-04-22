# Model Selection Guide

This framework keeps the shipped OpenCode config inheritance-based and model-neutral. The default runtime omits a pinned top-level `model`: choose the session model in OpenCode, and model fit is handled by operating profiles rather than hardcoding agent-level model IDs into the default runtime.

## Core Rule

Use the framework to add boundaries, routing discipline, and verification. Do not use it to force extra explicit "thinking" on models that already deliberate well.

## Capability Profiles

| Profile | What it means | Framework behavior |
|---|---|---|
| `balanced` | Good general-purpose coding and reasoning | Standard fast/slow rules, default evidence cap, normal delegation |
| `fast-execution` | Best at quick concrete implementation | Prefer execution routes, shorter local analysis, escalate early on ambiguity |
| `reasoning-heavy` | Already strong at internal deliberation | Keep external slow mode tighter, reduce extra evidence pulls, avoid redundant analysis |
| `long-context-specialized` | Can absorb larger context windows | Still retrieve selectively; do not broaden scope just because context allows it |

## Working Model Fits For This Repo

These are framework operating classifications, not benchmark claims:

| Model family | Working profile | Best use in this framework |
|---|---|---|
| `Qwen 3.6 Plus` | `balanced` | Default routing, implementation, and bounded planning |
| `Kimi K2.6` | `reasoning-heavy` | Ambiguous architecture, synthesis, and difficult debugging |
| `GLM 5.1` | `reasoning-heavy` | High-stakes trade-offs and deliberate evaluation |

## Selection Rules

1. Use a `balanced` model as the default session model when you want one model to handle most work without much tuning.
2. Use `reasoning-heavy` models when ambiguity or stakes justify extra internal deliberation, but tighten the framework's external slow-mode boundaries.
3. Use `fast-execution` models for concrete multi-file implementation only when the route is already clear.
4. Keep council optional. Only add explicit per-agent overrides when model diversity is a deliberate choice and the IDs are confirmed valid with `opencode models [provider]`.

## Complement Rules For Strong Reasoning Models

- Keep the decision question narrow.
- Reduce extra evidence pulls instead of adding more narration.
- Preserve intent lock and terminal-state discipline.
- Prefer stronger stop rules over broader prompts.
- Let the model do the hard thinking internally; use the framework to keep that thinking scoped and verifiable.

## Where This Hooks Into The Framework

- [spec/model-profiles.yaml](../spec/model-profiles.yaml) defines the operating profiles.
- [agents/_shared/cognitive-kernel.md](../agents/_shared/cognitive-kernel.md) uses the profiles to damp slow mode.
- [agents/orchestrator.md](../agents/orchestrator.md) uses the profiles to calibrate delegation packets.

## What Not To Do

- Do not hardcode these model families into the default `opencode.json`.
- Do not assume every reasoning-heavy model wants more explicit prompt ceremony.
- Do not equate more output with better reasoning.
- Do not use council by default just because multiple strong models are available.