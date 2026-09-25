/**
 * The Team header action: the roster, the shared task board, and the two
 * entry points into the right-Sidebar stack.
 *
 * The dialog owns when the view is read — on open, on demand, and after a
 * mutation — while every task mutation belongs to {@link TeamTaskBoard}, which
 * both this dialog and the right-Sidebar stack render.
 */

import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  TeamMemberView as TeamRosterMember,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import {
  IconCloseOutline16, IconPanelLeftOutline16, IconRefreshOutline14, IconUserOutline16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import { TeamTaskBoard } from './TeamTaskBoard.tsx'
import { memberStatusKey } from './team-view.ts'
import { useTeamView } from './useTeamView.ts'
import type {
  TeamActionResult, TeamTaskActionResult, TeamTaskCreateInput, TeamTaskUpdateInput,
} from './team-remote.ts'
import css from './TeamAction.module.css'

export type {
  TeamActionResult, TeamTaskActionResult, TeamTaskCreateInput, TeamTaskUpdateInput,
} from './team-remote.ts'

/** Business actions injected by the browser plugin. */
export interface TeamActionInjected {
  load: (sessionId: SessionId) => Promise<TeamActionResult<TeamView>>
  createTask: (sessionId: SessionId, input: TeamTaskCreateInput) => Promise<TeamTaskActionResult>
  updateTask: (sessionId: SessionId, input: TeamTaskUpdateInput) => Promise<TeamTaskActionResult>
  openTeammate: (sessionId: SessionId, member: TeamRosterMember) => Promise<void>
  openStack: () => void
}

/** Full props of the Team conversation-header action. */
export type TeamActionProps =
  PropsRuntime<'conversation.session.header.actions'> & TeamActionInjected & PropsLocale<typeof NS>

/** Render the live Team roster and compare-and-set task board. */
export function TeamAction({
  sessionId, load, createTask, updateTask, openTeammate, openStack, t,
}: TeamActionProps) {
  const [open, setOpen] = useState(false)
  const { view, loading, failure, fail, invalidate, reset, refresh } = useTeamView(sessionId, load)

  useEffect(() => {
    setOpen(false)
    reset()
  }, [reset, sessionId])

  const teammates = view?.members.filter(member => member.role === 'teammate') ?? []

  return (
    <div className={css.root} data-team-action>
      <button
        type="button"
        className={css.trigger}
        aria-expanded={open}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) void refresh()
        }}
      >
        <IconUserOutline16 size={14} />
        <span>{t('trigger')}</span>
        {teammates.length > 0 && <span className={css.count}>{teammates.length}</span>}
      </button>
      {open && (
        <div className={css.panel} role="dialog" aria-label={t('trigger')}>
          <div className={css.toolbar}>
            <strong>{t('trigger')}</strong>
            <span className={css.spacer} />
            <button type="button" className={css.toolbarButton} onClick={openStack}>
              <IconPanelLeftOutline16 size={13} className={css.mirror} /> {t('openInSidebar')}
            </button>
            <button type="button" className={css.iconButton} aria-label={t('refresh')} onClick={() => { void refresh() }}>
              <IconRefreshOutline14 />
            </button>
            <button type="button" className={css.iconButton} aria-label={t('close')} onClick={() => { setOpen(false) }}>
              <IconCloseOutline16 size={14} />
            </button>
          </div>
          {failure !== null && <div className={css.error} role="alert">{failure}</div>}
          {loading && view === null && <div className={css.notice}>{t('loading')}</div>}
          {view !== null && (
            <>
              <section>
                <h3>{t('roster')}</h3>
                <div className={css.roster}>
                  {view.members.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className={css.member}
                      disabled={member.role === 'lead' || member.status === 'failed' || member.status === 'provisioning'}
                      title={member.role === 'teammate' ? t('open') : undefined}
                      onClick={() => {
                        void openTeammate(sessionId, member).catch((reason: unknown) => { fail(String(reason)) })
                      }}
                    >
                      <StateDot state={member.status === 'running' ? 'ongoing' : member.status === 'failed' ? 'error' : 'done'} />
                      <span className={css.memberText}>
                        <span>{member.name}</span>
                        <small>{t(memberStatusKey(member.status))}{member.model === undefined ? '' : ` · ${t('model')}: ${member.model}`}</small>
                        {member.diagnostics.map(diagnostic => <small key={diagnostic} className={css.diagnostic}>{diagnostic}</small>)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <TeamTaskBoard
                sessionId={sessionId}
                view={view}
                createTask={createTask}
                updateTask={updateTask}
                invalidate={invalidate}
                reload={refresh}
                fail={fail}
                t={t}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
