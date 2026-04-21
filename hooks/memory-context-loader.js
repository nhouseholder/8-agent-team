#!/usr/bin/env node
// memory-context-loader-version: 1.0.0
// Memory Context Loader — PreToolUse hook
// Auto-loads context from engram + mempalace on the FIRST tool use of a session.
// Injects restored context as additionalContext so the agent starts with memory.
//
// How it works:
// 1. On first tool use, checks for a session marker file in /tmp
// 2. If no marker exists, runs engram context + mempalace search
// 3. Injects results as additionalContext
// 4. Creates marker file so it only runs once per session
//
// Enable via config: hooks.memory_context_loader: true (default: false)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const STALE_MARKER_SECONDS = 3600; // 1 hour — treat old markers as stale

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd || data.workspace?.current_dir || process.cwd();

    if (!sessionId) {
      process.exit(0);
    }

    // Check if this session already loaded context
    const markerPath = path.join(os.tmpdir(), `memory-ctx-loaded-${sessionId}.marker`);
    if (fs.existsSync(markerPath)) {
      const stat = fs.statSync(markerPath);
      const age = (Date.now() - stat.mtimeMs) / 1000;
      if (age < STALE_MARKER_SECONDS) {
        // Already loaded this session — skip
        process.exit(0);
      }
      // Stale marker — remove and proceed
      fs.unlinkSync(markerPath);
    }

    // Detect project name for scoped memory lookup
    // Try multiple strategies in order of reliability
    let projectName = '';
    try {
      // Strategy 1: Git remote name (most reliable)
      const remote = execSync('git remote get-url origin 2>/dev/null', { cwd, encoding: 'utf8' }).trim();
      projectName = remote.replace(/.*[\/:]/, '').replace(/\.git$/, '');
    } catch {
      try {
        // Strategy 2: Package.json name
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        projectName = pkg.name || path.basename(cwd);
      } catch {
        try {
          // Strategy 3: pyproject.toml name
          const pyproject = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf8');
          const match = pyproject.match(/name\s*=\s*"([^"]+)"/);
          projectName = match ? match[1] : path.basename(cwd);
        } catch {
          // Strategy 4: Directory name (fallback)
          projectName = path.basename(cwd);
        }
      }
    }

    // Filter out container-style names (e.g., "tender-mendel-dcb4d0")
    // These are not useful for project-scoped lookups
    const containerPattern = /^[a-z]+-[a-z]+-[a-z0-9]+$/;
    if (containerPattern.test(projectName)) {
      projectName = ''; // Will use global scope instead
    }

    // Normalize project name: remove hyphens, lowercase
    // This matches how engram stores project names (e.g., "diamondpredictions" not "diamond-predictions")
    if (projectName) {
      projectName = projectName.replace(/[-_\s]/g, '').toLowerCase();
    }

    // Gather context from both memory systems (parallel-ish via sequential with timeout)
    let engramContext = '';
    let mempalaceContext = '';

    try {
      engramContext = execSync(`engram context "${projectName}" 2>/dev/null`, {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 1024 * 1024 // 1MB
      }).trim();
    } catch {
      // Engram context unavailable — skip silently
    }

    try {
      mempalaceContext = execSync(`mempalace-mempalace_search --query "${projectName} recent work decisions" --limit 5 2>/dev/null`, {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 1024 * 1024
      }).trim();
    } catch {
      // Mempalace search unavailable — skip silently
    }

    // Build additionalContext
    const contextParts = [];

    if (engramContext && engramContext.length > 20) {
      contextParts.push(`## ENGRAM MEMORY (from previous sessions)\n${engramContext}`);
    }

    if (mempalaceContext && mempalaceContext.length > 20) {
      contextParts.push(`## MEMPALACE MEMORY (semantic search results)\n${mempalaceContext}`);
    }

    // Create marker so we don't run again this session
    fs.writeFileSync(markerPath, Date.now().toString());

    if (contextParts.length === 0) {
      // No context found — exit silently
      process.exit(0);
    }

    // Output additionalContext for the agent
    const output = {
      additionalContext: `MEMORY CONTEXT RESTORED — Project: ${projectName}\n\n${contextParts.join('\n\n---\n\n')}\n\n---\n\n**INSTRUCTION:** You have been provided with context from previous sessions. Use this information to maintain continuity. Reference past decisions, avoid repeating known mistakes, and build on prior work. After completing significant work, save new observations via engram_mem_save and brain-router_brain_save.`
    };

    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (e) {
    // Never break the session — exit silently on any error
    process.exit(0);
  }
});
