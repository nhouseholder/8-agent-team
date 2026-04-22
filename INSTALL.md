# Install Guide

This repo is distributed as a team/internal OpenCode framework. The supported install path is: clone the repo, verify it locally, then use the installer to stage repo-managed runtime assets into your OpenCode config directory.

## Supported Baseline

- Node.js 18+
- OpenCode CLI available on `PATH`
- macOS or Linux for the currently documented bootstrap flow
- Optional memory MCP tools: `engram`, `mempalace-mcp`, `brain-router`
- Optional provider credential: OpenRouter API key only if you plan to select OpenRouter models

## Quick Install

1. Clone the repo.
2. Run `npm ci --ignore-scripts`.
3. Run `npm run validate`.
4. Run `npm run check:deps`.
5. Install the runtime assets into your OpenCode config directory:

```bash
npm run install:opencode
```

6. If you already have repo-managed OpenCode files in the target directory and want to replace them, rerun with `--force`:

```bash
npm run install:opencode -- --force
```

7. Run the scratch-profile smoke test:

```bash
npm run smoke:install
```

## Target Directory

The installer defaults to `~/.config/opencode`.

Override it with either:

```bash
npm run install:opencode -- --target /custom/path/to/opencode
```

or:

```bash
OPENCODE_CONFIG_DIR=/custom/path/to/opencode npm run install:opencode
```

## What Gets Installed

The installer stages only repo-managed runtime assets:

- `opencode.json`
- `agents/generated/`
- `.opencode/plugins/`

This keeps the install footprint tight and avoids copying documentation or development-only files into your runtime config directory.

## Provider Credentials

The shipped `opencode.json` keeps `YOUR_OPENROUTER_KEY` as a placeholder.

- Leave it as-is if you only use the default model or other non-OpenRouter selections.
- Replace it only if you plan to run OpenRouter-backed models.

## Optional Memory Tooling

Memory integrations are optional for installation. Missing MCP tools should not block startup, but they will degrade memory retrieval and restore features.

Check status with:

```bash
npm run check:deps
```

## Verification Commands

Use these after any install or update:

```bash
npm run validate
npm run check:deps
npm run smoke:install
```

## CI Parity

The repository validation workflow mirrors the supported install path:

1. `npm ci --ignore-scripts`
2. install OpenCode CLI
3. `npm run compose`
4. `npm run validate`
5. `npm run check:deps`
6. `npm run smoke:install`

If local setup passes these commands, it matches the intended CI gate.