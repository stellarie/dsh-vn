/**
 * Browser half: register the collapsed-Sidebar card stack into the
 * conversation's input dock seat.
 *
 * The seat is session-scoped, which is what the stack needs: the Session on
 * screen is the one that must not receive a card, and the dock is mounted for
 * exactly that Session. The component portals its own stack, so occupying a
 * composer seat contributes nothing to the composer's layout.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the conversation.input.dock seat declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.slots service merge.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ctx.uiWorkspace merge.
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { SessionCards, type SessionCardsInjected } from './SessionCards.tsx'
import { createSidebarCollapsedSource } from './sidebar-collapsed.ts'
import { en, NS, zh, type SessionCardKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Collapsed-Sidebar session-card copy. */
    sessionCards: SessionCardKey
  }
}

/** Required browser services: the slot registry, Session navigation, and copy. */
export const inject = ['slots', 'uiWorkspace', 'locale']

/**
 * Register the card stack once the conversation declares the dock seat.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-session-cards: dictionaries')

  const injected = (): SessionCardsInjected => ({
    hooks: { sidebarCollapsed: createSidebarCollapsedSource() },
    open: (sessionId: SessionId) => { ctx.uiWorkspace.openSession(sessionId) },
  })

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'session-cards',
    order: 30,
    locale: NS,
    inject: injected,
  }, SessionCards))
}
