/**
 * Right-Sidebar Agent Team stack: one row per teammate with the shared task it
 * is working on now and one line to steer it, followed by the shared task board
 * both this stack and the header dialog render.
 *
 * The row's current item is the `in_progress` task that member owns, so the
 * stack reads the same authoritative Team view the header dialog does. Steering
 * goes through the durable peer mailbox: the browser caller is the Team Lead, so
 * a delivered line reaches the teammate as a sender-framed peer message.
 */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  SendTeamMessageResult,
  SendTeamMessageTextRequest,
  TeamMemberView,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import { IconRefreshOutline14, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the keyed `sidebar.right.pane.tab` seat declaration.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { NS } from './locales.ts'
import { TeamTaskBoard } from './TeamTaskBoard.tsx'
import { currentTaskOf, failureText, memberStatusKey } from './team-view.ts'
import { useTeamView } from './useTeamView.ts'
import type {
  TeamActionResult, TeamTaskActionResult, TeamTaskCreateInput, TeamTaskUpdateInput,
} from './team-remote.ts'
import css from './TeamSidebar.module.css'

/** Business actions injected by the browser plugin. */
export interface TeamSidebarInjected {
  load: (sessionId: SessionId) => Promise<TeamActionResult<TeamView>>
  steer: (sessionId: SessionId, request: SendTeamMessageTextRequest) => Promise<TeamActionResult<SendTeamMessageResult>>
  /** Open one teammate's own Session, the same call the dialog's roster makes. */
  openTeammate: (sessionId: SessionId, member: TeamMemberView) => Promise<void>
  createTask: (sessionId: SessionId, input: TeamTaskCreateInput) => Promise<TeamTaskActionResult>
  updateTask: (sessionId: SessionId, input: TeamTaskUpdateInput) => Promise<TeamTaskActionResult>
}

/** Full props of the right-Sidebar Team stack. */
export type TeamSidebarProps =
  PropsRuntime<'sidebar.right.pane.tab'> & TeamSidebarInjected & PropsLocale<typeof NS>

/** How often the mounted pane re-reads the Team view on its own. */
export const PANE_POLL_MS = 3_000

/** Render one row per teammate with its current task and one-line steering box. */
export function TeamSidebar({ sessionId, load, steer, openTeammate, createTask, updateTask, t }: TeamSidebarProps) {
  const { view, loading, failure, fail, invalidate, reset, refresh } = useTeamView(sessionId, load)
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({})
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())
  const [outcomes, setOutcomes] = useState<Readonly<Record<string, string>>>({})
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  useEffect(() => {
    reset()
    setDrafts({})
    setPending(new Set())
    setOutcomes({})
    void refresh()
  }, [refresh, reset])

  // The pane mirrors the live Team view rather than a snapshot of it: one read
  // on mount, then one per interval, so teammate status and task progress track
  // reality while the tab stays open. The timer belongs to this mount.
  useEffect(() => {
    const timer = setInterval(() => { void refresh() }, PANE_POLL_MS)
    return () => { clearInterval(timer) }
  }, [refresh])

  const send = async (memberName: string): Promise<void> => {
    const text = (drafts[memberName] ?? '').trim()
    /* v8 ignore next -- the send control is disabled while the box is blank. */
    if (text === '') return
    const requestedSession = sessionId
    setPending(current => new Set(current).add(memberName))
    setOutcomes((current) => {
      const { [memberName]: _settled, ...rest } = current
      return rest
    })
    try {
      const result = await steer(requestedSession, { target: memberName, text })
      if (sessionRef.current !== requestedSession) return
      if (!result.ok) {
        fail(failureText(result.error))
        return
      }
      fail(null)
      setDrafts(current => ({ ...current, [memberName]: '' }))
      const status = result.value.status === 'accepted' ? 'steerAccepted' : 'steerQueued'
      setOutcomes(current => ({ ...current, [memberName]: t(status) }))
      // The user's own action lands in the pane at once; the view follows
      // without waiting for the next poll.
      void refresh()
    } finally {
      if (sessionRef.current === requestedSession) {
        setPending((current) => {
          const next = new Set(current)
          next.delete(memberName)
          return next
        })
      }
    }
  }

  const teammates = view?.members.filter(member => member.role === 'teammate') ?? []

  return (
    <section className={css.stack} data-team-sidebar aria-label={t('trigger')}>
      <div className={css.toolbar}>
        <h3>{t('trigger')}</h3>
        <span className={css.spacer} />
        <button type="button" className={css.iconButton} aria-label={t('refresh')} onClick={() => { void refresh() }}>
          <IconRefreshOutline14 />
        </button>
      </div>
      {failure !== null && <div className={css.error} role="alert">{failure}</div>}
      {loading && view === null && <div className={css.notice}>{t('loading')}</div>}
      {view !== null && teammates.length === 0 && <div className={css.notice}>{t('noMembers')}</div>}
      {view !== null && teammates.length > 0 && (
        <ul className={css.members}>
          {teammates.map((member) => {
            const current = currentTaskOf(view, member.name)
            const settled = outcomes[member.name]
            return (
              <li key={member.id} className={css.member}>
                <div className={css.identity}>
                  <StateDot state={member.status === 'running' ? 'ongoing' : member.status === 'failed' ? 'error' : 'done'} />
                  {/* The name opens the teammate's own Session, the same call the
                      dialog's roster makes, so its full transcript is one click away. */}
                  <button
                    type="button"
                    className={css.name}
                    title={t('open')}
                    onClick={() => { void openTeammate(sessionId, member) }}
                  >
                    {member.name}
                  </button>
                  <small className={css.status}>{t(memberStatusKey(member.status))}</small>
                </div>
                <small className={css.label}>{t('currentTask')}</small>
                <p className={css.subject}>{current === undefined ? t('noCurrentTask') : current.subject}</p>
                <form className={css.steer} onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault()
                  void send(member.name)
                }}>
                  <input
                    className={css.input}
                    value={drafts[member.name] ?? ''}
                    placeholder={t('steerPlaceholder')}
                    aria-label={t('steerNamed', { name: member.name })}
                    disabled={pending.has(member.name)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const value = event.target.value
                      setDrafts(current => ({ ...current, [member.name]: value }))
                    }}
                  />
                  <button
                    type="submit"
                    className={css.send}
                    disabled={pending.has(member.name) || (drafts[member.name] ?? '').trim() === ''}
                  >
                    {t('steer')}
                  </button>
                </form>
                {settled !== undefined && <p className={css.outcome} role="status">{settled}</p>}
              </li>
            )
          })}
        </ul>
      )}
      {view !== null && (
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
      )}
    </section>
  )
}
