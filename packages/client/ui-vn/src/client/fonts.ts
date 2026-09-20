/**
 * System font detection for the Visual novel text roles.
 *
 * A browser reports every family as renderable, so availability is measured
 * instead: a probe string drawn in `"<candidate>", <generic>` has the generic
 * width exactly when the candidate is absent. Two generics are compared, so a
 * family whose metrics happen to match one of them is still caught by the
 * other.
 */

/** Candidate families offered for a text role, in control order. */
export const VN_FONT_CANDIDATES = [
  'Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Cambria',
  'Segoe UI', 'Arial', 'Helvetica Neue', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Calibri', 'Candara',
  'Optima', 'Futura', 'Comic Sans MS',
  'Consolas', 'Courier New', 'Cascadia Code', 'Menlo', 'Monaco', 'JetBrains Mono', 'Fira Code',
] as const

/** Probe text: several glyph classes, so a substituted family moves the width. */
const PROBE = 'mmmmmmmmmmlliWWQ@#'

/** Shipped generic stacks the probe measures against. */
const GENERICS = ['monospace', 'sans-serif'] as const

/**
 * Report the candidate families this browser can draw.
 * @returns available families in candidate order; empty when the browser
 * exposes no 2D canvas measurement, as in a test environment.
 */
export function detectAvailableFonts(): readonly string[] {
  const context = document.createElement('canvas').getContext('2d')
  if (context === null) return []
  const width = (stack: string): number => {
    context.font = `72px ${stack}`
    return context.measureText(PROBE).width
  }
  const baselines = GENERICS.map(generic => width(generic))
  return VN_FONT_CANDIDATES.filter(candidate => baselines.some((baseline, index) => (
    width(`"${candidate}", ${GENERICS[index] ?? ''}`) !== baseline
  )))
}
