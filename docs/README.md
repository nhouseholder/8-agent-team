# 8-Agent Orchestration System — Documentation

Detailed documentation for the agent orchestration system.

## Documents

| File | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, agent communication patterns |
| [AGENT-REFERENCE.md](AGENT-REFERENCE.md) | Full reference for each agent: modes, capabilities, escalation paths |
| [CHAIN-EXAMPLES.md](CHAIN-EXAMPLES.md) | Multi-agent chain patterns and real examples |
| [USAGE.md](USAGE.md) | How to use the system, configuration, best practices |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions |

## Current Agent Roster (8 total)

| Agent | Role |
|---|---|
| **orchestrator** | Router with 22-step decision tree, memory retrieval, prompt enhancement, chain protocol |
| **explorer** | Codebase exploration with parallel search protocol |
| **strategist** | Unified advisor — architecture, planning, spec-writing, "what's next" (8 modes) |
| **researcher** | External research with source hierarchy (Tier 1-3) |
| **designer** | UI/UX with intentional minimalism philosophy |
| **auditor** | Debug, review, improve, fix (READ/FIX/REFINE modes) |
| **council** | Multi-LLM consensus + DEBATE MODE for structured idea evaluation |
| **generalist** | Plan executor, medium tasks, file safety (backup/verify/revert) |

## Version

1.6.0 — Merged refiner→auditor (REFINE MODE), mandatory C1/C2/C3 memory checkpoints, 9→8 agents
