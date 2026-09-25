/** Client visual-novel presentation registrations. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { VN_SETTINGS_NAMESPACE, type VnSettings } from '../vn-settings.ts'
import { VnSettingsSection, VnStage } from './VnPresentation.tsx'
import { en, NS, zh } from './locale.ts'

export const inject = ['slots', 'settingsScope', 'locale']

export function apply(ctx: Context): void {
  const settings = ctx.settingsScope.bind<VnSettings>({ namespace: VN_SETTINGS_NAMESPACE })
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'ui-vn: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.background', () => ctx.slots.register({
    name: 'conversation.background', id: 'vn-stage', order: 0,
    inject: () => ({ settings, t }),
  }, VnStage))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'visual-novel', order: 12,
    label: () => t('title'),
    locale: NS,
    inject: () => ({ settings, t }),
  }, VnSettingsSection))
}

export { deriveVnState } from './state.ts'
