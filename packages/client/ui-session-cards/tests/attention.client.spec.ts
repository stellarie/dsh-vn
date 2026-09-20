import { describe, expect, it } from 'vitest'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  SessionPendingInteraction, SessionStatus, SessionStatusSnapshot,
} from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { attentionCards } from '../src/client/attention.ts'

const sid = (id: string) => id as SessionId
const summary = (id: string, overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: sid(id), displayTitle: id, running: false, blank: false, updatedAt: 0, retainedBy: {}, ...overrides,
})
const list = (...items: SessionSummary[]): SessionListState => ({
  ids: items.map(item => item.id),
  byId: Object.fromEntries(items.map(item => [item.id, item])),
  phase: 'ready', subagentsByParent: {}, jobsBySession: {},
})
const status = (
  pendingInteraction: SessionPendingInteraction | undefined,
  overrides: Partial<SessionStatus> = {},
): SessionStatus => ({ running: undefined, pendingInteraction, completionUnread: false, ...overrides })
const statuses = (...entries: readonly [string, SessionStatus][]): SessionStatusSnapshot =>
  new Map(entries.map(([id, value]) => [sid(id), value]))
const none: SessionStatusSnapshot = new Map()
const noArchive: readonly SessionId[] = []

describe('attentionCards', () => {
  it('shows a running session', () => {
    expect(attentionCards(list(summary('a')), statuses(['a', status(undefined, { running: true })]), noArchive, undefined))
      .toEqual([{ id: sid('a'), title: 'a', kind: 'running' }])
  })

  it('shows a session awaiting a decision ahead of its activity', () => {
    for (const kind of ['approval', 'plan-review', 'question'] as const) {
      const pending = { key: `${kind}:1`, kind, sessionId: sid('a') } as SessionPendingInteraction
      expect(attentionCards(list(summary('a')), statuses(['a', status(pending, { running: true })]), noArchive, undefined))
        .toEqual([{ id: sid('a'), title: 'a', kind: 'decision' }])
    }
  })

  it('shows a session that finished without being opened', () => {
    expect(attentionCards(list(summary('a')), statuses(['a', status(undefined, { completionUnread: true })]), noArchive, undefined))
      .toEqual([{ id: sid('a'), title: 'a', kind: 'done' }])
  })

  it('omits a session with nothing to attend to', () => {
    expect(attentionCards(list(summary('a')), none, noArchive, undefined)).toEqual([])
    expect(attentionCards(list(summary('a')), statuses(['a', status(undefined)]), noArchive, undefined)).toEqual([])
    expect(attentionCards(list(summary('a')), statuses(['a', status(undefined, { running: false })]), noArchive, undefined))
      .toEqual([])
  })

  it('falls back to the list projection while no live status is known', () => {
    expect(attentionCards(list(summary('a', { running: true })), none, noArchive, undefined))
      .toEqual([{ id: sid('a'), title: 'a', kind: 'running' }])
  })

  it('omits the session already on screen', () => {
    const state = list(summary('a'), summary('b'))
    expect(attentionCards(state, statuses(
      ['a', status(undefined, { running: true })],
      ['b', status(undefined, { running: true })],
    ), noArchive, sid('a'))).toEqual([{ id: sid('b'), title: 'b', kind: 'running' }])
  })

  it('omits blank, archived, and subagent sessions', () => {
    const state = list(
      summary('blank', { blank: true }),
      summary('archived'),
      summary('child', { origin: 'subagent' }),
    )
    const running = status(undefined, { running: true })
    expect(attentionCards(state, statuses(
      ['blank', running], ['archived', running], ['child', running],
    ), [sid('archived')], undefined)).toEqual([])
  })

  it('keeps list order and each session title', () => {
    const state = list(
      summary('first', { displayTitle: 'First session' }),
      summary('second', { displayTitle: 'Second session' }),
      summary('third', { displayTitle: 'Third session' }),
    )
    expect(attentionCards(state, statuses(
      ['first', status(undefined, { running: true })],
      ['third', status(undefined, { completionUnread: true })],
    ), noArchive, undefined)).toEqual([
      { id: sid('first'), title: 'First session', kind: 'running' },
      { id: sid('third'), title: 'Third session', kind: 'done' },
    ])
  })
})
