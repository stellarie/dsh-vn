/**
 * Driver worker vocabulary shared by the reader, the host snapshot, and the pane.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel/types
 */

/** Live worker state, as the driver's own state machine defines it. */
export type DriverWorkerState = 'running' | 'idle' | 'tucked'

/** Live state a bounded event window could not establish. */
export type DriverWorkerStatus = DriverWorkerState | 'unknown'

/** One event as the driver appends it to `events.jsonl`. */
export interface DriverEvent {
  readonly at?: string
  readonly seq?: number
  readonly imouto: string
  readonly type: string
  readonly data?: Record<string, unknown>
}

/** The last recorded act of one worker. */
export interface DriverActivity {
  readonly at: string
  readonly type: string
  /** Tool name, state transition, or empty when the event carries no short token. */
  readonly detail: string
}

/** One worker row the pane renders. */
export interface DriverWorker {
  readonly id: string
  readonly name: string
  readonly status: DriverWorkerStatus
  readonly goal: string
  readonly updatedAt: string
  readonly lastActivity?: DriverActivity
}

/** One immutable read of the driver roster. */
export interface DriverSnapshot {
  /** State directory the read resolved, whether or not it exists. */
  readonly stateDir: string
  readonly readAt: string
  readonly workers: readonly DriverWorker[]
}

/** Bounds and inputs of one read. */
export interface ReadSnapshotOptions {
  /** Absolute driver state directory, from {@link driverStateDirFor}. */
  readonly stateDir: string
  /** Maximum worker rows retained. */
  readonly maxWorkers: number
  /** Maximum trailing bytes of `events.jsonl` scanned. */
  readonly maxTailBytes: number
  /** Timestamp recorded on the snapshot. */
  readonly now: string
}
