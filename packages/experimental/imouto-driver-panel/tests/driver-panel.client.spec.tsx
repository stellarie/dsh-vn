// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DriverPanel, type DriverPanelProps } from '../src/client/DriverPanel.tsx'
import type { DriverSnapshot, DriverWorker } from '../src/types.ts'

const t = (key: string): string => key
/** Owner props are framework-made; the pane reads only its locale seat. */
const props = { t } as unknown as DriverPanelProps

afterEach(() => {
  vi.unstubAllGlobals()
})

/** One worker row of a host snapshot. */
function worker(id: string, name: string, status: DriverWorker['status'], goal: string): DriverWorker {
  return { id, name, status, goal, updatedAt: '2026-09-20T08:00:00.000Z', lastActivity: { at: '2026-09-20T08:09:00.000Z', type: 'tool_call', detail: 'shell' } }
}

/** One host snapshot carrying the given rows. */
function snapshot(workers: readonly DriverWorker[]): DriverSnapshot {
  return { stateDir: '/state', readAt: '2026-09-20T09:00:00.000Z', workers }
}

/** Stub the authenticated panel route with one JSON body. */
function stubRoute(body: DriverSnapshot | undefined, ok = true): void {
  vi.stubGlobal('fetch', vi.fn(async () => ok
    ? Response.json(body)
    : new Response('nope', { status: 503 })))
}

describe('DriverPanel', () => {
  it('renders one row per worker with its name, live state, goal, and last activity', async () => {
    stubRoute(snapshot([worker('imo-1', 'hina', 'running', 'Review the diff')]))
    const view = render(<DriverPanel {...props} />)
    expect(await screen.findByText('hina')).toBeDefined()
    expect(screen.getByText('running')).toBeDefined()
    expect(screen.getByText('Review the diff')).toBeDefined()
    expect(screen.getByText('tool_call shell')).toBeDefined()
    expect(document.querySelector('[data-worker="imo-1"]')).not.toBeNull()
    view.unmount()
  })

  it('reads the authenticated host route', async () => {
    const fetchMock = vi.fn(async () => Response.json(snapshot([])))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<DriverPanel {...props} />)
    await screen.findByRole('status')
    expect(fetchMock).toHaveBeenCalledWith('/api/imouto-driver-panel/snapshot', { credentials: 'include' })
    view.unmount()
  })

  it('shows the empty notice before the first read settles', () => {
    stubRoute(snapshot([]))
    const view = render(<DriverPanel {...props} />)
    expect(screen.getByRole('status').textContent).toBe('empty')
    view.unmount()
  })

  it('shows the empty notice for an empty roster', async () => {
    stubRoute(snapshot([]))
    const view = render(<DriverPanel {...props} />)
    expect((await screen.findByRole('status')).textContent).toBe('empty')
    view.unmount()
  })

  it('shows the unavailable notice when the route refuses the read', async () => {
    stubRoute(undefined, false)
    const view = render(<DriverPanel {...props} />)
    expect((await screen.findByRole('status')).textContent).toBe('unavailable')
    view.unmount()
  })

  it('shows the unavailable notice when the read throws', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const view = render(<DriverPanel {...props} />)
    expect((await screen.findByRole('status')).textContent).toBe('unavailable')
    view.unmount()
  })

  it('renders a worker with an unknown state and no recorded activity', async () => {
    const bare: DriverWorker = { id: 'imo-2', name: 'miyu', status: 'unknown', goal: '', updatedAt: '' }
    stubRoute(snapshot([bare]))
    const view = render(<DriverPanel {...props} />)
    expect(await screen.findByText('miyu')).toBeDefined()
    expect(screen.getByText('unknown')).toBeDefined()
    view.unmount()
  })
})
