import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { TeamMemberView as TeamRosterMember, TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import { RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { TeamAction, type TeamActionInjected } from '../src/client/TeamAction.tsx'
import { TeamSidebar, type TeamSidebarInjected } from '../src/client/TeamSidebar.tsx'
import { inject, mountAgentTeamUi } from '../src/client/mount.ts'
import { apply as nodeApply } from '../src/index.ts'

const SESSION = 'team-session' as SessionId
const CHILD = 'team-child' as SessionId
const TASK_ID = 'task-1' as TeamTaskId
const TAB_ID = '@deepseek-ai/dsh-experimental-client-ui-agent-team'
const TAB_KIND = 'agent-team'
const REMOTE: TypertRemoteContribution = {
  package: '@deepseek-ai/dsh-experimental-agent-team',
  descriptors: [],
}

async function bench(options: {
  addressed?: boolean
  conflict?: boolean
  registrationFailure?: boolean
  remoteFailure?: 'view' | 'update'
  refreshGate?: Promise<void>
} = {}) {
  const ctx = new Context()
  const calls: { method: string; args: unknown[] }[] = []
  const answer = <T>(method: string, value: T) => (...args: unknown[]) => {
    calls.push({ method, args })
    return Promise.resolve({ ok: true as const, value })
  }
  const task = {
    id: 'task-1',
    revision: 1, subject: 'Task', description: 'Description', status: 'pending' as const,
    blockedBy: [], writeScopes: [], ready: true, writeScopeWarnings: [],
  }
  class RemoteService extends Service {
    readonly disposeMount = vi.fn(() => Promise.resolve())
    readonly mount = vi.fn((_contribution: unknown) => Promise.resolve(this.disposeMount))

    constructor(serviceCtx: Context) {
      super(serviceCtx, 'remote')
    }

    $mount(contribution: unknown): Promise<() => Promise<void>> {
      return this.mount(contribution)
    }
  }
  const remote = new RemoteService(ctx)
  const failure = {
    ok: false as const,
    error: new RemoteError('gateway/internal', 'offline', {}),
  }
  const view = {
    members: [{
      id: SESSION, name: 'lead', role: 'lead' as const, status: 'idle' as const, diagnostics: [],
    }], tasks: [task],
  }
  ctx.provide('remote.agentTeams', {
    view: (...args: unknown[]) => {
      calls.push({ method: 'agentTeams/view', args })
      return Promise.resolve(options.remoteFailure === 'view'
        ? failure
        : { ok: true as const, value: view })
    },
    createTask: answer('agentTeams/createTask', task),
    sendMessage: answer('agentTeams/sendMessage', {
      messageId: 'team-message-1',
      status: 'accepted' as const,
    }),
    updateTask: (...args: unknown[]) => {
      calls.push({ method: 'agentTeams/updateTask', args })
      if (options.remoteFailure === 'update') return Promise.resolve(failure)
      return Promise.resolve(options.conflict
        ? {
          ok: true as const,
          value: {
            ok: false as const,
            error: {
              code: 'team-task-conflict' as const,
              message: 'stale',
            },
          },
        }
        : { ok: true as const, value: { ok: true as const, value: { ...task, revision: 2 } } })
    },
  })
  const navigation: unknown[] = []
  let mainSessionId = options.addressed === true ? CHILD : SESSION
  ctx.provide('sessions', {
    binding: (id: SessionId) => options.addressed === true && id === CHILD
      ? { session: { getSnapshot: () => ({
        subagent: {
          address: {
            parentSessionId: SESSION,
            childSessionId: CHILD,
            mode: 'continuable' as const,
          },
        },
      }) } }
      : undefined,
    refreshSubagents: (id: SessionId) => {
      navigation.push(['refresh', id])
      return options.refreshGate ?? Promise.resolve()
    },
    retainInfo: (id: SessionId) => ({
      getSnapshot: () => ({
        referenceCount: id === mainSessionId ? 1 : 0,
        retainedBy: id === mainSessionId ? { mainView: 1 } : {},
      }),
      subscribe: () => () => {},
    }),
  })
  ctx.provide('uiWorkspace', {
    openSession: (target: unknown) => { navigation.push(['open', target]) },
  } as never)
  ctx.provide('conversation', {})
  ctx.provide('locale', new LocaleRuntime(ctx))
  const removeType = vi.fn()
  const registerType = vi.fn((_definition: { id: string; kind: string; title: (address: string) => string }) => removeType)
  const openTab = vi.fn()
  ctx.provide('sidebarRightTabs', { register: registerType })
  ctx.provide('sidebarRight', { openTab })
  await ctx.plugin(SlotRegistry).await()
  const collapseHeader = ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.actions': { kind: 'list', scope: 'session' },
      'sidebar.right.pane.tab': { kind: 'keyed', scope: 'session' },
    },
  } as never, () => null)
  if (options.registrationFailure === true) {
    vi.spyOn(ctx.slots, 'inject').mockImplementationOnce(() => { throw new Error('slot registration failed') })
  }
  const fiber = options.registrationFailure === true
    ? ctx.plugin({ apply() {} })
    : ctx.plugin({ inject: [...inject], apply: clientCtx => mountAgentTeamUi(clientCtx, REMOTE) })
  const activation: Promise<unknown> = options.registrationFailure === true
    ? mountAgentTeamUi(ctx, REMOTE).catch((error: unknown) => error)
    : fiber.await()
  if (options.registrationFailure !== true) {
    await activation
  } else {
    await fiber.await()
  }
  const entry = () => ctx.slots.entries('conversation.session.header.actions')
    .find(candidate => candidate.component === TeamAction)
  const body = () => ctx.slots.entries('sidebar.right.pane.tab')
    .find(candidate => candidate.component === TeamSidebar)
  return {
    ctx,
    fiber,
    activation,
    calls,
    navigation,
    remote,
    entry,
    body,
    collapseHeader,
    registerType,
    removeType,
    openTab,
    select: (sessionId: SessionId) => { mainSessionId = sessionId },
  }
}

describe('ui-team browser plugin', () => {
  it('registers one disposable header action with RPC-backed task operations', async () => {
    const b = await bench()
    expect(inject).toEqual([
      'sessions', 'uiWorkspace', 'remote', 'slots', 'locale', 'sidebarRight', 'sidebarRightTabs',
    ])
    expect(b.entry()).toMatchObject({
      options: { id: 'agent-team', order: 20 },
      locale: 'agent-team',
    })
    expect(b.remote.mount).toHaveBeenCalledOnce()
    expect(b.remote.mount).toHaveBeenCalledWith(REMOTE)
    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    expect((await actions.load(SESSION)).ok).toBe(true)
    expect((await actions.createTask(SESSION, {
      subject: 'Task', description: 'Description', blockedBy: [], writeScopes: [],
    })).ok).toBe(true)
    expect((await actions.updateTask(SESSION, {
      taskId: TASK_ID, expectedRevision: 1, action: 'complete',
    })).ok).toBe(true)
    expect((await actions.updateTask(SESSION, {
      taskId: TASK_ID, expectedRevision: 2, action: 'reassign', owner: 'worker',
    })).ok).toBe(true)
    expect(b.calls.map(call => call.method)).toEqual([
      'agentTeams/view', 'agentTeams/createTask', 'agentTeams/updateTask', 'agentTeams/updateTask',
    ])
    expect(b.calls.at(-1)?.args[1]).toMatchObject({ owner: 'worker' })

    await actions.openTeammate(SESSION, {
      id: SESSION,
      name: 'lead',
      role: 'lead',
      status: 'idle',
      diagnostics: [],
    })
    expect(b.navigation).toEqual([])

    await b.fiber.dispose()
    expect(b.entry()).toBeUndefined()
    expect(b.remote.disposeMount).toHaveBeenCalledOnce()
  })

  it('registers one right-sidebar tab type and its body, and disposes both', async () => {
    const b = await bench()

    expect(b.registerType).toHaveBeenCalledOnce()
    const definition = b.registerType.mock.calls[0]![0]
    expect(definition).toMatchObject({ id: TAB_ID, kind: TAB_KIND, priority: 'builtin' })
    expect(definition.title('sidebar://agent-team')).toBe('Agent Team')

    const body = b.body()
    expect(body).toMatchObject({
      options: { key: TAB_ID },
      locale: 'agent-team',
    })

    const injected = (body!.inject as unknown as () => TeamSidebarInjected)()
    expect((await injected.load(SESSION)).ok).toBe(true)
    expect((await injected.steer(SESSION, { target: 'worker', text: 'polish the pane' })).ok).toBe(true)
    expect((await injected.createTask(SESSION, {
      subject: 'Pane task', description: 'Created from the pane', blockedBy: [], writeScopes: [],
    })).ok).toBe(true)
    expect((await injected.updateTask(SESSION, {
      taskId: TASK_ID, expectedRevision: 1, action: 'reassign', owner: 'worker',
    })).ok).toBe(true)
    expect(b.calls.map(call => call.method)).toEqual([
      'agentTeams/view', 'agentTeams/sendMessage', 'agentTeams/createTask', 'agentTeams/updateTask',
    ])
    expect(b.calls.at(-1)?.args[1]).toMatchObject({ owner: 'worker' })

    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    actions.openStack()
    expect(b.openTab).toHaveBeenCalledWith(TAB_KIND)

    await b.fiber.dispose()
    expect(b.body()).toBeUndefined()
    expect(b.removeType).toHaveBeenCalledOnce()
  })

  it('steers through the Lead session when the stack is mounted in an addressed child', async () => {
    const b = await bench({ addressed: true })
    const injected = (b.body()!.inject as unknown as () => TeamSidebarInjected)()
    await injected.steer(CHILD, { target: 'worker', text: 'keep going' })
    expect(b.calls).toEqual([
      { method: 'agentTeams/sendMessage', args: [SESSION, { target: 'worker', text: 'keep going' }] },
    ])
  })

  it('unmounts the Remote contribution when later Client registration fails', async () => {
    const b = await bench({ registrationFailure: true })
    await expect(b.activation).resolves.toMatchObject({ message: 'slot registration failed' })
    expect(b.remote.mount).toHaveBeenCalledOnce()
    expect(b.remote.disposeMount).toHaveBeenCalledOnce()
  })

  it('returns the generated task business result without a Client transport wrapper', async () => {
    const b = await bench({ conflict: true })
    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    await expect(actions.updateTask(SESSION, {
      taskId: TASK_ID, expectedRevision: 1, action: 'delete',
    })).resolves.toEqual({
      ok: true,
      value: {
        ok: false,
        error: { code: 'team-task-conflict', message: 'stale' },
      },
    })
  })

  it('returns Remote carrier failures unchanged', async () => {
    const view = await bench({ remoteFailure: 'view' })
    const viewActions = (view.entry()!.inject as unknown as () => TeamActionInjected)()
    await expect(viewActions.load(SESSION)).resolves.toMatchObject({
      ok: false,
      error: { code: 'gateway/internal', message: 'offline' },
    })

    const update = await bench({ remoteFailure: 'update' })
    const updateActions = (update.entry()!.inject as unknown as () => TeamActionInjected)()
    await expect(updateActions.updateTask(SESSION, {
      taskId: TASK_ID, expectedRevision: 1, action: 'delete',
    })).resolves.toMatchObject({
      ok: false,
      error: { code: 'gateway/internal', message: 'offline' },
    })
  })

  it('refreshes the descriptor catalog before opening a continuable teammate address', async () => {
    const b = await bench()
    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    const member: TeamRosterMember = {
      id: CHILD,
      name: 'worker',
      role: 'teammate',
      status: 'inactive',
      diagnostics: [],
    }
    await actions.openTeammate(SESSION, member)
    expect(b.navigation).toEqual([
      ['refresh', SESSION],
      ['open', {
        parentSessionId: SESSION,
        childSessionId: CHILD,
        mode: 'continuable',
      }],
    ])
  })

  it('routes Team actions from an addressed teammate conversation back through its Lead', async () => {
    const b = await bench({ addressed: true })
    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    await actions.load(CHILD)
    await actions.openTeammate(CHILD, {
      id: CHILD,
      name: 'worker',
      role: 'teammate',
      status: 'inactive',
      diagnostics: [],
    })
    expect(b.calls[0]).toEqual({ method: 'agentTeams/view', args: [SESSION] })
    expect(b.navigation).toEqual([
      ['refresh', SESSION],
      ['open', {
        parentSessionId: SESSION,
        childSessionId: CHILD,
        mode: 'continuable',
      }],
    ])
  })

  it('does not open a teammate after navigation switches during catalog refresh', async () => {
    const refresh = Promise.withResolvers<undefined>()
    const b = await bench({ refreshGate: refresh.promise })
    const actions = (b.entry()!.inject as unknown as () => TeamActionInjected)()
    const opening = actions.openTeammate(SESSION, {
      id: CHILD,
      name: 'worker',
      role: 'teammate',
      status: 'inactive',
      diagnostics: [],
    })
    expect(b.navigation).toEqual([['refresh', SESSION]])
    b.select('other-session' as SessionId)
    refresh.resolve(undefined)
    await opening
    expect(b.navigation).toEqual([['refresh', SESSION]])
  })

  it('re-registers after the conversation header slot is collapsed and declared again', async () => {
    const b = await bench()
    expect(b.entry()).toBeDefined()
    b.collapseHeader()
    expect(b.entry()).toBeUndefined()
    b.ctx.slots.register({
      name: 'root',
      children: { 'conversation.session.header.actions': { kind: 'list', scope: 'session' } },
    } as never, () => null)
    await Promise.resolve()
    expect(b.entry()).toBeDefined()
  })

  it('keeps the node half inert', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
