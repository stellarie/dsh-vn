// @vitest-environment jsdom

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { SessionCards, type SessionCardsInjected } from '../src/client/SessionCards.tsx'
import { createSidebarCollapsedSource } from '../src/client/sidebar-collapsed.ts'
import { apply as clientApply, inject } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'

const SESSION = 'other-session' as SessionId

async function bench() {
  const ctx = new Context()
  const openSession = vi.fn()
  ctx.provide('uiWorkspace', { openSession })
  ctx.provide('locale', new LocaleRuntime(ctx))
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'conversation.input.dock': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  const fiber = ctx.plugin({ inject: [...inject], apply: clientApply })
  await fiber.await()
  const entry = () => ctx.slots.entries('conversation.input.dock')
    .find(candidate => candidate.component === SessionCards)
  return { ctx, fiber, openSession, entry }
}

describe('ui-session-cards browser plugin', () => {
  it('declares every service it binds', () => {
    expect(inject).toEqual(['slots', 'uiWorkspace', 'locale'])
  })

  it('registers one disposable dock entry that opens the Session a card names', async () => {
    const b = await bench()
    expect(b.entry()).toMatchObject({ options: { id: 'session-cards' }, locale: 'sessionCards' })

    const injected = (b.entry()!.inject as unknown as () => SessionCardsInjected)()
    expect(Object.keys(injected.hooks)).toEqual(['sidebarCollapsed'])
    injected.open(SESSION)
    expect(b.openSession).toHaveBeenCalledExactlyOnceWith(SESSION)

    await b.fiber.dispose()
    expect(b.entry()).toBeUndefined()
  })

  it('reads the collapsed Sidebar fact from the frame attribute', () => {
    const source = createSidebarCollapsedSource()
    const listener = vi.fn()
    const unsubscribe = source.subscribe(listener)
    expect(source.getSnapshot()).toBe(false)

    const frame = document.createElement('div')
    frame.setAttribute('data-sidebar-collapsed', '')
    document.body.append(frame)
    expect(source.getSnapshot()).toBe(true)

    unsubscribe()
    frame.remove()
    expect(source.getSnapshot()).toBe(false)
  })

  it('keeps the node half inert', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
