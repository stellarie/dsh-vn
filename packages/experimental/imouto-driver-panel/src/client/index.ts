/** Client registration for the imouto-driver worker sidebar pane. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { DriverPanel } from './DriverPanel.tsx'
import { en, NS, zh } from './locale.ts'

/** Services needed by the pane's two sidebar seats. */
export const inject = ['slots', 'locale', 'sidebarRightTabs']

/** Tab type identity, shared by the type, the guide entry, and the body. */
const TAB_ID = '@deepseek-ai/dsh-experimental-imouto-driver-panel'

/**
 * Register the driver worker tab type and its pane body.
 * @param ctx - client root Context with sidebar and locale services.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'imouto-driver-panel: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID, kind: 'driverpanel', multiple: false, priority: 'builtin',
    title: () => t('title'),
    guide: [{ id: 'open', order: 30, title: () => t('open'), description: () => t('description') }],
  }), 'imouto-driver-panel: tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS,
    inject: () => ({ t }),
  }, DriverPanel)), 'imouto-driver-panel: pane body')
}
