// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatus, SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { SessionCards, type SessionCardsProps } from '../src/client/SessionCards.tsx'
import { zh } from '../src/client/locales.ts'

const sid = (id: string) => id as SessionId
const summary = (id: string, overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: sid(id), displayTitle: id, running: false, blank: false, updatedAt: 0, retainedBy: {}, ...overrides,
})
const list = (...items: SessionSummary[]): SessionListState => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  phase: 'ready', subagentsByParent: {}, jobsBySession: {},
})
const running: SessionStatus = { running: true, pendingInteraction: undefined, completionUnread: false }
const statuses = (...entries: readonly [string, SessionStatus][]): SessionStatusSnapshot =>
  new Map(entries.map(([id, value]) => [sid(id), value]))

function props(options: {
  list: SessionListState
  statuses?: SessionStatusSnapshot
  archived?: readonly SessionId[]
  collapsed?: boolean
  sessionId?: SessionId
  open?: (sessionId: SessionId) => void
}): SessionCardsProps {
  const snapshot = options.statuses ?? new Map()
  const workspaces = { items: [], phase: 'ready', state: 'ready', archivedSessionIds: options.archived ?? [] }
  return {
    sessionId: options.sessionId ?? sid('current'),
    useSessions: (select: (state: SessionListState) => unknown) => select(options.list),
    useSessionStatus: (select: (state: SessionStatusSnapshot) => unknown) => select(snapshot),
    useWorkspaces: (select: (state: typeof workspaces) => unknown) => select(workspaces),
    useSidebarCollapsed: (select: (value: boolean) => unknown) => select(options.collapsed ?? true),
    open: options.open ?? (() => {}),
    t: makeTranslate(zh, commonZh),
  } as unknown as SessionCardsProps
}

const stack = () => document.querySelector('[data-session-cards]')

beforeEach(() => {
  const anchor = document.createElement('div')
  anchor.setAttribute('data-conversation-content', '')
  document.body.append(anchor)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100, top: 40, right: 900, bottom: 700, width: 800, height: 660,
    x: 100, y: 40, toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  document.querySelector('[data-conversation-content]')?.remove()
  vi.restoreAllMocks()
})

describe('SessionCards', () => {
  it('renders no stack while the left Sidebar is shown', () => {
    render(<SessionCards {...props({
      list: list(summary('other')),
      statuses: statuses(['other', running]),
      collapsed: false,
    })} />)

    expect(stack()).toBeNull()
  })

  it('shows one card per Session that needs attention, with its state and title', () => {
    render(<SessionCards {...props({
      list: list(
        summary('busy', { displayTitle: 'Busy session' }),
        summary('asking', { displayTitle: 'Asking session' }),
        summary('quiet', { displayTitle: 'Quiet session' }),
      ),
      statuses: statuses(
        ['busy', running],
        ['asking', { running: false, pendingInteraction: undefined, completionUnread: true }],
      ),
    })} />)

    const cards = document.querySelectorAll('[data-session-cards] > button')
    expect(cards).toHaveLength(2)
    expect(cards[0]?.textContent).toContain('Busy session')
    expect(cards[0]?.textContent).toContain(zh['state.running'])
    expect(cards[1]?.textContent).toContain('Asking session')
    expect(cards[1]?.textContent).toContain(zh['state.done'])
    expect(document.body.textContent).not.toContain('Quiet session')
  })

  it('places the stack inside the conversation area corner', () => {
    render(<SessionCards {...props({ list: list(summary('other')), statuses: statuses(['other', running]) })} />)

    const element = stack() as HTMLElement
    expect(element.style.left).toBe('118px')
    expect(element.style.top).toBe('58px')
    expect(element.getAttribute('aria-label')).toBe(zh.stack)
  })

  it('makes the clicked Session current', () => {
    const open = vi.fn()
    render(<SessionCards {...props({
      list: list(summary('first'), summary('second')),
      statuses: statuses(['first', running], ['second', running]),
      open,
    })} />)

    const cards = document.querySelectorAll('[data-session-cards] > button')
    fireEvent.click(cards[1] as HTMLElement)
    expect(open).toHaveBeenCalledExactlyOnceWith(sid('second'))
  })

  it('renders no stack when no Session needs attention', () => {
    render(<SessionCards {...props({ list: list(summary('quiet')) })} />)
    expect(stack()).toBeNull()
  })

  it('renders no stack while the conversation area is absent', () => {
    document.querySelector('[data-conversation-content]')?.remove()
    render(<SessionCards {...props({ list: list(summary('other')), statuses: statuses(['other', running]) })} />)

    expect(stack()).toBeNull()
  })
})
