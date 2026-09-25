/** Source-safe Agent Teams browser registration and Remote mount lifecycle. */

import type {
  TeamMemberView as TeamRosterMember,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import {
  TeamAction, type TeamActionInjected, type TeamActionResult, type TeamTaskActionResult,
} from './TeamAction.tsx'
import { TeamSidebar, type TeamSidebarInjected } from './TeamSidebar.tsx'
import type { TeamTaskCreateInput, TeamTaskUpdateInput } from './team-remote.ts'
import { en, NS, zh, type TeamKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Agent Teams roster and task-board copy. */
    'agent-team': TeamKey
  }
}

/** Required browser services for RPC, navigation, slots, locale, and the right Sidebar. */
export const inject = ['sessions', 'uiWorkspace', 'remote', 'slots', 'locale', 'sidebarRight', 'sidebarRightTabs']

/** Tab type identity: this package's name, and the key its body registers under. */
const TAB_ID = '@deepseek-ai/dsh-experimental-client-ui-agent-team'

/** Page type discriminator the right Sidebar opens by name. */
const TAB_KIND = 'agent-team'

function registerUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-agent-team: dictionaries')
  const sessions = ctx.sessions
  const t = ctx.locale.bind(NS)
  const leadSessionId = (sessionId: SessionId): SessionId => {
    const address = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address
    return address?.parentSessionId ?? sessionId
  }
  const loadTeamView = async (sessionId: SessionId): Promise<TeamActionResult<TeamView>> => {
    return await ctx.remote.agentTeams.view(leadSessionId(sessionId))
  }
  const createTeamTask = async (
    sessionId: SessionId,
    input: TeamTaskCreateInput,
  ): Promise<TeamTaskActionResult> => {
    return await ctx.remote.agentTeams.createTask(leadSessionId(sessionId), input)
  }
  const updateTeamTask = async (
    sessionId: SessionId,
    input: TeamTaskUpdateInput,
  ): Promise<TeamTaskActionResult> => {
    const { owner, ...rest } = input
    return await ctx.remote.agentTeams.updateTask(leadSessionId(sessionId), {
      ...rest,
      ...owner === undefined ? {} : { owner },
    })
  }

  const actions: TeamActionInjected = {
    load: loadTeamView,
    createTask: createTeamTask,
    updateTask: updateTeamTask,
    async openTeammate(sessionId: SessionId, member: TeamRosterMember): Promise<void> {
      if (member.role !== 'teammate') return
      const parentSessionId = leadSessionId(sessionId)
      await sessions.refreshSubagents(parentSessionId)
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
      ctx.uiWorkspace.openSession({
        parentSessionId,
        childSessionId: member.id,
        mode: 'continuable',
      })
    },
    // One open per kind: the page deduplicates within its pane, so the control
    // reveals the stack already open instead of stacking a second copy.
    openStack(): void { ctx.sidebarRight.openTab(TAB_KIND) },
  }

  const sidebar: TeamSidebarInjected = {
    load: loadTeamView,
    createTask: createTeamTask,
    updateTask: updateTeamTask,
    // The pane's member name opens the same teammate Session the roster does.
    openTeammate: actions.openTeammate,
    async steer(sessionId, request) {
      return await ctx.remote.agentTeams.sendMessage(leadSessionId(sessionId), request)
    },
  }

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'builtin',
    title: () => t('trigger'),
  }), 'client-ui-agent-team: sidebar tab type')

  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
    locale: NS,
    inject: () => sidebar,
  }, TeamSidebar))

  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'agent-team',
      order: 20,
      locale: NS,
      inject: () => actions,
    }, TeamAction),
  )
}

/**
 * Mount one generated Team Remote contribution, then register its browser UI.
 * @param ctx - Client Context carrying navigation, locale, slot, and Remote services.
 * @param contribution - generated Team descriptors selected by the browser entry.
 * @returns disposer for both the UI registrations and Remote namespace.
 */
export async function mountAgentTeamUi(
  ctx: ClientContext,
  contribution: TypertRemoteContribution,
): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(contribution)
  const ui = ctx.inject(
    ['sessions', 'uiWorkspace', 'remote.agentTeams', 'slots', 'locale', 'sidebarRight', 'sidebarRightTabs'],
    registerUi,
  )
  try {
    await ui
  } catch (error) {
    await ui.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await disposeRemote()
  }
}
