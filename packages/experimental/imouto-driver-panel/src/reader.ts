/**
 * Bounded read of the driver's per-worker records and activity stream.
 *
 * Every read is additive: the driver writes these files for its own use and
 * reads none of them back, so a reader cannot corrupt driver state. Two bounds
 * keep one poll cheap — a worker count and a trailing byte window.
 *
 * The persisted `state` field never drives the result. The driver coerces any
 * record it loads whose state is not `tucked` to `tucked`
 * (`imouto-driver/src/runtime/store.ts`), so the field on disk is last-written
 * rather than live. Live state comes from the last `state` event in the window.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel/reader
 */

import { closeSync, openSync, readFileSync, readdirSync, readSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type {
  DriverActivity, DriverEvent, DriverSnapshot, DriverWorker, DriverWorkerState,
  DriverWorkerStatus, ReadSnapshotOptions,
} from './types.ts'

const WORKER_STATES: readonly string[] = ['running', 'idle', 'tucked']
const WORKER_FILE = /^imo-(\d+)\.json$/

/** One worker's latest observed state and last recorded act. */
interface Observed {
  readonly state: DriverWorkerStatus
  readonly activity: DriverActivity
}

/**
 * Read one bounded snapshot of the driver roster.
 * @param options - state directory, bounds, and snapshot timestamp.
 * @returns the roster, empty when the state directory or its records are absent.
 */
export function readDriverSnapshot(options: ReadSnapshotOptions): DriverSnapshot {
  const { stateDir, maxWorkers, maxTailBytes, now } = options
  const observed = readEvents(join(stateDir, 'events.jsonl'), maxTailBytes)
  const workers: DriverWorker[] = []
  for (const file of listWorkerFiles(join(stateDir, 'imoutos')).slice(0, maxWorkers)) {
    const record = readRecord(join(stateDir, 'imoutos', file))
    if (record === undefined) continue
    workers.push(toWorker(record, observed.get(record.id)))
  }
  return { stateDir, readAt: now, workers }
}

/**
 * Worker record files in roster order. An absent directory is an empty roster.
 * @param directory - the state directory's `imoutos` directory.
 * @returns file names, numeric ids first in ascending order.
 */
function listWorkerFiles(directory: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(directory)
  } catch {
    // The driver creates this directory on its first spawn.
    return []
  }
  return entries
    .filter(entry => entry.endsWith('.json'))
    .sort((left, right) => workerOrder(left) - workerOrder(right) || left.localeCompare(right))
}

/** Position of a worker file in the roster; a non-id name sorts last. */
function workerOrder(file: string): number {
  const digits = WORKER_FILE.exec(file)
  return digits === null ? Number.MAX_SAFE_INTEGER : Number(digits[1])
}

/**
 * Parse one worker record. A torn write or a hostile file yields nothing.
 * @param path - absolute record path.
 * @returns the record's identity and display fields, or undefined.
 */
function readRecord(path: string): { id: string; name: string; goal: string; updatedAt: string } | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    // The driver replaces this file whole, so a reader can catch a rename window.
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as { id?: unknown; name?: unknown; goal?: unknown; updatedAt?: unknown }
  if (typeof record.id !== 'string' || record.id === '') return undefined
  return {
    id: record.id,
    name: typeof record.name === 'string' && record.name !== '' ? record.name : record.id,
    goal: typeof record.goal === 'string' ? record.goal : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  }
}

/** One worker row from its record and its latest observation. */
function toWorker(
  record: { id: string; name: string; goal: string; updatedAt: string },
  observed: Observed | undefined,
): DriverWorker {
  return {
    id: record.id,
    name: record.name,
    status: observed?.state ?? 'unknown',
    goal: record.goal,
    updatedAt: record.updatedAt,
    ...observed === undefined ? {} : { lastActivity: observed.activity },
  }
}

/**
 * Fold the trailing event window into one observation per worker.
 * @param path - absolute `events.jsonl` path.
 * @param maxTailBytes - maximum trailing bytes read.
 * @returns latest observation keyed by worker id.
 */
function readEvents(path: string, maxTailBytes: number): Map<string, Observed> {
  const observed = new Map<string, Observed>()
  for (const event of readTailEvents(path, maxTailBytes)) {
    const previous = observed.get(event.imouto)
    const state = eventState(event) ?? previous?.state ?? 'unknown'
    observed.set(event.imouto, {
      state,
      activity: { at: event.at ?? '', type: event.type, detail: eventDetail(event.data ?? {}) },
    })
  }
  return observed
}

/**
 * Read the tail of a file the driver appends to, one event per line.
 * @param path - absolute file path.
 * @param maxTailBytes - maximum trailing bytes read.
 * @returns parsed events in file order; a torn first or last line contributes none.
 */
function readTailEvents(path: string, maxTailBytes: number): DriverEvent[] {
  let handle: number | undefined
  try {
    handle = openSync(path, 'r')
    const size = statSync(path).size
    const start = Math.max(0, size - maxTailBytes)
    const buffer = Buffer.alloc(size - start)
    readSync(handle, buffer, 0, buffer.length, start)
    const lines = buffer.toString('utf8').split('\n')
    // A window that starts mid-file begins mid-line; the driver emits no length prefix.
    if (start > 0) lines.shift()
    return lines.flatMap(parseEvent)
  } catch {
    // The driver owns this file: absence, truncation, and a missing directory
    // all mean the same thing to a reader, which is that no activity is known.
    return []
  } finally {
    if (handle !== undefined) closeSync(handle)
  }
}

/**
 * Parse one `events.jsonl` line.
 * @param line - one raw line.
 * @returns the event, or nothing for an empty line, a torn line, or non-event JSON.
 */
function parseEvent(line: string): DriverEvent[] {
  if (line === '') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    // The driver appends per line, so the last line is routinely a partial write.
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) return []
  const event = parsed as { imouto?: unknown; type?: unknown }
  if (typeof event.imouto !== 'string' || typeof event.type !== 'string') return []
  return [parsed as DriverEvent]
}

/** The live state a `state` event reports, when it reports a known one. */
function eventState(event: DriverEvent): DriverWorkerState | undefined {
  if (event.type !== 'state') return undefined
  const to = event.data?.to
  return typeof to === 'string' && WORKER_STATES.includes(to) ? to as DriverWorkerState : undefined
}

/** The short token a pane shows for one event: a tool name or a transition. */
function eventDetail(data: Record<string, unknown>): string {
  if (typeof data.name === 'string') return data.name
  if (typeof data.to === 'string') return `${typeof data.from === 'string' ? data.from : ''}->${data.to}`
  return ''
}
