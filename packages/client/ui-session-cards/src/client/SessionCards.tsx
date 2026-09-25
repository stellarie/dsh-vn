/**
 * Collapsed-Sidebar session cards: a floating stack of small cards, one per
 * Session that wants the user while the left Sidebar is hidden.
 *
 * The stack is portaled to the document body and positioned from the live
 * conversation area, so the transcript's own scrolling and clipping cannot
 * affect it. Each card carries one state indicator and the Session title; a
 * click makes that Session current through the Workspace navigation face.
 */

import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  HostObservable, PropsHooks, PropsLocale, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the conversation SlotMap merge (the conversation.input.dock seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the session standard props and the unified status hook.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the ctx.uiWorkspace merge used by the injected open callback.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { attentionCards, type SessionCardKind } from './attention.ts'
import { NS, type SessionCardKey } from './locales.ts'
import css from './SessionCards.module.css'

/** Distance kept between the conversation area's corner and the stack. */
const INSET = 18

/** The live conversation area the stack is placed from. */
const ANCHOR_SELECTOR = '[data-conversation-content]'

/** Indicator drawn for each attention state. */
const CARD_STATE: Readonly<Record<SessionCardKind, StateDotState>> = {
  running: 'ongoing',
  decision: 'warning',
  done: 'done',
}

/** Screen-reader label for each attention state. */
const CARD_LABEL: Readonly<Record<SessionCardKind, SessionCardKey>> = {
  running: 'state.running',
  decision: 'state.decision',
  done: 'state.done',
}

/** Business actions and observations injected by the browser plugin. */
export interface SessionCardsInjected {
  hooks: {
    /** Whether the frame currently hides the left Sidebar. */
    sidebarCollapsed: HostObservable<boolean>
  }
  /** Make one Session current. */
  open: (sessionId: SessionId) => void
}

/** Full props of the collapsed-Sidebar card stack. */
export type SessionCardsProps =
  PropsRuntime<'conversation.input.dock'>
  & Omit<SessionCardsInjected, 'hooks'>
  & PropsHooks<SessionCardsInjected['hooks']>
  & PropsLocale<typeof NS>

/**
 * Track the conversation area's top-left corner while the stack is shown.
 * @param active - whether the stack is mounted and should track its anchor.
 * @returns the fixed `left`/`top` for the stack, or null before the first measurement.
 */
function useStackPosition(active: boolean): CSSProperties | null {
  const [position, setPosition] = useState<CSSProperties | null>(null)
  useLayoutEffect(() => {
    if (!active) {
      setPosition(null)
      return
    }
    const place = (): void => {
      const anchor = document.querySelector(ANCHOR_SELECTOR)
      // The dock seat renders inside the conversation area, so a stack that is
      // mounted has an anchor to be placed from.
      if (anchor === null) return
      const rect = anchor.getBoundingClientRect()
      setPosition({ left: rect.left + INSET, top: rect.top + INSET })
    }
    place()
    window.addEventListener('resize', place)
    // The column's width changes without a window resize when the Sidebar is
    // dragged or toggled, so the anchor's own box is watched too.
    const anchor = document.querySelector(ANCHOR_SELECTOR)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && anchor !== null) {
      observer = new ResizeObserver(place)
      observer.observe(anchor)
    }
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [active])
  return position
}

/** Render the floating stack of Sessions that need the user. */
export function SessionCards({
  sessionId, useSessions, useSessionStatus, useWorkspaces, useSidebarCollapsed, open, t,
}: SessionCardsProps) {
  const list = useSessions(state => state)
  const statuses = useSessionStatus(state => state)
  const archived = useWorkspaces(state => state.archivedSessionIds)
  const collapsed = useSidebarCollapsed(value => value)
  const cards = useMemo(
    () => attentionCards(list, statuses, archived, sessionId),
    [list, statuses, archived, sessionId],
  )
  // The anchor is only watched while something is on screen; a hidden stack
  // must cost nothing.
  const position = useStackPosition(collapsed && cards.length > 0)
  if (!collapsed || cards.length === 0 || position === null) return null
  return createPortal(
    <div className={css.stack} style={position} data-session-cards="" aria-label={t('stack')}>
      {cards.map(card => (
        <button
          key={card.id}
          type="button"
          className={css.card}
          onClick={() => { open(card.id) }}
        >
          <StateDot state={CARD_STATE[card.kind]} />
          <span className={css.state}>{t(CARD_LABEL[card.kind])}</span>
          <span className={css.title}>{card.title}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
