# 9-Agent Orchestration System — Documentation

Detailed documentation for the agent orchestration system.

## Documents

| File | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, agent communication patterns |
| [AGENT-REFERENCE.md](AGENT-REFERENCE.md) | Full reference for each agent: modes, capabilities, escalation paths |
| [CHAIN-EXAMPLES.md](CHAIN-EXAMPLES.md) | Multi-agent chain patterns and real examples |
| [USAGE.md](USAGE.md) | How to use the system, configuration, best practices |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions |

## Current Agent Roster (9 total)

| Agent | Role |
|---|---|
| **orchestrator** | Router with 22-step decision tree, memory retrieval, prompt enhancement, chain protocol |
| **explorer** | Codebase exploration with parallel search protocol |
| **strategist** | Unified advisor — architecture, planning, spec-writing, "what's next" (8 modes) |
| **researcher** | External research with source hierarchy (Tier 1-3) |
| **designer** | UI/UX with intentional minimalism philosophy |
| **auditor** | Dual-mode (READ/FIX) with verification gates |
| **council** | Multi-LLM consensus + DEBATE MODE for structured idea evaluation |
| **generalist** | Medium tasks, compaction, summarization, deploy, handoff |
| **refiner** | Continuous improvement with INDEX MODE and REFINE MODE |

## Version

1.3.0 — Merged shipper→generalist, structural anti-loop guards, mempalace read-only, 10→9 agents
