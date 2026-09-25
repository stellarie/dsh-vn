import YAML from 'yaml'
/** Parsed blackboard frontmatter and Markdown body. */
export interface Parsed { data: Record<string, unknown>; body: string; frontmatter: string; offset: number }
/**
 * Parse one blackboard Markdown document.
 * @param text - document text.
 * @returns parsed frontmatter and body.
 */
export function parse(text: string): Parsed {
  const source = text.replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
  if (!match) throw new Error('missing frontmatter')
  return {
    data: YAML.parse(match[1] ?? '') as Record<string, unknown>,
    body: source.slice(match[0].length),
    frontmatter: match[1] ?? '',
    offset: 2,
  }
}
/**
 * Find one text fragment's line.
 * @param text - complete text.
 * @param needle - fragment.
 * @returns one-based line.
 */
export function lineOf(text: string, needle: string): number {
  const index = text.indexOf(needle)
  return index < 0 ? 1 : text.slice(0, index).split(/\r?\n/).length
}
