// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  SendTeamMessageResult,
  TeamTaskId, TeamTaskView as TeamTask, TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import {
  TeamAction, type TeamActionInjected, type TeamActionProps,
} from '../src/client/TeamAction.tsx'
import {
  PANE_POLL_MS, TeamSidebar, type TeamSidebarInjected, type TeamSidebarProps,
} from '../src/client/TeamSidebar.tsx'
import { currentTaskOf } from '../src/client/team-view.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const SESSION = 'lead' as SessionId
const TASK_1 = 'task-1' as TeamTaskId
const TASK_2 = 'task-2' as TeamTaskId
const TASK_3 = 'task-3' as TeamTaskId
const TASK_4 = 'task-4' as TeamTaskId

function task(overrides: Partial<TeamTask> = {}): TeamTask {
  return {
    id: TASK_1,
    revision: 1,
    subject: 'Ship the pane',
    description: 'Build the right-sidebar stack',
    status: 'in_progress',
    blockedBy: [],
    writeScopes: [],
    ready: false,
    writeScopeWarnings: [],
    ...overrides,
  }
}

const view: TeamView = {
  members: [
    { id: SESSION, name: 'lead', role: 'lead', status: 'running', diagnostics: [] },
    { id: 'worker-id' as SessionId, name: 'worker', role: 'teammate', status: 'running', diagnostics: [] },
    { id: 'helper-id' as SessionId, name: 'helper', role: 'teammate', status: 'idle', diagnostics: [] },
  ],
  tasks: [
    task({ id: TASK_1, ownerName: 'lead', subject: 'Lead work' }),
    task({ id: TASK_2, ownerName: 'worker', subject: 'Implement runtime' }),
    task({ id: TASK_3, ownerName: 'helper', subject: 'Queued work', status: 'pending', ready: true }),
  ],
}

function delivered(status: SendTeamMessageResult['status'] = 'accepted'): { ok: true; value: SendTeamMessageResult } {
  return { ok: true, value: { messageId: 'team-message-1' as SendTeamMessageResult['messageId'], status } }
}

function remoteFailure(message: string): { ok: false; error: RemoteError<'gateway/internal'> } {
  return { ok: false, error: new RemoteError('gateway/internal', message, {}) }
}

function actions(overrides: Partial<TeamSidebarInjected> = {}): TeamSidebarInjected {
  return {
    load: () => Promise.resolve({ ok: true, value: view }),
    steer: () => Promise.resolve(delivered()),
    openTeammate: () => Promise.resolve(),
    createTask: () => Promise.resolve({
      ok: true,
      value: { ok: true, value: task({ id: TASK_4, subject: 'Created from the pane' }) },
    }),
    updateTask: () => Promise.resolve({
      ok: true,
      value: { ok: true, value: task({ id: TASK_2, revision: 2 }) },
    }),
    ...overrides,
  }
}

function props(injected: TeamSidebarInjected, sessionId: SessionId = SESSION): TeamSidebarProps {
  return {
    sessionId,
    ...injected,
    t: makeTranslate(zh, commonZh),
  } as unknown as TeamSidebarProps
}

/** Minimal header-action props, so one mutation can be driven from both surfaces. */
function dialogProps(updateTask: TeamActionInjected['updateTask']): TeamActionProps {
  return {
    sessionId: SESSION,
    load: () => Promise.resolve({ ok: true, value: view }),
    createTask: () => Promise.resolve({ ok: true, value: { ok: true, value: task() } }),
    updateTask,
    openTeammate: () => Promise.resolve(),
    openStack: () => {},
    t: makeTranslate(zh, commonZh),
  } as unknown as TeamActionProps
}

function row(name: string): HTMLElement {
  const found = screen.getAllByRole('listitem').find(candidate => within(candidate).queryByText(name) !== null)
  if (found === undefined) throw new Error(`no roster row for ${name}`)
  return found
}

describe('currentTaskOf', () => {
  it('selects the in_progress task owned by the named member', () => {
    expect(currentTaskOf(view, 'worker')?.subject).toBe('Implement runtime')
  })

  it('ignores work the member has not started and work owned by another member', () => {
    expect(currentTaskOf(view, 'helper')).toBeUndefined()
    expect(currentTaskOf(view, 'nobody')).toBeUndefined()
    expect(currentTaskOf(view, 'lead')?.subject).toBe('Lead work')
  })
})

describe('TeamSidebar', () => {
  it('lists one row per teammate with the task that member is working on', async () => {
    render(<TeamSidebar {...props(actions())} />)

    // The board carries the task too, so the wait accepts every occurrence.
    expect(await screen.findAllByText('Implement runtime')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(within(row('worker')).getByText('Implement runtime')).toBeTruthy()
    expect(within(row('helper')).getByText(zh.noCurrentTask)).toBeTruthy()
    // The lead owns work on the board, but only teammates get a stack row.
    expect(screen.getAllByRole('listitem').some(candidate => within(candidate).queryByText('lead') !== null)).toBe(false)
  })

  it('carries the shared task board with its owner control', async () => {
    const updateTask = vi.fn(() => Promise.resolve({
      ok: true as const,
      value: { ok: true as const, value: task({ id: TASK_2, revision: 2, ownerName: 'helper' }) },
    }))
    render(<TeamSidebar {...props(actions({ updateTask }))} />)
    await screen.findAllByText('Implement runtime')

    expect(screen.getByRole('heading', { name: zh.tasks })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(zh.create, 'u') })).toBeTruthy()
    const owner = screen.getAllByRole('combobox')[0] as HTMLSelectElement
    fireEvent.change(owner, { target: { value: 'helper' } })

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(SESSION, {
        taskId: TASK_1,
        expectedRevision: 1,
        action: 'reassign',
        owner: 'helper',
      })
    })
  })

  it('sends the same completion request from the pane and from the dialog', async () => {
    const updateTask = vi.fn<TeamActionInjected['updateTask']>(() => Promise.resolve({
      ok: true,
      value: { ok: true, value: task({ revision: 2, status: 'completed' }) },
    }))

    const pane = render(<TeamSidebar {...props(actions({ updateTask }))} />)
    await screen.findAllByText('Implement runtime')
    fireEvent.click(screen.getAllByRole('button', { name: zh.complete })[0]!)
    await waitFor(() => { expect(updateTask).toHaveBeenCalledTimes(1) })
    pane.unmount()

    render(<TeamAction {...dialogProps(updateTask)} />)
    fireEvent.click(screen.getByRole('button', { name: /Agent Team/u }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getAllByRole('button', { name: zh.complete })[0]!)
    await waitFor(() => { expect(updateTask).toHaveBeenCalledTimes(2) })

    const [fromPane, fromDialog] = vi.mocked(updateTask).mock.calls
    expect(fromDialog![1]).toEqual(fromPane![1])
  })

  it('creates a shared task from the pane', async () => {
    const createTask = vi.fn(() => Promise.resolve({
      ok: true as const,
      value: { ok: true as const, value: task({ id: TASK_4, subject: 'Created from the pane' }) },
    }))
    const load = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: view })
      .mockResolvedValue({
        ok: true,
        value: { ...view, tasks: [...view.tasks, task({ id: TASK_4, subject: 'Created from the pane' })] },
      })
    render(<TeamSidebar {...props(actions({ load, createTask }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.click(screen.getByRole('button', { name: new RegExp(zh.create, 'u') }))
    fireEvent.change(screen.getByPlaceholderText(zh.subject), { target: { value: ' Created from the pane ' } })
    fireEvent.change(screen.getByPlaceholderText(zh.description), { target: { value: ' Details ' } })
    fireEvent.click(screen.getByRole('button', { name: zh.save }))

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(SESSION, {
        subject: 'Created from the pane',
        description: 'Details',
        blockedBy: [],
        writeScopes: [],
      })
    })
    // The mutation reloads the pane's view instead of waiting for the next poll.
    await waitFor(() => { expect(load).toHaveBeenCalledTimes(2) })
  })

  it('sends one steering line only to the teammate whose box was submitted', async () => {
    const steer = vi.fn(() => Promise.resolve(delivered()))
    render(<TeamSidebar {...props(actions({ steer }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.change(within(row('worker')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: '  Ship the pane today  ' },
    })
    fireEvent.click(within(row('worker')).getByRole('button', { name: zh.steer }))

    await waitFor(() => {
      expect(steer).toHaveBeenCalledWith(SESSION, { target: 'worker', text: 'Ship the pane today' })
    })
    expect(steer).toHaveBeenCalledTimes(1)
    expect(await within(row('worker')).findByText(zh.steerAccepted)).toBeTruthy()
    expect(within(row('worker')).getByPlaceholderText<HTMLInputElement>(zh.steerPlaceholder).value).toBe('')
  })

  it('opens a teammate transcript when the row name is clicked', async () => {
    const openTeammate = vi.fn(() => Promise.resolve())
    render(<TeamSidebar {...props(actions({ openTeammate }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.click(within(row('worker')).getByRole('button', { name: 'worker' }))

    await waitFor(() => {
      expect(openTeammate).toHaveBeenCalledWith(SESSION, expect.objectContaining({ name: 'worker', id: 'worker-id' }))
    })
    expect(openTeammate).toHaveBeenCalledTimes(1)
  })

  it('reports a queued delivery with the mailbox vocabulary', async () => {
    render(<TeamSidebar {...props(actions({ steer: () => Promise.resolve(delivered('queued')) }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.change(within(row('helper')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: 'take the queued task' },
    })
    fireEvent.click(within(row('helper')).getByRole('button', { name: zh.steer }))

    expect(await within(row('helper')).findByText(zh.steerQueued)).toBeTruthy()
  })

  it('disables the send control until the box holds text', async () => {
    render(<TeamSidebar {...props(actions())} />)
    await screen.findAllByText('Implement runtime')

    const send = within(row('worker')).getByRole<HTMLButtonElement>('button', { name: zh.steer })
    expect(send.disabled).toBe(true)
    fireEvent.change(within(row('worker')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: 'go' },
    })
    expect(send.disabled).toBe(false)
  })

  it('shows a steering failure without clearing the drafted line', async () => {
    const steer = vi.fn<TeamSidebarInjected['steer']>(() => Promise.resolve(remoteFailure('mailbox full')))
    render(<TeamSidebar {...props(actions({ steer }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.change(within(row('worker')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: 'retry me' },
    })
    fireEvent.click(within(row('worker')).getByRole('button', { name: zh.steer }))

    expect(await screen.findByText('mailbox full (gateway/internal)')).toBeTruthy()
    expect(within(row('worker')).getByPlaceholderText<HTMLInputElement>(zh.steerPlaceholder).value).toBe('retry me')
  })

  it('does not publish a steering outcome after the session switches', async () => {
    const pending = Promise.withResolvers<{ ok: true; value: SendTeamMessageResult }>()
    const rendered = render(<TeamSidebar {...props(actions({ steer: () => pending.promise }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.change(within(row('worker')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: 'late line' },
    })
    fireEvent.click(within(row('worker')).getByRole('button', { name: zh.steer }))
    rendered.rerender(<TeamSidebar {...props(actions(), 'next-lead' as SessionId)} />)
    pending.resolve(delivered())
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.queryByText(zh.steerAccepted)).toBeNull()
  })

  it('reloads the board from the refresh control and shows a load failure', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: view })
      .mockResolvedValueOnce(remoteFailure('team offline'))
    render(<TeamSidebar {...props(actions({ load }))} />)
    await screen.findAllByText('Implement runtime')

    fireEvent.click(screen.getByRole('button', { name: zh.refresh }))
    expect(await screen.findByText('team offline (gateway/internal)')).toBeTruthy()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reports an empty roster instead of an empty list', async () => {
    const leadOnly: TeamView = { members: [view.members[0]!], tasks: [task({ ownerName: 'lead' })] }
    render(<TeamSidebar {...props(actions({ load: () => Promise.resolve({ ok: true, value: leadOnly }) }))} />)

    expect(await screen.findByText(zh.noMembers)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toEqual([])
  })

  it('ignores a load that settles after the session switches', async () => {
    const first = Promise.withResolvers<{ ok: true; value: TeamView }>()
    const load = vi.fn((sessionId: SessionId) => sessionId === SESSION
      ? first.promise
      : Promise.resolve({ ok: true as const, value: { members: [], tasks: [] } }))
    const rendered = render(<TeamSidebar {...props(actions({ load }))} />)

    rendered.rerender(<TeamSidebar {...props(actions({ load }), 'next-lead' as SessionId)} />)
    first.resolve({ ok: true, value: view })
    await Promise.resolve()
    await Promise.resolve()

    expect(screen.queryByText('Implement runtime')).toBeNull()
    expect(await screen.findByText(zh.noMembers)).toBeTruthy()
  })

  it('re-reads the Team view on its own and updates a rendered row', async () => {
    vi.useFakeTimers()
    const moved: TeamView = {
      ...view,
      members: view.members.map(member => member.name === 'worker' ? { ...member, status: 'idle' as const } : member),
      tasks: view.tasks.map(candidate => candidate.id === TASK_2
        ? { ...candidate, subject: 'Review the pane' }
        : candidate),
    }
    const load = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: view })
      .mockResolvedValue({ ok: true, value: moved })
    render(<TeamSidebar {...props(actions({ load }))} />)
    await act(async () => { await Promise.resolve() })

    expect(within(row('worker')).getByText('Implement runtime')).toBeTruthy()
    await act(async () => { await vi.advanceTimersByTimeAsync(PANE_POLL_MS) })

    expect(load).toHaveBeenCalledTimes(2)
    expect(within(row('worker')).getByText('Review the pane')).toBeTruthy()
    expect(within(row('worker')).getByText(zh['memberStatus.idle'])).toBeTruthy()
  })

  it('keeps the last good rows when a poll fails and surfaces the failure', async () => {
    vi.useFakeTimers()
    const load = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: view })
      .mockResolvedValue(remoteFailure('team offline'))
    render(<TeamSidebar {...props(actions({ load }))} />)
    await act(async () => { await Promise.resolve() })
    expect(within(row('worker')).getByText('Implement runtime')).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(PANE_POLL_MS) })

    expect(screen.getByText('team offline (gateway/internal)')).toBeTruthy()
    expect(within(row('worker')).getByText('Implement runtime')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    // The board survives the failed poll too.
    expect(screen.getByRole('heading', { name: zh.tasks })).toBeTruthy()
  })

  it('re-reads the view straight after a steering send', async () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: view }))
    render(<TeamSidebar {...props(actions({ load }))} />)
    await screen.findAllByText('Implement runtime')
    expect(load).toHaveBeenCalledTimes(1)

    fireEvent.change(within(row('worker')).getByPlaceholderText(zh.steerPlaceholder), {
      target: { value: 'go' },
    })
    fireEvent.click(within(row('worker')).getByRole('button', { name: zh.steer }))

    await waitFor(() => { expect(load).toHaveBeenCalledTimes(2) })
  })
})
