/**
 * One-line summaries of Claude Code tool input, shown in the transcript and
 * in approval prompts.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/tool-summary
 */

/** Longest input summary, ellipsis included. */
export const MAX_SUMMARY_CHARS = 200

/** Input fields that describe a tool call best, in priority order. */
const DESCRIPTIVE_FIELDS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description', 'prompt', 'skill']

function singleLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Summarize tool input on one line.
 * @param input - parsed tool input; any JSON value.
 * @returns a summary of at most {@link MAX_SUMMARY_CHARS} characters, or an empty string for empty input.
 */
export function summarizeInput(input: unknown): string {
  let text = ''
  if (typeof input === 'string') {
    text = input
  } else if (typeof input === 'object' && input !== null) {
    const record = input as Record<string, unknown>
    const field = DESCRIPTIVE_FIELDS.find(key => typeof record[key] === 'string' && record[key] !== '')
    if (field !== undefined) {
      text = record[field] as string
    } else if (Object.keys(record).length > 0) {
      text = JSON.stringify(record)
    }
  }
  const line = singleLine(text)
  return line.length <= MAX_SUMMARY_CHARS ? line : `${line.slice(0, MAX_SUMMARY_CHARS - 1)}…`
}

/**
 * Render one tool call as a short transcript line.
 * @param name - Claude Code tool name.
 * @param input - parsed tool input.
 * @returns `Name: summary`, or just the name when the input has no summary.
 */
export function toolLine(name: string, input: unknown): string {
  const summary = summarizeInput(input)
  return summary.length === 0 ? name : `${name}: ${summary}`
}
