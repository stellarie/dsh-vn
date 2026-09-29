import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { install, Config } from '../src/index.ts'
import { assistant, collect, emits, fakeAgent, fakeSdk, init, request, requestCalls, success, textDelta, textOf, blockStart, messageStart, blockStop, user } from './support.ts'
import type { Script } from './support.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

const rows = [
  { value: 'sonnet', displayName: 'Sonnet', description: 'Fast', supportedEffortLevels: ['low', 'high'] },
  { value: 'haiku', displayName: 'Haiku', description: 'Small' },
] as const

const reply: Script = emits(
  init(),
  messageStart(),
  blockStart(0, { type: 'text', text: '' }),
  textDelta(0, 'pong'),
  blockStop(0),
  success(),
)

async function boot(sdk: ReturnType<typeof fakeSdk>, sessions: Record<string, ReturnType<typeof fakeAgent>> = {}) {
  const ctx = new Context()
  context = ctx
  await ctx.plugin(LlmRuntime)
  ctx.provide('agents', { get: (id: string) => sessions[id] } as never)
  install(ctx, Config({}), sdk.query)
  return ctx
}

describe('claude-code provider registration', () => {
  it('registers the route and lists Claude models with their efforts through the llm service', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk)
    expect(ctx.llm.listProviders()).toEqual([{ id: 'claude-code', name: 'Claude Code' }])
    expect((await ctx.llm.listModels('claude-code')).map(model => model.id)).toEqual(['sonnet', 'haiku'])
    const sonnet = await ctx.llm.resolveModelInfo('claude-code', 'sonnet')
    expect(sonnet.reasoning?.efforts.map(effort => effort.id)).toEqual(['low', 'high'])
    expect(ctx.llm.listConfigurableProviders()[0]).toMatchObject({ provider: 'claude-code' })
    expect(ctx.llm.listConfigurableProviders()[0]?.error).toBeUndefined()
  })

  it('discovers models without sending a prompt and closes the discovery query', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk)
    await ctx.llm.listModels('claude-code')
    await ctx.llm.listModels('claude-code')
    expect(sdk.calls).toHaveLength(1)
    const [call] = sdk.calls
    expect(call?.options).toMatchObject({ persistSession: false, tools: [] })
    expect(call?.closed).toBe(true)
  })

  it('keeps the provider usable and reports a configurable-provider diagnostic when discovery fails', async () => {
    const sdk = fakeSdk(reply, new Error('claude executable missing'))
    const ctx = await boot(sdk)
    const models = await ctx.llm.listModels('claude-code')
    expect(models.map(model => model.id)).toEqual(['opus', 'sonnet', 'haiku', 'claude-fable-5-1[1m]'])
    expect(ctx.llm.listConfigurableProviders()[0]?.error).toContain('claude executable missing')
  })

  it('streams a request through the llm service in the Session directory', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent('/work/session-dir') })
    const assembler = new BlockAssembler()
    const options: GenerateOptions = request([user('ping')])
    for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
    expect(assembler.blocks()).toEqual([{ type: 'text', text: 'pong' }])
    expect(assembler.finish).toEqual({ kind: 'stop' })
    expect(assembler.replayState).toEqual({ response: { claudeSessionId: 'claude-session-1', model: 'sonnet', turn: 1, stopped: true } })
    expect(requestCalls(sdk.calls)[0]?.options.cwd).toBe('/work/session-dir')
  })

  it('keeps feeding the same query on the next request because the llm service passes the envelope through', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent('/work/session-dir') })
    const first = user('ping')
    const assembler = new BlockAssembler()
    for await (const chunk of ctx.llm.stream(request([first]))) assembler.push(chunk)
    const answered = assistant('pong', 'claude-code', assembler.replayState)
    await collect(ctx.llm.stream(request([first, answered, user('again')])))
    const queries = requestCalls(sdk.calls)
    expect(queries).toHaveLength(1)
    expect(queries[0]?.userMessages.map(textOf)).toEqual(['ping', 'again'])
  })

  it('finishes with an error, and starts no query, when the Session has no live agent', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk)
    const chunks = await collect(ctx.llm.stream(request([user('ping')])))
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_NO_WORKSPACE' } } })
    expect(requestCalls(sdk.calls)).toHaveLength(0)
  })

  it('finishes with an error when the agent has no working directory', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent(null) })
    const chunks = await collect(ctx.llm.stream(request([user('ping')])))
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_NO_WORKSPACE' } } })
  })

  it('routes tool permission through the approval service mounted on the context', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent('/work/session-dir') })
    ctx.provide('approval', { request: () => Promise.resolve('rejected') } as never)
    await collect(ctx.llm.stream(request([user('ping')])))
    const result = await requestCalls(sdk.calls)[0]?.options.canUseTool?.(
      'Bash',
      { command: 'rm -rf /' },
      { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' },
    )
    expect(result).toMatchObject({ behavior: 'deny' })
  })

  it('reads durable images through the attachment service, or fails without one', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent('/work/session-dir') })
    const ref = { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 3, width: 1, height: 1 }
    const message = createUserMessage({
      content: [{ type: 'image', attachment: ref as never }],
      source: { kind: 'user' },
    })
    const withoutService = await collect(ctx.llm.stream(request([message])))
    expect(withoutService.at(-1)).toMatchObject({ reason: { kind: 'error' } })
    expect(JSON.stringify(withoutService.at(-1))).toContain('attachment service')

    const reads: unknown[] = []
    ctx.provide('attachments', {
      readImage: (read: unknown) => { reads.push(read); return Promise.resolve({ ref, data: new Uint8Array([1, 2, 3]) }) },
    } as never)
    await collect(ctx.llm.stream(request([message])))
    expect(reads).toEqual([ref])
    expect(JSON.stringify(requestCalls(sdk.calls).at(-1)?.userMessages)).toContain('"data":"AQID"')
  })

  it('applies the documented defaults when the config omits every field', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = new Context()
    context = ctx
    await ctx.plugin(LlmRuntime)
    ctx.provide('agents', { get: () => fakeAgent('/work/session-dir') } as never)
    install(ctx, {}, sdk.query)
    expect(ctx.llm.listProviders().map(provider => provider.id)).toEqual(['claude-code'])
    await collect(ctx.llm.stream(request([user('ping')])))
    const started = requestCalls(sdk.calls)[0]
    expect(started?.options).toMatchObject({ thinking: { type: 'adaptive', display: 'summarized' } })
    expect((started?.options.mcpServers?.dsh as { timeout: number } | undefined)).toBeUndefined()
  })

  it('fails a request that names no Session', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const ctx = await boot(sdk, { 's-1': fakeAgent('/work/session-dir') })
    const noSession = { provider: 'claude-code', model: 'sonnet', messages: [user('ping')] } as GenerateOptions
    const chunks = await collect(ctx.llm.stream(noSession))
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_NO_WORKSPACE' } } })
  })

  it('closes the live query when its agent is disposed and when the plugin unloads', async () => {
    const sdk = fakeSdk(reply, rows as never)
    const agent = { ...fakeAgent('/work/session-dir'), id: 's-1' } as never
    const ctx = await boot(sdk, { 's-1': agent })
    await collect(ctx.llm.stream(request([user('ping')])))
    const [call] = requestCalls(sdk.calls)
    expect(call?.closed).toBe(false)
    ctx.emit('agent/disposed', { agent })
    expect(call?.closed).toBe(true)

    await collect(ctx.llm.stream(request([user('ping again')])))
    const later = requestCalls(sdk.calls).at(-1)
    expect(later?.closed).toBe(false)
    await ctx.fiber.dispose()
    expect(later?.closed).toBe(true)
  })
})
