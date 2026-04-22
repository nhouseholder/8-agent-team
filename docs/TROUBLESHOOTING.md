# Troubleshooting Guide

## Common Issues

### Installation Fails

**Symptom:** `npm run install:opencode`, `npm run check:deps`, or `npm run smoke:install` fails.

**Causes:**
- OpenCode CLI not installed or not on `PATH`
- Node version below the repo's supported floor
- Target OpenCode config directory already contains repo-managed files and install was attempted without `--force`
- Repo-managed runtime preset file is missing while `opencode.json` still references it

**Fix:**
1. Run `npm run check:deps` and fix any `FAIL` items first
2. Confirm `opencode --version` works in your shell
3. Re-run the installer with `--force` only if you intentionally want to replace the repo-managed runtime files in the target directory
4. Run `npm run smoke:install` to verify a scratch profile before touching your live config again

### Agents Snap Back To Qwen

**Symptom:** You switch models in OpenCode, then other repo-managed agents or council roles fall back to Qwen.

**Causes:**
- Your live `~/.config/opencode` still uses an older pinned `model`
- The live runtime still has an older `oh-my-opencode-slim.jsonc` council preset with model overrides
- You are running from a stale full repo clone instead of the installer-managed runtime surface

**Fix:**
1. Reinstall the runtime with `npm run install:opencode -- --force`
2. Confirm `~/.config/opencode/opencode.json` no longer pins a top-level `model`
3. Confirm `~/.config/opencode/oh-my-opencode-slim.jsonc` no longer contains council model overrides
4. Restart OpenCode and choose the session model again

### Extra Agents Still Appear

**Symptom:** OpenCode still shows names such as Octto or Commander even though they are not part of this repo's 8-agent team.

**Causes:**
- Local OpenCode runtime state is stale
- `~/.config/opencode` is an old full repo clone rather than the clean installer-managed runtime folder
- The extra items are OpenCode-owned built-ins or runtime capabilities rather than repo-registered agents

**Fix:**
1. Replace the live runtime with `npm run install:opencode -- --force`
2. Restart OpenCode so it reloads the cleaned runtime surface
3. If the stale items remain, treat them as OpenCode-built-ins or runtime capabilities outside this repo's agent roster

Do not delete `~/.opencode` blindly. On this setup it also contains the installed OpenCode CLI, not just disposable runtime state.

### Agent Not Responding

**Symptom:** Agent returns empty or minimal output.

**Causes:**
- MCP memory systems unavailable
- Agent prompt has contradictions (READ-ONLY + execute)
- Task falls outside agent's capability scope

**Fix:**
1. Check MCP server status: verify engram, mempalace, brain-router are running
2. Review agent prompt for contradictions
3. Try routing to a different agent via explicit mention: "@auditor fix this"

### Chain Breaks Mid-Sequence

**Symptom:** Chain stops after 1-2 agents without completing.

**Causes:**
- Agent hit max retry (2 attempts)
- Agent needs user input but couldn't prompt
- Chain exceeded max depth (4)

**Fix:**
1. Check the session checkpoint file for chain state: `~/.claude/projects/<project>/memory/pre_compact_checkpoint.md`
2. Resume manually: "Continue the chain from [last completed step]"
3. If agent failed: try with clearer instructions or route to different agent

### Memory Systems Not Working

**Symptom:** Agent doesn't recall past decisions or context.

**Causes:**
- MCP servers not configured in `opencode.json`
- Database files missing or corrupted
- Wrong project name in memory queries

**Fix:**
1. Verify MCP config in `opencode.json`:
   ```json
   "mcp": {
     "engram": { "type": "local", "command": ["engram", "mcp"], "enabled": true },
     "mempalace": { "type": "local", "command": ["mempalace-mcp"], "enabled": true },
     "brain-router": { "type": "local", "command": ["brain-router"], "enabled": true }
   }
   ```
2. Test each MCP: run `engram mcp`, `mempalace-mcp`, `brain-router` individually
3. Check database paths exist and are accessible

If installation completed but memory still seems unavailable, rerun `npm run check:deps` to see whether the optional MCP commands are missing from `PATH`.

### Agent Gives Wrong Type of Response

**Symptom:** @strategist starts coding, @auditor starts researching, etc.

**Causes:**
- Prompt contradiction (says READ-ONLY but also says execute)
- Agent doesn't have clear capability boundaries

**Fix:**
1. Check the agent's prompt for conflicting instructions
2. Verify the agent has an escalation protocol section
3. Add explicit boundary rules: "If user asks you to code, redirect to @auditor"

### Output Format Not Followed

**Symptom:** Agent returns unstructured text instead of `<summary>/<changes>/<next>` format.

**Causes:**
- Output format section missing from agent prompt
- Agent prompt too long, format section gets truncated

**Fix:**
1. Verify the agent has an "Output Format" section in its prompt
2. Move output format to the END of the prompt (recency bias)
3. Keep format section concise (under 20 lines)

### Council Returns Generic Response

**Symptom:** @council gives surface-level consensus instead of deep analysis.

**Causes:**
- The council briefing lacks concrete constraints, stakes, or context
- Council fell back to strategist-style analysis because distinct councillor models were unavailable

**Fix:**
1. Provide specific context: "Given [specific constraints], should we use X or Y?"
2. Add explicit `agent.council-*` model overrides only if you intentionally want true multi-model council fan-out
3. Only use council for genuinely high-stakes decisions

### Deploy Fails

**Symptom:** @generalist aborts during deploy pre-flight gates.

**Causes:**
- Dirty working tree (uncommitted changes)
- Version regression (local < live)
- Lint/test/build failures

**Fix:**
1. Check the specific gate that failed in deploy skill output
2. For dirty tree: commit or stash changes first
3. For version regression: manually bump version in package.json
4. For build failures: fix the underlying issue, then retry ship

### Generalist Too Slow or Token-Heavy

**Symptom:** @generalist reads too many files or produces verbose output.

**Causes:**
- Token efficiency rules not enforced
- Task scope too broad for generalist

**Fix:**
1. Remind generalist: "Be concise, read only what you need"
2. If task needs deep research → route to @researcher
3. If task needs deep architecture → route to @strategist

### Decision Tree Routes to Wrong Agent

**Symptom:** Request classified incorrectly (e.g., UI task routed to @generalist instead of @designer).

**Causes:**
- Decision tree order — earlier steps match before later ones
- Task description ambiguous

**Fix:**
1. Use explicit agent mention: "@designer build this UI"
2. Review decision tree order in orchestrator prompt
3. Add more specific matching criteria to the tree

## Validation

Run the validation script to check for common configuration issues:

```bash
node scripts/validate-agents.js
```

This checks:
- All agents have required fields
- No contradictions in prompts
- All agents have output format
- All agents have escalation path
- No hardcoded paths
- Memory blocks are consistent

## Getting Help

If none of the above fixes your issue:

1. Check the agent health log: `thoughts/agent-health/`
2. Review recent ledgers: `thoughts/ledgers/`
3. Run a full audit: "@auditor audit the agent configuration"
