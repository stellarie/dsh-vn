/**
 * Child-process environment for Claude Code queries. The parent environment
 * loses every Claude Code session marker and API-credential variable, so the
 * child neither detects a nested session nor bills an API key.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/environment
 */

/**
 * Names removed from the parent environment. `CLAUDECODE` marks a running
 * Claude Code shell. `CLAUDE_CODE_*` and `ANTHROPIC_*` select transport,
 * tokens, keys, and base URLs, which would override the logged-in account.
 */
const SCRUBBED_NAMES: readonly RegExp[] = [/^CLAUDECODE$/i, /^CLAUDE_CODE_/i, /^ANTHROPIC_/i]

/**
 * Build the complete child environment for one Claude Code process.
 * @param overlay - configured variables layered over the scrubbed copy; they may restore a scrubbed name on purpose.
 * @param parent - source environment; defaults to `process.env`.
 * @returns a new record with no `undefined` values.
 */
export function childEnvironment(
  overlay: Readonly<Record<string, string>>,
  parent: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(parent)) {
    if (value === undefined) continue
    if (SCRUBBED_NAMES.some(pattern => pattern.test(key))) continue
    env[key] = value
  }
  return { ...env, ...overlay }
}
