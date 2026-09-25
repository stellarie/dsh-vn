import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readDriverSnapshot } from '../src/reader.ts'

const created: string[] = []

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** One temporary state directory, populated from a file map. */
function stateDir(files: Readonly<Record<string, string>> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'imouto-panel-'))
  created.push(dir)
  for (const [relative, content] of Object.entries(files)) {
    const path = join(dir, relative)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf8')
  }
  return dir
}

/** One worker record with only the fields the panel reads. */
function record(id: string, name: string, goal: string, state = 'idle'): string {
  return JSON.stringify({ id, name, goal, state, updatedAt: '2026-09-20T08:00:00.000Z' })
}

/** One event line as the driver appends it. */
function event(seq: number, imouto: string, type: string, data: Record<string, unknown>): string {
  return `${JSON.stringify({ at: `2026-09-20T08:0${String(seq)}:00.000Z`, seq, imouto, type, data })}\n`
}

const READ_AT = '2026-09-20T09:00:00.000Z'

describe('readDriverSnapshot', () => {
  it('reports an empty roster for an absent state directory', () => {
    const dir = join(tmpdir(), 'imouto-panel-absent-does-not-exist')
    const snapshot = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 1024, now: READ_AT })
    expect(snapshot).toEqual({ stateDir: dir, readAt: READ_AT, workers: [] })
  })

  it('reads one row per worker with its name and goal', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'Review the diff'),
      'imoutos/imo-2.json': record('imo-2', 'miyu', 'Write the test'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => [worker.id, worker.name, worker.goal])).toEqual([
      ['imo-1', 'hina', 'Review the diff'],
      ['imo-2', 'miyu', 'Write the test'],
    ])
  })

  it('orders workers by numeric id, not by filename', () => {
    const dir = stateDir({
      'imoutos/imo-10.json': record('imo-10', 'ten', 'g'),
      'imoutos/imo-2.json': record('imo-2', 'two', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-2', 'imo-10'])
  })

  it('takes the live state from the events tail, not the persisted field', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g', 'idle'),
      'events.jsonl': event(1, 'imo-1', 'state', { from: 'idle', to: 'running', reason: 'spawn' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.status).toBe('running')
  })

  it('reports an unknown state when the tail holds no state event for a worker', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g', 'running'),
      'events.jsonl': event(1, 'imo-2', 'reasoning', { text: 'thinking' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.status).toBe('unknown')
  })

  it('ignores a torn trailing line and keeps the lines before it', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g'),
      'events.jsonl': event(1, 'imo-1', 'state', { from: 'idle', to: 'tucked', reason: 'tucked' })
        + '{"at":"2026-09-20T08:09:04.708Z","seq":3443,"imouto":"imo-1","type":"sta',
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.status).toBe('tucked')
  })

  it('drops a leading partial line when the tail window starts mid-file', () => {
    const first = event(1, 'imo-1', 'state', { from: 'idle', to: 'running', reason: 'spawn' })
    const second = event(2, 'imo-1', 'state', { from: 'running', to: 'tucked', reason: 'tucked' })
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g'),
      'events.jsonl': first + second,
    })
    // The window holds all of the second line plus the tail of the first, so the
    // cut lands mid-line and the fragment must not invent a state.
    const { workers } = readDriverSnapshot({
      stateDir: dir, maxWorkers: 32, maxTailBytes: second.length + 10, now: READ_AT,
    })
    expect(workers[0]?.status).toBe('tucked')
  })

  it('reports the last activity of a worker', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g'),
      'events.jsonl': event(1, 'imo-1', 'tool_call', { name: 'shell', args: { command: 'ls' } })
        + event(2, 'imo-1', 'reasoning', { text: 'thinking' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.lastActivity).toEqual({ at: '2026-09-20T08:02:00.000Z', type: 'reasoning', detail: '' })
  })

  it('carries the tool name of a call and the transition of a state change', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'hina', 'g'),
      'events.jsonl': event(1, 'imo-1', 'tool_call', { name: 'shell' })
        + event(2, 'imo-1', 'state', { from: 'idle', to: 'running', reason: 'spawn' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.lastActivity?.detail).toBe('idle->running')
  })

  it('bounds the roster to the configured worker count', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
      'imoutos/imo-2.json': record('imo-2', 'two', 'g'),
      'imoutos/imo-3.json': record('imo-3', 'three', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 2, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-1', 'imo-2'])
  })

  it('skips an unreadable record instead of throwing', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': '{"id":"imo-1","name":"broken"',
      'imoutos/imo-2.json': record('imo-2', 'two', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-2'])
  })

  it('skips a record that carries no usable identity', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': '{"name":"nameless"}',
      'imoutos/imo-2.json': record('imo-2', 'two', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-2'])
  })

  it('ignores a non-record file in the worker directory', () => {
    const dir = stateDir({
      'imoutos/notes.txt': 'not a record',
      'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-1'])
  })

  it('falls back to the id when a record carries no name', () => {
    const dir = stateDir({ 'imoutos/imo-7.json': JSON.stringify({ id: 'imo-7', state: 'idle' }) })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.name).toBe('imo-7')
    expect(workers[0]?.goal).toBe('')
    expect(workers[0]?.updatedAt).toBe('')
    expect(workers[0]?.lastActivity).toBeUndefined()
  })

  it('sorts a record file that is not named for a worker id last', () => {
    const dir = stateDir({
      'imoutos/legacy.json': record('imo-legacy', 'legacy', 'g'),
      'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers.map(worker => worker.id)).toEqual(['imo-1', 'imo-legacy'])
  })

  it('ignores an event line that is valid JSON but not an event', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
      'events.jsonl': '42\n',
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.status).toBe('unknown')
  })

  it('keeps an unknown state when a state event reports none', () => {
    const dir = stateDir({
      'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
      'events.jsonl': event(1, 'imo-1', 'state', { from: 'idle' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers[0]?.status).toBe('unknown')
    expect(workers[0]?.lastActivity?.detail).toBe('')
  })

  it('names an orchestrator row from the events tail', () => {
    const dir = stateDir({
      'events.jsonl': event(1, 'orchestrator', 'mail', { id: 46, from: 'orchestrator', to: 'imo-14' }),
    })
    const { workers } = readDriverSnapshot({ stateDir: dir, maxWorkers: 32, maxTailBytes: 4096, now: READ_AT })
    expect(workers).toEqual([])
  })
})
