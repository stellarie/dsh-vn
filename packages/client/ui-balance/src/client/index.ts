/** Client registration for the composer-footer balance toggle. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { BalanceToggle } from './BalanceToggle.tsx'
import { en, NS, zh } from './locale.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'ui-balance: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.composer.footer', () => ctx.slots.register({
    name: 'conversation.composer.footer', id: 'balance', order: 20,
    locale: NS,
    inject: () => ({ t }),
  }, BalanceToggle))
}
