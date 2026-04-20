# Agent Health Check

## Purpose

Track agent execution health across sessions to identify patterns, failures, and optimization opportunities.

## Logging Protocol

After each agent execution, log the following:

| Field | Type | Description |
|---|---|---|
| timestamp | ISO 8601 | When the execution occurred |
| agent | string | Agent name (e.g., "orchestrator", "explorer") |
| task_type | string | Category (explore, plan, research, implement, debug, etc.) |
| status | enum | success, failure, escalated, timeout |
| duration_ms | number | Execution time in milliseconds |
| escalation | object | { triggered: boolean, reason: string, target: string } |
| error | string? | Error message if status is failure |
| user_satisfaction | enum? | implicit_positive, implicit_negative, explicit_positive, explicit_negative |

## Storage

Store logs in: `thoughts/agent-health/YYYY-MM-DD.jsonl`

One JSON object per line, append-only.

## Health Metrics

### Per-Agent Dashboard

- **Success rate** (last 100 executions)
- **Average duration**
- **Escalation frequency**
- **Most common task types**

### System Health

- Overall success rate
- Bottleneck agents (highest avg duration)
- Escalation hotspots (most frequently escalated to)

## Alert Thresholds

| Condition | Action |
|---|---|
| Agent success rate < 80% | Review agent prompt for clarity |
| Agent avg duration > 2x system avg | Consider splitting agent responsibilities |
| Escalation rate > 30% | Agent scope may be too narrow or unclear |
| 3 consecutive failures | Pause agent, review recent changes |

## Usage

1. Each agent appends to the daily JSONL file after execution
2. Run `node scripts/health-report.js` to generate a summary
3. Review weekly for optimization opportunities

## Example Log Entry

```json
{
  "timestamp": "2026-04-19T10:30:00Z",
  "agent": "explorer",
  "task_type": "explore",
  "status": "success",
  "duration_ms": 3200,
  "escalation": { "triggered": false },
  "user_satisfaction": "implicit_positive"
}
```

## Integration with Agents

Add the following to each agent's prompt (or reference this file):

```markdown
## Health Logging

After completing your task, append a JSON line to:
`thoughts/agent-health/YYYY-MM-DD.jsonl`

Include: timestamp, agent name, task type, status, duration, escalation info.
If the file or directory doesn't exist, create it.
```
