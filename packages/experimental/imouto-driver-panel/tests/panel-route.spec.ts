import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Config, apply, PANEL_PATH } from '../src/index.ts'
import { driverStateDirFor } from '../src/state-dir.ts'

const created: string[] = []

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** One registered Connection route the stub captured. */
interface RegisteredRoute {
  readonly path: string
  readonly methods: readonly string[]
  fetch: (request: Request) => Promise<Response>
}

/**
 * Host Context stub that runs the inject callback and captures the route.
 * @returns the stub context and a reader for the captured route.
 */
function routeContext(): { ctx: unknown; route: () => RegisteredRoute } {
  let registered: RegisteredRoute | undefined
  const routeCtx = {
    effect: (fn: () => unknown) => fn(),
    connection: {
      fetch: {
        register: (definition: RegisteredRoute) => {
          registered = definition
          return () => undefined
        },
      },
    },
  }
  const ctx = { inject: (_names: readonly string[], callback: (scope: unknown) => void) => { callback(routeCtx) } }
  return {
    ctx,
    route: () => {
      if (registered === undefined) throw new Error('no route was registered')
      return registered
    },
  }
}

/** One worker record the reader accepts. */
function record(id: string, name: string, goal: string): string {
  return JSON.stringify({ id, name, goal, state: 'idle', updatedAt: '2026-09-20T08:00:00.000Z' })
}

/** One event line as the driver appends it. */
function event(seq: number, imouto: string, type: string, data: Record<string, unknown>): string {
  return `${JSON.stringify({ at: '2026-09-20T08:09:00.000Z', seq, imouto, type, data })}\n`
}

/** A driver state directory whose project key matches the root under test. */
function driverState(stateHome: string, root: string, files: Readonly<Record<string, string>>): void {
  const stateDir = driverStateDirFor(root, {
    home: stateHome,
    platform: process.platform,
    env: { IMOUTO_STATE_HOME: stateHome },
  })
  for (const [relative, content] of Object.entries(files)) {
    const path = join(stateDir, relative)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf8')
  }
}

describe('Config', () => {
  it('requires the driver root and applies the read bounds', () => {
    const value = Config({ root: 'C:\\drivers\\example' })
    expect(value.root).toBe('C:\\drivers\\example')
    expect(value.maxWorkers).toBe(32)
    expect(value.maxTailBytes).toBe(262_144)
  })

  it('rejects a root that is not an absolute path', () => {
    expect(() => Config({ root: 'drivers/example' })).toThrow()
  })

  it('rejects a root that names no directory', () => {
    expect(() => Config({ root: '' })).toThrow()
  })
})

describe('apply', () => {
  it('registers one authenticated GET route', () => {
    const config = Config({ root: 'C:\\drivers\\example' })
    const { ctx, route } = routeContext()
    apply(ctx as never, config)
    expect(route().path).toBe(PANEL_PATH)
    expect(route().methods).toEqual(['GET'])
  })

  it('answers the bounded worker snapshot as JSON', async () => {
    const home = mkdtempSync(join(tmpdir(), 'imouto-panel-home-'))
    created.push(home)
    const root = 'C:\\drivers\\example'
    const previous = process.env.IMOUTO_STATE_HOME
    process.env.IMOUTO_STATE_HOME = home
    try {
      driverState(home, root, {
        'imoutos/imo-1.json': record('imo-1', 'hina', 'Review the diff'),
        'events.jsonl': event(1, 'imo-1', 'state', { from: 'idle', to: 'running', reason: 'spawn' }),
      })
      const config = Config({ root })
      const { ctx, route } = routeContext()
      apply(ctx as never, config)
      const response = await route().fetch(new Request(`http://host${PANEL_PATH}`))
      const body = await response.json() as { workers: { id: string; status: string; goal: string }[] }
      expect(body.workers).toEqual([
        { id: 'imo-1', name: 'hina', status: 'running', goal: 'Review the diff', updatedAt: '2026-09-20T08:00:00.000Z', lastActivity: { at: '2026-09-20T08:09:00.000Z', type: 'state', detail: 'idle->running' } },
      ])
    } finally {
      if (previous === undefined) delete process.env.IMOUTO_STATE_HOME
      else process.env.IMOUTO_STATE_HOME = previous
    }
  })

  it('answers an empty roster when the driver state directory is absent', async () => {
    const home = mkdtempSync(join(tmpdir(), 'imouto-panel-home-'))
    created.push(home)
    const previous = process.env.IMOUTO_STATE_HOME
    process.env.IMOUTO_STATE_HOME = home
    try {
      const config = Config({ root: 'C:\\drivers\\never-started' })
      const { ctx, route } = routeContext()
      apply(ctx as never, config)
      const response = await route().fetch(new Request(`http://host${PANEL_PATH}`))
      expect(response.status).toBe(200)
      const body = await response.json() as { workers: unknown[] }
      expect(body.workers).toEqual([])
    } finally {
      if (previous === undefined) delete process.env.IMOUTO_STATE_HOME
      else process.env.IMOUTO_STATE_HOME = previous
    }
  })

  it('bounds the roster to the configured worker count', async () => {
    const home = mkdtempSync(join(tmpdir(), 'imouto-panel-home-'))
    created.push(home)
    const root = 'C:\\drivers\\example'
    const previous = process.env.IMOUTO_STATE_HOME
    process.env.IMOUTO_STATE_HOME = home
    try {
      driverState(home, root, {
        'imoutos/imo-1.json': record('imo-1', 'one', 'g'),
        'imoutos/imo-2.json': record('imo-2', 'two', 'g'),
        'imoutos/imo-3.json': record('imo-3', 'three', 'g'),
      })
      const config = Config({ root, maxWorkers: 2 })
      const { ctx, route } = routeContext()
      apply(ctx as never, config)
      const body = await (await route().fetch(new Request(`http://host${PANEL_PATH}`))).json() as { workers: { id: string }[] }
      expect(body.workers.map(worker => worker.id)).toEqual(['imo-1', 'imo-2'])
    } finally {
      if (previous === undefined) delete process.env.IMOUTO_STATE_HOME
      else process.env.IMOUTO_STATE_HOME = previous
    }
  })
})
