/** Deterministic VN state selection over existing Client observations. */
import type { VnState } from '../vn-settings.ts'

/** Existing Client observations used to select one VN state. */
export interface VnStateSignals {
  readonly running?: boolean
  readonly pendingDecision?: boolean
  readonly responding?: boolean
  readonly tool?: boolean
  readonly error?: boolean
}

/**
 * Select one state from highest to lowest precedence.
 * @param signals - current Session and Chat observations.
 * @returns the active VN presentation state.
 */
export function deriveVnState(signals: VnStateSignals): VnState {
  if (signals.error === true) return 'error'
  if (signals.pendingDecision === true) return 'decision'
  if (signals.tool === true) return 'tool'
  if (signals.responding === true) return 'responding'
  if (signals.running === true) return 'thinking'
  return 'idle'
}
