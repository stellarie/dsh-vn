/**
 * The shared task board: the create form, the task list, and every
 * compare-and-set action one task offers.
 *
 * Both Team surfaces render this one component, so a task action cannot drift
 * between the header dialog and the right-Sidebar stack. The board owns its
 * drafts and its pending-task bookkeeping; the surface that renders it supplies
 * the view on screen and the three view-lifecycle operations a settled mutation
 * cooperates with.
 */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  TeamTaskId,
  TeamTaskView as TeamTask,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import {
  IconCheckOutline14, IconEditOutline16, IconPlusOutline16, IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import type {
  TeamTaskActionResult, TeamTaskCreateInput, TeamTaskUpdateInput,
} from './team-remote.ts'
import { failureText, statusKey } from './team-view.ts'
import css from './TeamTaskBoard.module.css'

/** The view lifecycle a task mutation cooperates with, owned by the rendering surface. */
export interface TeamBoardFeedback {
  /** Cancel an in-flight view reload before a mutation starts. */
  readonly invalidate: () => void
  /** Reload the view after a settled mutation; `true` when a new view was published. */
  readonly reload: () => Promise<boolean>
  /** Publish one failure line, or clear it with null. */
  readonly fail: (message: string | null) => void
}

/** Full props of the shared task board. */
export type TeamTaskBoardProps = {
  readonly sessionId: SessionId
  /** The current roster and task board this surface displays. */
  readonly view: TeamView
  readonly createTask: (sessionId: SessionId, input: TeamTaskCreateInput) => Promise<TeamTaskActionResult>
  readonly updateTask: (sessionId: SessionId, input: TeamTaskUpdateInput) => Promise<TeamTaskActionResult>
  readonly t: PropsLocale<typeof NS>['t']
} & TeamBoardFeedback

interface Draft {
  subject: string
  description: string
  blockers: string
  scopes: string
}

const EMPTY_DRAFT: Draft = { subject: '', description: '', blockers: '', scopes: '' }

function items(value: string): string[] {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

function taskIds(value: string): TeamTaskId[] {
  return items(value) as TeamTaskId[]
}

/** Render the shared task board and its compare-and-set actions. */
export function TeamTaskBoard({
  sessionId, view, createTask, updateTask, invalidate, reload, fail, t,
}: TeamTaskBoardProps) {
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editing, setEditing] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pendingTasks, setPendingTasks] = useState<ReadonlySet<string>>(() => new Set())
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  useEffect(() => {
    setCreating(false)
    setCreateDraft(EMPTY_DRAFT)
    setEditing(null)
    setEditDraft(EMPTY_DRAFT)
    setPendingTasks(new Set())
  }, [sessionId])

  const settleTask = useCallback(async (
    taskId: string,
    operation: () => Promise<TeamTaskActionResult>,
  ): Promise<TeamTask | undefined> => {
    const requestedSession = sessionId
    invalidate()
    setPendingTasks(current => new Set(current).add(taskId))
    try {
      const result = await operation()
      if (sessionRef.current !== requestedSession) return undefined
      if (!result.ok) {
        fail(failureText(result.error))
        return undefined
      }
      if (!result.value.ok) {
        if (result.value.error.code === 'team-task-conflict') {
          const reloaded = await reload()
          if (sessionRef.current !== requestedSession) return undefined
          if (reloaded) fail(t('conflict'))
        } else {
          fail(failureText(result.value.error))
        }
        return undefined
      }
      const task = result.value.value
      fail(null)
      await reload()
      if (sessionRef.current !== requestedSession) return undefined
      return task
    } finally {
      if (sessionRef.current === requestedSession) {
        setPendingTasks((current) => {
          const next = new Set(current)
          next.delete(taskId)
          return next
        })
      }
    }
  }, [fail, invalidate, reload, sessionId, t])

  const submitCreate = async (): Promise<void> => {
    const subject = createDraft.subject.trim()
    const description = createDraft.description.trim()
    /* v8 ignore next -- TaskForm disables Save while either normalized field is empty. */
    if (subject === '' || description === '') return
    const created = await settleTask('create', () => createTask(sessionId, {
      subject,
      description,
      blockedBy: taskIds(createDraft.blockers),
      writeScopes: items(createDraft.scopes),
    }))
    if (created === undefined) return
    setCreateDraft(EMPTY_DRAFT)
    setCreating(false)
  }

  const startEdit = (task: TeamTask): void => {
    setEditing(task.id)
    setEditDraft({
      subject: task.subject,
      description: task.description,
      blockers: task.blockedBy.join(', '),
      scopes: task.writeScopes.join(', '),
    })
  }

  const submitEdit = async (task: TeamTask): Promise<void> => {
    const requestedSession = sessionId
    const edited = await settleTask(task.id, () => updateTask(requestedSession, {
      taskId: task.id,
      expectedRevision: task.revision,
      action: 'edit',
      subject: editDraft.subject.trim(),
      description: editDraft.description.trim(),
      writeScopes: items(editDraft.scopes),
    }))
    if (edited === undefined) return
    const blockedBy = taskIds(editDraft.blockers)
    if (blockedBy.length === edited.blockedBy.length
      && blockedBy.every((blocker, index) => blocker === edited.blockedBy[index])) {
      setEditing(null)
      return
    }
    const dependencyTask = await settleTask(task.id, () => updateTask(requestedSession, {
      taskId: task.id,
      expectedRevision: edited.revision,
      action: 'set_dependencies',
      blockedBy,
    }))
    if (dependencyTask === undefined) return
    setEditing(null)
  }

  const assignable = view.members.filter(member => member.status !== 'failed' && member.status !== 'provisioning')

  return (
    <section>
      <div className={css.sectionTitle}>
        <h3>{t('tasks')}</h3>
        <button type="button" className={css.smallButton} onClick={() => { setCreating(true) }}>
          <IconPlusOutline16 size={13} /> {t('create')}
        </button>
      </div>
      {creating && (
        <TaskForm
          draft={createDraft}
          setDraft={setCreateDraft}
          pending={pendingTasks.has('create')}
          onSave={() => { void submitCreate() }}
          onCancel={() => { setCreating(false) }}
          t={t}
        />
      )}
      {view.tasks.length === 0 && !creating && <div className={css.notice}>{t('empty')}</div>}
      <div className={css.tasks}>
        {view.tasks.map(task => editing === task.id
          ? (
            <TaskForm
              key={task.id}
              draft={editDraft}
              setDraft={setEditDraft}
              pending={pendingTasks.has(task.id)}
              onSave={() => { void submitEdit(task) }}
              onCancel={() => { setEditing(null) }}
              t={t}
            />
          )
          : (
            <article key={task.id} className={css.task}>
              <div className={css.taskTitle}>
                <strong>{task.subject}</strong>
                <span>{t(statusKey(task.status))}</span>
              </div>
              <p>{task.description}</p>
              <div className={css.meta}>
                <span>{task.id}</span>
                {task.status === 'pending' && <span>{task.ready ? t('ready') : t('blocked')}</span>}
                {task.blockedBy.length > 0 && <span>{t('blockedBy')}: {task.blockedBy.join(', ')}</span>}
                {task.writeScopes.length > 0 && <span>{t('writeScopes')}: {task.writeScopes.join(', ')}</span>}
                {task.writeScopeWarnings.map(warning => <span key={warning} className={css.warning}>{warning}</span>)}
              </div>
              <div className={css.taskActions}>
                <label>
                  {t('owner')}
                  <select
                    value={task.ownerName ?? ''}
                    disabled={pendingTasks.has(task.id) || task.status === 'completed'}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const owner = event.target.value
                      void settleTask(task.id, () => updateTask(sessionId, {
                        taskId: task.id,
                        expectedRevision: task.revision,
                        action: 'reassign',
                        ...owner === '' ? {} : { owner },
                      }))
                    }}
                  >
                    <option value="">{t('unowned')}</option>
                    {assignable.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => { startEdit(task) }} disabled={pendingTasks.has(task.id)}>
                  <IconEditOutline16 size={13} /> {t('edit')}
                </button>
                {task.status === 'in_progress' && (
                  <button type="button" disabled={pendingTasks.has(task.id)} onClick={() => {
                    void settleTask(task.id, () => updateTask(sessionId, {
                      taskId: task.id, expectedRevision: task.revision, action: 'complete',
                    }))
                  }}><IconCheckOutline14 /> {t('complete')}</button>
                )}
                {task.status === 'completed' && (
                  <button type="button" disabled={pendingTasks.has(task.id)} onClick={() => {
                    void settleTask(task.id, () => updateTask(sessionId, {
                      taskId: task.id, expectedRevision: task.revision, action: 'reopen',
                    }))
                  }}>{t('reopen')}</button>
                )}
                <button type="button" disabled={pendingTasks.has(task.id)} onClick={() => {
                  void settleTask(task.id, () => updateTask(sessionId, {
                    taskId: task.id, expectedRevision: task.revision, action: 'delete',
                  }))
                }}><IconTrashOutline16 size={13} /> {t('delete')}</button>
              </div>
            </article>
          ))}
      </div>
    </section>
  )
}

interface TaskFormProps {
  draft: Draft
  setDraft: (draft: Draft) => void
  pending: boolean
  onSave: () => void
  onCancel: () => void
  t: PropsLocale<typeof NS>['t']
}

function TaskForm({ draft, setDraft, pending, onSave, onCancel, t }: TaskFormProps) {
  const field = (key: keyof Draft, value: string): void => { setDraft({ ...draft, [key]: value }) }
  return (
    <div className={css.form}>
      <input value={draft.subject} placeholder={t('subject')} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('subject', event.target.value) }} />
      <textarea value={draft.description} placeholder={t('description')} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { field('description', event.target.value) }} />
      <input value={draft.blockers} placeholder={t('blockers')} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('blockers', event.target.value) }} />
      <input value={draft.scopes} placeholder={t('scopes')} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('scopes', event.target.value) }} />
      <div className={css.formActions}>
        <button type="button" disabled={pending || draft.subject.trim() === '' || draft.description.trim() === ''} onClick={onSave}>{t('save')}</button>
        <button type="button" disabled={pending} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  )
}
