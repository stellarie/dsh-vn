/**
 * Host-side read for one driver panel request.
 *
 * The route path lives in {@link ./wire.ts} so the browser half can name it
 * without importing this module, whose reader reaches the Node filesystem.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel/panel
 */

import { readDriverSnapshot } from './reader.ts'
import type { DriverSnapshot } from './types.ts'

export { PANEL_PATH } from './wire.ts'

/** Resolved directory and bounds one panel request applies. */
export interface PanelBounds {
  /** Absolute driver state directory, derived from the configured root. */
  readonly stateDir: string
  /** Maximum worker rows one request answers. */
  readonly maxWorkers: number
  /** Maximum trailing bytes of the activity stream one request scans. */
  readonly maxTailBytes: number
}

/**
 * Read one bounded snapshot for a panel request.
 * @param bounds - resolved state directory and read bounds.
 * @param now - timestamp recorded on the snapshot.
 * @returns the snapshot the route serializes; a missing driver yields no workers.
 */
export function readPanelSnapshot(bounds: PanelBounds, now: string): DriverSnapshot {
  return readDriverSnapshot({
    stateDir: bounds.stateDir,
    maxWorkers: bounds.maxWorkers,
    maxTailBytes: bounds.maxTailBytes,
    now,
  })
}
