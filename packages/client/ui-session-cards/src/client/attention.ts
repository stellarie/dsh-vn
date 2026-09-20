/**
 * Pure projection from the Session list and the unified UI status onto the
 * collapsed Sidebar's attention cards.
 *
 * The card set answers one question: which other Sessions want the user right
 * now. A card exists for a Session that is running, is waiting on a decision,
 * or finished without being opened.
 */

import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Why one card is shown; also selects its state indicator. */
export type SessionCardKind = 'running' | 'decision' | 'done'

/** One attention card: the Session to open and the state it reports. */
export interface SessionCard {
  readonly id: SessionId
  readonly title: string
  readonly kind: SessionCardKind
}

/**
 * Rank the three attention facts: a pending decision outranks the Session's own
 * activity, which outranks a completion reminder.
 * @param decision - a Session-scoped UI consumer awaits this user.
 * @param running - latest known activity, from the status map or the list projection.
 * @param completionUnread - the Session stopped while off screen and was not opened since.
 * @returns the card kind, or undefined when the Session wants nothing.
 */
function cardKind(
  decision: boolean,
  running: boolean,
  completionUnread: boolean,
): SessionCardKind | undefined {
  if (decision) return 'decision'
  if (running) return 'running'
  if (completionUnread) return 'done'
  return undefined
}

/**
 * Select the Sessions that need the user while the left Sidebar is collapsed.
 *
 * Blank placeholders, archived Sessions, subagent children, and the Session
 * already on screen have no card.
 * @param list - current Session list snapshot.
 * @param statuses - unified UI status by Session.
 * @param archivedSessionIds - registry-global archive set.
 * @param currentSessionId - the Session on screen, or undefined without one.
 * @returns one card per attention Session, in list order.
 */
export function attentionCards(
  list: SessionListState,
  statuses: SessionStatusSnapshot,
  archivedSessionIds: readonly SessionId[],
  currentSessionId: SessionId | undefined,
): SessionCard[] {
  const archived = new Set<SessionId>(archivedSessionIds)
  const cards: SessionCard[] = []
  for (const id of list.ids) {
    const summary = list.byId[id]
    if (summary === undefined || summary.blank || summary.origin === 'subagent') continue
    if (id === currentSessionId || archived.has(id)) continue
    const status = statuses.get(id)
    const kind = cardKind(
      status?.pendingInteraction !== undefined,
      status?.running ?? summary.running,
      status?.completionUnread === true,
    )
    if (kind === undefined) continue
    cards.push({ id, title: summary.displayTitle, kind })
  }
  return cards
}
