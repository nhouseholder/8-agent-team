import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const STALE_MARKER_MS = 60 * 60 * 1000
const COMMAND_TIMEOUT_MS = 4000
const MAX_BUFFER_BYTES = 1024 * 1024
const MIN_CONTEXT_LENGTH = 20

async function runCommand(command, args, cwd) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd,
      encoding: "utf8",
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER_BYTES,
    })

    return stdout.trim()
  } catch {
    return ""
  }
}

async function readPackageProjectName(cwd) {
  try {
    const pkgPath = path.join(cwd, "package.json")
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"))
    return typeof pkg.name === "string" ? pkg.name : ""
  } catch {
    return ""
  }
}

async function readPyprojectName(cwd) {
  try {
    const pyprojectPath = path.join(cwd, "pyproject.toml")
    const pyproject = await fs.readFile(pyprojectPath, "utf8")
    const match = pyproject.match(/name\s*=\s*"([^"]+)"/)
    return match?.[1] ?? ""
  } catch {
    return ""
  }
}

function normalizeProjectName(name) {
  if (!name) return ""

  const trimmed = name.trim()
  const containerPattern = /^[a-z]+-[a-z]+-[a-z0-9]+$/
  if (containerPattern.test(trimmed)) return ""

  return trimmed.replace(/[-_\s]/g, "").toLowerCase()
}

async function detectProjectName(cwd) {
  const remote = await runCommand("git", ["remote", "get-url", "origin"], cwd)
  if (remote) {
    const remoteName = remote.replace(/.*[/:]/, "").replace(/\.git$/, "")
    const normalizedRemote = normalizeProjectName(remoteName)
    if (normalizedRemote) return normalizedRemote
  }

  const packageName = normalizeProjectName(await readPackageProjectName(cwd))
  if (packageName) return packageName

  const pyprojectName = normalizeProjectName(await readPyprojectName(cwd))
  if (pyprojectName) return pyprojectName

  return normalizeProjectName(path.basename(cwd))
}

async function hasFreshMarker(markerPath) {
  try {
    const stat = await fs.stat(markerPath)
    return Date.now() - stat.mtimeMs < STALE_MARKER_MS
  } catch {
    return false
  }
}

async function clearStaleMarker(markerPath) {
  try {
    const stat = await fs.stat(markerPath)
    if (Date.now() - stat.mtimeMs >= STALE_MARKER_MS) {
      await fs.rm(markerPath, { force: true })
    }
  } catch {
    // No marker to clear.
  }
}

async function writeMarker(markerPath) {
  try {
    await fs.writeFile(markerPath, String(Date.now()))
  } catch {
    // Marker failures should not break prompt construction.
  }
}

async function loadMemoryContext(cwd, projectName) {
  const lookupKey = projectName || "global"
  const mempalaceQuery = projectName ? `${projectName} recent work decisions` : "recent work decisions"

  const [engramContext, mempalaceContext] = await Promise.all([
    runCommand("engram", ["context", lookupKey], cwd),
    runCommand("mempalace-mempalace_search", ["--query", mempalaceQuery, "--limit", "5"], cwd),
  ])

  return {
    engramContext,
    mempalaceContext,
  }
}

function buildMemoryPrompt(projectName, memory) {
  const sections = []

  if (memory.engramContext.length > MIN_CONTEXT_LENGTH) {
    sections.push(`### ENGRAM\n${memory.engramContext}`)
  }

  if (memory.mempalaceContext.length > MIN_CONTEXT_LENGTH) {
    sections.push(`### MEMPALACE\n${memory.mempalaceContext}`)
  }

  const details = sections.length > 0
    ? sections.join("\n\n")
    : "No engram or mempalace startup context was recovered for this session."

  return [
    `## STARTUP MEMORY RESTORE${projectName ? ` (${projectName})` : ""}`,
    "",
    "Automatic startup restore loaded the memory systems that expose a stable CLI in this environment.",
    "Use brain-router MCP tools live for structured memory because the installed brain-router launcher starts the server but does not expose a direct shell context command.",
    "",
    details,
  ].join("\n")
}

const plugin = {
  id: "memory-context-loader",
  server: async ({ directory, worktree }) => ({
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return

      const markerPath = path.join(os.tmpdir(), `memory-ctx-loaded-${input.sessionID}.marker`)
      if (await hasFreshMarker(markerPath)) return

      await clearStaleMarker(markerPath)

      const cwd = worktree || directory || process.cwd()
      const projectName = await detectProjectName(cwd)
      const memory = await loadMemoryContext(cwd, projectName)

      await writeMarker(markerPath)
      output.system.push(buildMemoryPrompt(projectName, memory))
    },
  }),
}

export default plugin