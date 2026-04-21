# Contributing

## Sources of Truth

| Concern | Canonical file |
|---|---|
| Core routing behavior | `agents/orchestrator.md` |
| Source prompts and per-agent identity | `agents/<name>.md` |
| Shared runtime modules | `agents/_shared/*.md` |
| Generated runtime prompts | `agents/generated/<name>.md` |
| Runtime registry | `opencode.json` |
| Release history | `CHANGELOG.md` |

Update the canonical file first, then propagate the change to the derived docs.

Never edit `agents/generated/*.md` directly. They are build artifacts from `node scripts/compose-prompts.js`.

## Adding a New Agent

1. Create `agents/<name>.md` with frontmatter:
   ```markdown
   ---
   name: agent-name
   description: Brief description of the agent's role
   mode: all
   ---

   <prompt content>
   ```

2. If the new agent is a core runtime agent, add a `## Shared Runtime Contract` section with these markers:
   ```markdown
   <!-- @compose:insert shared-cognitive-kernel -->
   <!-- @compose:insert shared-memory-systems -->
   <!-- @compose:insert shared-completion-gate -->
   ```

   If the new agent is a council prompt, use:
   ```markdown
   <!-- @compose:insert shared-council-kernel -->
   ```

3. Register the source prompt in `scripts/compose-prompts.js` under `SOURCE_PROMPTS` with the correct schema (`core` or `council`).

4. Add to `opencode.json` agent section:
   ```json
   "agent-name": {
     "mode": "all",
     "model": "opencode-go/qwen3.6-plus",
     "prompt_file": "agents/generated/agent-name.md"
   }
   ```

5. Add to orchestrator's decision tree in `agents/orchestrator.md`
6. Add to delegation table in orchestrator prompt
7. Run `node scripts/compose-prompts.js`
8. Run `node scripts/validate-agents.js`
9. Update `docs/AGENT-REFERENCE.md`
10. Update `CHANGELOG.md`

## Modifying an Agent

1. Edit the source prompt in `agents/` or the shared runtime module in `agents/_shared/`
2. Run `node scripts/compose-prompts.js`
3. Run `node scripts/validate-agents.js`
4. Test with a sample task
5. Update `CHANGELOG.md`

## Core Agent Requirements

Every core agent in `agents/*.md` MUST have:

- [ ] **Name** in frontmatter
- [ ] **Description** in frontmatter
- [ ] **Mode** (all or primary)
- [ ] **Role** section
- [ ] **Shared Runtime Contract** section with composition markers
- [ ] **Local Fast/Slow Ownership** section (or route-level equivalent for orchestrator)
- [ ] **Output Format** section with `<summary>`, `<next>` tags
- [ ] **Escalation Protocol** section (or equivalent escalation section)
- [ ] **Constraints** section (what the agent should NOT do)

Every core agent SHOULD have:

- [ ] **Verification** section (for implementation agents)
- [ ] **Capability Spectrum** or **Mode Detection** table
- [ ] **Boundary Rules** (vs other agents)

## Prompt Guidelines

### Do
- Use clear, direct language
- Define output format explicitly
- Include escalation paths
- Reference shared modules through composition markers, not pasted copies
- Keep prompts under 2000 characters where possible

### Don't
- Include hardcoded paths (use `${VAR:-default}` syntax)
- Create contradictions between constraints and actual behavior
- Duplicate shared block content in source prompts
- Edit `agents/generated/*.md` by hand
- Make agents do everything (define clear boundaries)

## Testing Changes

1. Rebuild generated prompts: `node scripts/compose-prompts.js`
2. Run validation: `node scripts/validate-agents.js`
3. Test routing: Ask the orchestrator to route a task to your agent
4. Test output: Verify the agent returns the expected format
5. Test escalation: Give the agent a task outside its scope
6. Test memory: Verify the agent can save and retrieve from memory systems

## Pull Request Checklist

- [ ] Generated prompts refreshed with `node scripts/compose-prompts.js`
- [ ] All agents pass validation
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with changes
- [ ] No hardcoded paths
- [ ] No contradictions in prompts
- [ ] Output formats consistent across agents
- [ ] Escalation paths present in all agents
