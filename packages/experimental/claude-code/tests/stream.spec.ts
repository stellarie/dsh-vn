import { describe, expect, it } from 'vitest'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { BlockAssembler, createToolResultMessage, createUserMessage, LlmError, ReasoningEffortId, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { streamClaudeCode } from '../src/stream.ts'
import {
  assistant, assistantCalling, blockDelta, blockStart, blockStop, collect, dependencies, emits, fakeAgent, fakeSdk, init,
  messageDelta, messageStart, replayOf, request, requestCalls, success, textDelta, textOf, thinkingDelta, toolResult, toolUse, until,
  user, weatherTool,
} from './support.ts'
import type { Script } from './support.ts'

const args = '{"city":"Paris"}'

/** What the fake Claude Code process observed. */
interface Seen {
  results: CallToolResult[]
  steering: string[]
}

function textTurn(text: string, extra: unknown[] = []): unknown[] {
  return [
    messageStart({ input_tokens: 20 }),
    blockStart(0, { type: 'text', text: '' }),
    textDelta(0, text),
    blockStop(0),
    messageDelta('end_turn', 5),
    ...extra,
    success(),
  ]
}

/** Claude asks for the given cities in one message, waits for every result, then answers. */
function weatherConversation(seen: Seen, cities: string[] = ['Paris']): Script {
  return call => (async function* () {
    yield init()
    await call.nextUser()
    yield messageStart({ input_tokens: 10, cache_read_input_tokens: 4 })
    yield thinkingBlock('Need the weather.')
    yield blockStop(0)
    const pending: Array<Promise<CallToolResult>> = []
    for (const [position, city] of cities.entries()) {
      yield* toolUse(position + 1, `toolu_${position + 1}`, 'get_weather', { city })
      const outcome = call.callTool('get_weather', { city }, `toolu_${position + 1}`)
      outcome.catch(() => undefined)
      pending.push(outcome)
    }
    yield messageDelta('tool_use', 9)
    for (const outcome of pending) seen.results.push(await outcome)
    while (call.userMessages.length > 1 + seen.steering.length) seen.steering.push(textOf(await call.nextUser()))
    yield* textTurn('It is sunny')
  })()
}

function thinkingBlock(text: string): unknown {
  return blockStart(0, { type: 'thinking', thinking: text })
}

/** One script per query the adapter starts. */
function sequence(...scripts: Script[]): Script {
  let started = 0
  return call => scripts[started++]!(call)
}

const hanging: Script = call => (async function* () {
  yield init()
  await call.nextUser()
  yield messageStart()
  yield blockStart(0, { type: 'text', text: '' })
  yield textDelta(0, 'partial')
  while (!call.closed) await new Promise(resolve => setTimeout(resolve, 1))
})()

const oneTurn: Script = emits(init(), ...textTurn('Hello'))

function twoTurns(): Script {
  return call => (async function* () {
    yield init()
    await call.nextUser()
    yield* textTurn('first')
    await call.nextUser()
    yield* textTurn('second')
  })()
}

async function firstRound(seen: Seen, cities?: string[]) {
  const sdk = fakeSdk(weatherConversation(seen, cities))
  const deps = dependencies(sdk.query)
  const chunks = await collect(streamClaudeCode(deps, request([user('Weather?')], { tools: [weatherTool], system: 'You are dsh.' })))
  return { sdk, deps, chunks }
}

describe('tool round trip', () => {
  it('ends the response with tool-call blocks, parks the query, and resumes it with the tool result', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { sdk, deps, chunks } = await firstRound(seen)
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'reasoning' },
      { type: 'reasoning-delta', index: 0, text: 'Need the weather.' },
      { type: 'block-end', index: 0, block: { type: 'reasoning', text: 'Need the weather.' } },
      { type: 'block-start', index: 1, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: 1, id: 'toolu_1', name: 'get_weather', argumentsDelta: '' },
      { type: 'tool-call-delta', index: 1, id: 'toolu_1', argumentsDelta: args },
      { type: 'block-end', index: 1, block: { type: 'tool-call', id: 'toolu_1', name: 'get_weather', arguments: args } },
      { type: 'usage', usage: { inputTokens: 10, outputTokens: 9, cacheReadTokens: 4 } },
      {
        type: 'finish',
        reason: { kind: 'tool-calls' },
        replayState: { response: { claudeSessionId: 'claude-session-1', model: 'sonnet', turn: 1, stopped: false } },
      },
    ])
    expect(deps.registry.get('s-1')?.state).toBe('parked')
    expect(seen.results).toEqual([])

    const history = [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), toolResult('toolu_1', 'Sunny, 21C')]
    const assembler = new BlockAssembler()
    for await (const chunk of streamClaudeCode(deps, request(history, { tools: [weatherTool], system: 'You are dsh.' }))) assembler.push(chunk)

    expect(assembler.blocks()).toEqual([{ type: 'text', text: 'It is sunny' }])
    expect(assembler.finish).toEqual({ kind: 'stop' })
    expect(assembler.usage).toEqual({ inputTokens: 20, outputTokens: 5 })
    expect(assembler.replayState).toEqual({ response: { claudeSessionId: 'claude-session-1', model: 'sonnet', turn: 2, stopped: true } })
    expect(sdk.calls).toHaveLength(1)
    expect(seen.results).toEqual([{ content: [{ type: 'text', text: 'Sunny, 21C' }], isError: false }])
    expect(deps.registry.get('s-1')?.state).toBe('idle')
  })

  it('offers the request tools and only dsh tools to Claude Code', async () => {
    const { sdk } = await firstRound({ results: [], steering: [] })
    const [call] = sdk.calls
    expect(call?.options).toMatchObject({
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      systemPrompt: 'You are dsh.',
      includePartialMessages: true,
      persistSession: true,
      cwd: '/work/project',
      thinking: { type: 'adaptive', display: 'summarized' },
    })
    expect(call?.options.mcpServers?.dsh).toMatchObject({ type: 'sdk', name: 'dsh' })
    expect((call?.options.mcpServers?.dsh as { timeout: number }).timeout).toBeGreaterThanOrEqual(86_400_000)
    expect(call?.options).not.toHaveProperty('resume')
    const listed = await (await call!.mcp()).listTools()
    expect(listed.tools).toEqual([{
      name: 'get_weather',
      description: 'Weather for a city',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    }])
    const context = { signal: new AbortController().signal, toolUseID: 't', requestId: 'r' }
    expect(await call?.options.canUseTool?.('mcp__dsh__get_weather', { city: 'Paris' }, context))
      .toEqual({ behavior: 'allow', updatedInput: { city: 'Paris' } })
    expect(await call?.options.canUseTool?.('Bash', { command: 'ls' }, context)).toMatchObject({ behavior: 'deny' })
  })

  it('maps parallel tool calls in one assistant message to parallel dsh tool calls and answers each by id', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { sdk, deps, chunks } = await firstRound(seen, ['Paris', 'Rome'])
    const calls = chunks.flatMap(chunk => (chunk.type === 'block-end' && chunk.block.type === 'tool-call' ? [chunk.block] : []))
    expect(calls.map(call => [call.id, call.arguments])).toEqual([['toolu_1', '{"city":"Paris"}'], ['toolu_2', '{"city":"Rome"}']])
    expect(chunks.filter(chunk => chunk.type === 'finish')).toHaveLength(1)
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'tool-calls' } })

    const history = [
      user('Weather?'),
      assistantCalling([['toolu_1', 'get_weather', '{"city":"Paris"}'], ['toolu_2', 'get_weather', '{"city":"Rome"}']], replayOf(chunks)),
      toolResult('toolu_2', 'Rainy'),
      toolResult('toolu_1', 'Sunny'),
    ]
    await collect(streamClaudeCode(deps, request(history, { tools: [weatherTool], system: 'You are dsh.' })))
    expect(sdk.calls).toHaveLength(1)
    expect(seen.results.map(result => (result.content as Array<{ text: string }>)[0]?.text)).toEqual(['Sunny', 'Rainy'])
  })

  it('carries the error flag and image content of a dsh result into the MCP result', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { deps, chunks } = await firstRound(seen)
    const ref = { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 1, width: 1, height: 1 } as unknown as ImageAttachmentRef
    const failed = createToolResultMessage({
      callId: ToolCallId('toolu_1'),
      isError: true,
      content: [{ type: 'text', text: 'boom' }, { type: 'image', attachment: ref }, { type: 'image', attachment: ref, offloaded: true }],
    })
    const history = [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), failed]
    await collect(streamClaudeCode(
      { ...deps, loadImage: () => () => Promise.resolve({ mediaType: 'image/png', data: 'AAAA' }) },
      request(history, { tools: [weatherTool] }),
    ))
    const [result] = seen.results
    expect(result?.isError).toBe(true)
    expect(result?.content).toEqual([
      { type: 'text', text: 'boom' },
      { type: 'image', data: 'AAAA', mimeType: 'image/png' },
      { type: 'text', text: expect.stringContaining('image omitted') as string },
    ])
  })

  it('answers an empty dsh result with a placeholder', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { deps, chunks } = await firstRound(seen)
    const empty = createToolResultMessage({ callId: ToolCallId('toolu_1'), isError: false, content: [] })
    await collect(streamClaudeCode(deps, request(
      [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), empty],
      { tools: [weatherTool] },
    )))
    expect(seen.results[0]?.content).toEqual([{ type: 'text', text: '(no output)' }])
  })

  it('queues extra user text after the tool results as steering', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { sdk, deps, chunks } = await firstRound(seen)
    const history = [
      user('Weather?'),
      assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)),
      toolResult('toolu_1', 'Sunny'),
      user('Make it short'),
    ]
    await collect(streamClaudeCode(deps, request(history, { tools: [weatherTool], system: 'You are dsh.' })))
    expect(sdk.calls).toHaveLength(1)
    expect(seen.steering).toEqual(['Make it short'])
  })

  it('shows a call to a tool that is not a dsh tool as one reasoning line and keeps streaming', async () => {
    const { query } = fakeSdk(call => (async function* () {
      yield init()
      await call.nextUser()
      yield messageStart()
      yield* [
        blockStart(0, { type: 'tool_use', id: 'toolu_x', name: 'Bash', input: {} }),
        blockDelta(0, { type: 'input_json_delta', partial_json: '{"command":"ls"}' }),
        blockStop(0),
      ]
      yield messageDelta('tool_use')
      yield* textTurn('denied, sorry')
    })())
    const chunks = await collect(streamClaudeCode(dependencies(query), request([user('go')], { tools: [weatherTool] })))
    const finishes = chunks.filter(chunk => chunk.type === 'finish')
    expect(finishes).toEqual([expect.objectContaining({ reason: { kind: 'stop' } })])
    expect(chunks).toContainEqual({ type: 'block-end', index: 0, block: { type: 'reasoning', text: 'Bash: ls' } })
  })
})

describe('live query reuse', () => {
  it.each([
    ['a tool result is missing', (chunks: never) => [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), user('never mind')]],
    ['the result answers an unknown call', (chunks: never) => [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), toolResult('toolu_9', 'x')]],
    ['the envelope is from another turn', () => [
      user('Weather?'),
      assistantCalling([['toolu_1', 'get_weather', args]], { response: { claudeSessionId: 'claude-session-1', turn: 7, stopped: false } }),
      toolResult('toolu_1', 'Sunny'),
    ]],
    ['the envelope is from another Claude session', () => [
      user('Weather?'),
      assistantCalling([['toolu_1', 'get_weather', args]], { response: { claudeSessionId: 'elsewhere', turn: 1, stopped: false } }),
      toolResult('toolu_1', 'Sunny'),
    ]],
    ['the history was edited after the tool call', (chunks: never) => [
      user('Weather?'),
      assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)),
      toolResult('toolu_1', 'Sunny'),
      assistant('an extra answer', 'deepseek-official'),
      user('and now?'),
    ]],
  ])('interrupts the live query and starts a fresh one when %s', async (_label, build) => {
    const seen: Seen = { results: [], steering: [] }
    const sdk = fakeSdk(sequence(weatherConversation(seen), oneTurn))
    const deps = dependencies(sdk.query)
    const options = { tools: [weatherTool] }
    const first = await collect(streamClaudeCode(deps, request([user('Weather?')], options)))
    const stale = deps.registry.get('s-1')

    const chunks = await collect(streamClaudeCode(deps, request(build(first as never), options)))

    const [old, replacement] = sdk.calls
    expect(old?.interrupted).toBe(true)
    expect(old?.closed).toBe(true)
    expect(sdk.calls).toHaveLength(2)
    expect(replacement?.options).not.toHaveProperty('resume')
    expect(textOf(replacement?.userMessages[0])).toContain('[tool call get_weather]')
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'stop' } })
    expect(deps.registry.get('s-1')).not.toBe(stale)
    expect(deps.registry.get('s-1')?.state).toBe('idle')
  })

  it('pushes a new user turn into the live query after a final answer', async () => {
    const sdk = fakeSdk(twoTurns())
    const deps = dependencies(sdk.query)
    const first = await collect(streamClaudeCode(deps, request([user('one')])))
    const history = [user('one'), assistant('first', 'claude-code', replayOf(first)), user('two')]
    const second = await collect(streamClaudeCode(deps, request(history)))
    expect(sdk.calls).toHaveLength(1)
    expect(sdk.calls[0]?.userMessages.map(textOf)).toEqual(['one', 'two'])
    expect(second.filter(chunk => chunk.type === 'text-delta')).toEqual([{ type: 'text-delta', index: 0, text: 'second' }])
    expect(replayOf(second)).toEqual({ response: { claudeSessionId: 'claude-session-1', model: 'sonnet', turn: 2, stopped: true } })
  })

  it.each([
    ['model', { model: 'haiku' }],
    ['reasoning effort', { reasoningEffort: ReasoningEffortId('high') }],
  ])('ends the live query when the %s changes and resumes the Claude session', async (_label, change) => {
    const sdk = fakeSdk(sequence(oneTurn, emits(init('claude-session-2'), ...textTurn('again'))))
    const deps = dependencies(sdk.query)
    const first = await collect(streamClaudeCode(deps, request([user('one')])))
    const history = [user('one'), assistant('Hello', 'claude-code', replayOf(first)), user('two')]
    await collect(streamClaudeCode(deps, request(history, change)))
    const [old, next] = sdk.calls
    expect(old?.closed).toBe(true)
    expect(sdk.calls).toHaveLength(2)
    expect(next?.options.resume).toBe('claude-session-1')
    expect(textOf(next?.userMessages[0])).toBe('two')
    if ('model' in change) expect(next?.options.model).toBe('haiku')
    else expect(next?.options.effort).toBe('high')
  })

  it('ends the live query when the tool set changes', async () => {
    const sdk = fakeSdk(sequence(oneTurn, oneTurn))
    const deps = dependencies(sdk.query)
    const first = await collect(streamClaudeCode(deps, request([user('one')], { tools: [weatherTool] })))
    const history = [user('one'), assistant('Hello', 'claude-code', replayOf(first)), user('two')]
    await collect(streamClaudeCode(deps, request(history, { tools: [] })))
    expect(sdk.calls[0]?.closed).toBe(true)
    expect(sdk.calls).toHaveLength(2)
    expect(sdk.calls[1]?.options.resume).toBe('claude-session-1')
  })

  it('replaces a query that is still streaming when a second request for the Session arrives', async () => {
    const sdk = fakeSdk(sequence(hanging, oneTurn))
    const deps = dependencies(sdk.query)
    const seenFirst: string[] = []
    const first = (async () => {
      for await (const chunk of streamClaudeCode(deps, request([user('one')]))) seenFirst.push(chunk.type)
    })()
    await until(() => seenFirst.includes('text-delta'))
    const second = await collect(streamClaudeCode(deps, request([user('one'), assistant('x'), user('two')])))
    await first
    expect(sdk.calls).toHaveLength(2)
    expect(sdk.calls[0]?.closed).toBe(true)
    expect(seenFirst.at(-1)).toBe('finish')
    expect(second.at(-1)).toMatchObject({ reason: { kind: 'stop' } })
  })

  it('closes an unused query after the idle timeout', async () => {
    const seen: Seen = { results: [], steering: [] }
    const sdk = fakeSdk(weatherConversation(seen))
    const deps = dependencies(sdk.query, { idleTimeoutMs: 20 })
    await collect(streamClaudeCode(deps, request([user('Weather?')], { tools: [weatherTool] })))
    expect(deps.registry.get('s-1')?.state).toBe('parked')
    await until(() => sdk.calls[0]?.closed === true)
    expect(sdk.calls[0]?.interrupted).toBe(false)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })

  it('closes the live query of a Session on request and every live query on shutdown', async () => {
    const sdk = fakeSdk(sequence(oneTurn, oneTurn))
    const deps = dependencies(sdk.query)
    await collect(streamClaudeCode(deps, request([user('one')], { sessionId: 'a' as never })))
    await collect(streamClaudeCode(deps, request([user('one')], { sessionId: 'b' as never })))
    deps.registry.close('a')
    expect(sdk.calls.map(call => call.closed)).toEqual([true, false])
    expect(deps.registry.get('a')).toBeUndefined()
    deps.registry.closeAll()
    expect(sdk.calls.map(call => call.closed)).toEqual([true, true])
    expect(deps.registry.get('b')).toBeUndefined()
  })
})

describe('auxiliary requests', () => {
  it('runs once without tools, persistence, or thinking, under the request system text, and never stays live', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    const deps = dependencies(query)
    const history = [user('first'), assistant('reply', 'claude-code', { response: { claudeSessionId: 'x', turn: 1, stopped: true } }), user('title this')]
    const chunks = await collect(streamClaudeCode(
      deps,
      request(history, { purpose: 'session-title', system: 'Write a title.', tools: [weatherTool] }),
    ))
    const options = calls[0]?.options
    expect(options).toMatchObject({
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      persistSession: false,
      thinking: { type: 'disabled' },
      systemPrompt: 'Write a title.',
    })
    expect(options).not.toHaveProperty('mcpServers')
    expect(options).not.toHaveProperty('resume')
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(calls[0]?.closed).toBe(true)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })
})

describe('query options', () => {
  it('sends the route, effort, and an empty system prompt when the request has none', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    await collect(streamClaudeCode(dependencies(query), request([user('hi')], { reasoningEffort: ReasoningEffortId('high') })))
    expect(calls[0]?.options).toMatchObject({ model: 'sonnet', effort: 'high', systemPrompt: '' })
    expect(calls[0]?.options).not.toHaveProperty('mcpServers')
    expect(calls[0]?.options.abortController).toBeInstanceOf(AbortController)
  })

  it('omits the model option for the runtime default and honors the thinking display', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    await collect(streamClaudeCode(dependencies(query, { thinkingDisplay: 'omitted' }), request([user('hi')], { model: 'default' })))
    expect(calls[0]?.options).not.toHaveProperty('model')
    expect(calls[0]?.options).toMatchObject({ thinking: { type: 'adaptive', display: 'omitted' } })
  })

  it('removes Claude Code and Anthropic variables from the child environment before the overlay', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    await collect(streamClaudeCode(
      dependencies(query, {
        parentEnv: {
          PATH: '/bin',
          CLAUDECODE: '1',
          CLAUDE_CODE_ENTRYPOINT: 'cli',
          ANTHROPIC_API_KEY: 'sentinel-key',
          ANTHROPIC_BASE_URL: 'https://proxy.invalid',
        },
        env: { CLAUDE_CODE_EXPERIMENTAL: 'yes' },
      }),
      request([user('hi')]),
    ))
    expect(calls[0]?.options.env).toEqual({ PATH: '/bin', CLAUDE_CODE_EXPERIMENTAL: 'yes' })
  })

  it('rejects an unknown reasoning effort before starting a query', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    await expect(collect(streamClaudeCode(
      dependencies(query),
      request([user('hi')], { reasoningEffort: ReasoningEffortId('turbo') }),
    ))).rejects.toMatchObject({ code: 'UNSUPPORTED_REASONING_EFFORT' })
    expect(calls).toHaveLength(0)
  })

  it('fails the request when the Session working directory cannot be resolved', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    const failing = collect(streamClaudeCode(dependencies(query, { resolveWorkspace: () => undefined }), request([user('hi')])))
    await expect(failing).rejects.toBeInstanceOf(LlmError)
    await expect(failing).rejects.toMatchObject({ code: 'CLAUDE_CODE_NO_WORKSPACE' })
    expect(calls).toHaveLength(0)
  })

  it('reports the init message to the observer', async () => {
    const { query } = fakeSdk(oneTurn)
    const seen: unknown[] = []
    await collect(streamClaudeCode(dependencies(query, { onInit: started => seen.push(started) }), request([user('hi')])))
    expect(seen).toEqual([{ claudeSessionId: 'claude-session-1', model: 'claude-test', apiKeySource: 'none' }])
  })
})

describe('results', () => {
  it('assembles thinking and text into the visible message with usage', async () => {
    const { query } = fakeSdk(emits(
      init(),
      messageStart({ input_tokens: 7, cache_read_input_tokens: 5, cache_creation_input_tokens: 2 }),
      blockStart(0, { type: 'thinking', thinking: '' }),
      thinkingDelta(0, 'Let me '),
      thinkingDelta(0, 'think.'),
      blockStop(0),
      blockStart(1, { type: 'text', text: '' }),
      textDelta(1, 'Hello world'),
      blockStop(1),
      messageDelta('end_turn', 3),
      success(),
    ))
    const assembler = new BlockAssembler()
    for await (const chunk of streamClaudeCode(dependencies(query), request([user('hi')]))) assembler.push(chunk)
    expect(assembler.blocks()).toEqual([
      { type: 'reasoning', text: 'Let me think.' },
      { type: 'text', text: 'Hello world' },
    ])
    expect(assembler.usage).toEqual({ inputTokens: 7, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 2 })
  })

  it('uses the result usage when the stream carried none, and maps a max_tokens stop', async () => {
    const { query } = fakeSdk(emits(init(), success('claude-session-1', { stop_reason: 'max_tokens' })))
    const chunks = await collect(streamClaudeCode(dependencies(query), request([user('hi')])))
    expect(chunks[0]).toEqual({ type: 'usage', usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 2 } })
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'max-tokens' } })
  })

  it('sums the usage of every Claude message in one response', async () => {
    const { query } = fakeSdk(emits(
      init(),
      messageStart({ input_tokens: 4 }),
      messageDelta('end_turn', 2),
      messageStart({ input_tokens: 6 }),
      messageDelta('end_turn', 3),
      success(),
    ))
    const chunks = await collect(streamClaudeCode(dependencies(query), request([user('hi')])))
    expect(chunks[0]).toEqual({ type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } })
  })

  it('maps a result error subtype to an error finish with a stable code, no replay state, and a closed query', async () => {
    const { query, calls } = fakeSdk(emits(init(), {
      type: 'result', subtype: 'error_max_turns', is_error: true, errors: ['turn limit'], session_id: 's', usage: {},
    }))
    const deps = dependencies(query)
    const chunks = await collect(streamClaudeCode(deps, request([user('hi')])))
    expect(chunks.at(-1)).toEqual({
      type: 'finish',
      reason: { kind: 'error', failure: { message: 'Claude Code stopped with error_max_turns: turn limit', code: 'CLAUDE_CODE_MAX_TURNS' } },
    })
    expect(calls[0]?.closed).toBe(true)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })

  it('maps an error result with an API status and assistant error to that failure', async () => {
    const { query } = fakeSdk(emits(
      init(),
      { type: 'assistant', parent_tool_use_id: null, error: 'rate_limit', message: {} },
      success('claude-session-1', { is_error: true, result: 'limit reached', api_error_status: 429 }),
    ))
    const chunks = await collect(streamClaudeCode(dependencies(query), request([user('hi')])))
    expect(chunks.at(-1)).toEqual({
      type: 'finish',
      reason: { kind: 'error', failure: { message: 'limit reached', code: 'CLAUDE_CODE_RATE_LIMIT', status: 429 } },
    })
  })

  it('ends with an error finish when the process fails or ends without a result', async () => {
    const crashed = fakeSdk(async function* () { yield init(); throw new Error('exit code 1') })
    const crash = await collect(streamClaudeCode(dependencies(crashed.query), request([user('hi')])))
    expect(crash.at(-1)).toMatchObject({ reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_PROCESS_FAILED' } } })
    expect(crashed.calls[0]?.closed).toBe(true)

    const silent = fakeSdk(emits(init()))
    const none = await collect(streamClaudeCode(dependencies(silent.query), request([user('hi')])))
    expect(none.at(-1)).toMatchObject({ reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_NO_RESULT' } } })
  })
})

describe('cancellation', () => {
  it('ends with an aborted finish and interrupts, closes, and forgets the query', async () => {
    const { query, calls } = fakeSdk(hanging)
    const deps = dependencies(query)
    const controller = new AbortController()
    const chunks: unknown[] = []
    for await (const chunk of streamClaudeCode(deps, request([user('hi')], { signal: controller.signal }))) {
      chunks.push(chunk)
      if (chunk.type === 'text-delta') controller.abort()
    }
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'aborted', failure: { code: 'ABORTED' } } })
    expect(calls[0]?.interrupted).toBe(true)
    expect(calls[0]?.options.abortController?.signal.aborted).toBe(true)
    expect(calls[0]?.closed).toBe(true)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })

  it('closes the query at the moment of the abort, before the consumer reads again', async () => {
    const { query, calls } = fakeSdk(hanging)
    const controller = new AbortController()
    const stream = streamClaudeCode(dependencies(query), request([user('hi')], { signal: controller.signal }))
    let step = await stream.next()
    while (step.done !== true && step.value.type !== 'text-delta') step = await stream.next()
    expect(step.done).toBe(false)
    controller.abort()
    expect(calls[0]?.closed).toBe(true)
    await until(() => calls[0]?.interrupted === true)
    await stream.return(undefined)
  })

  it('still ends the stream when interrupting the query fails', async () => {
    const { query: inner, calls } = fakeSdk(hanging)
    const query: typeof inner = (params) => {
      const started = inner(params)
      started.interrupt = () => Promise.reject(new Error('query already closed'))
      return started
    }
    const controller = new AbortController()
    const chunks: unknown[] = []
    for await (const chunk of streamClaudeCode(dependencies(query), request([user('hi')], { signal: controller.signal }))) {
      chunks.push(chunk)
      if (chunk.type === 'text-delta') controller.abort()
    }
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'aborted' } })
    expect(calls[0]?.closed).toBe(true)
  })

  it('finishes aborted when the process fails after cancellation', async () => {
    const controller = new AbortController()
    const sdk = fakeSdk(call => ({
      [Symbol.asyncIterator]() {
        let reads = 0
        return {
          next: () => (reads++ === 0
            ? Promise.resolve({ done: false as const, value: init() })
            : new Promise<never>((_resolve, reject) => {
              call.options.abortController?.signal.addEventListener('abort', () => { reject(new Error('aborted by SDK')) })
            })),
        }
      },
    }))
    setTimeout(() => { controller.abort() }, 5)
    const chunks = await collect(streamClaudeCode(dependencies(sdk.query), request([user('go')], { signal: controller.signal })))
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'aborted' } })
  })

  it('closes the parked query when the signal aborts while tool results are read', async () => {
    const seen: Seen = { results: [], steering: [] }
    const { sdk, deps, chunks } = await firstRound(seen)
    const ref = { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 1, width: 1, height: 1 } as unknown as ImageAttachmentRef
    const withImage = createToolResultMessage({
      callId: ToolCallId('toolu_1'),
      isError: false,
      content: [{ type: 'image', attachment: ref }],
    })
    const controller = new AbortController()
    const result = await collect(streamClaudeCode(
      { ...deps, loadImage: () => () => { controller.abort(); return Promise.resolve({ mediaType: 'image/png', data: 'AAAA' }) } },
      request(
        [user('Weather?'), assistantCalling([['toolu_1', 'get_weather', args]], replayOf(chunks)), withImage],
        { tools: [weatherTool], signal: controller.signal },
      ),
    ))
    expect(result).toEqual([expect.objectContaining({ reason: { kind: 'aborted', failure: expect.objectContaining({ code: 'ABORTED' }) as never } })])
    expect(sdk.calls[0]?.closed).toBe(true)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })

  it('finishes aborted without starting a query when the signal aborts while the prompt is read', async () => {
    const { query, calls } = fakeSdk(hanging)
    const controller = new AbortController()
    const image = createUserMessage({
      content: [{ type: 'image', attachment: { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 1, width: 1, height: 1 } as never }],
      source: { kind: 'user' },
    })
    const chunks = await collect(streamClaudeCode(
      dependencies(query, {
        loadImage: () => () => {
          controller.abort()
          return Promise.resolve({ mediaType: 'image/png', data: 'AAAA' })
        },
      }),
      request([image], { signal: controller.signal }),
    ))
    expect(chunks).toEqual([{ type: 'finish', reason: { kind: 'aborted', failure: { message: 'Claude Code request aborted by caller', code: 'ABORTED' } } }])
    expect(calls).toHaveLength(0)
  })

  it('finishes aborted without starting a query when the signal is already aborted', async () => {
    const { query, calls } = fakeSdk(hanging)
    const chunks = await collect(streamClaudeCode(dependencies(query), request([user('hi')], { signal: AbortSignal.abort() })))
    expect(chunks).toEqual([{ type: 'finish', reason: { kind: 'aborted', failure: { message: 'Claude Code request aborted by caller', code: 'ABORTED' } } }])
    expect(calls).toHaveLength(0)
  })

  it('closes the query when the consumer stops reading mid-response', async () => {
    const { query, calls } = fakeSdk(hanging)
    const deps = dependencies(query)
    for await (const chunk of streamClaudeCode(deps, request([user('hi')]))) {
      if (chunk.type === 'text-delta') break
    }
    expect(calls[0]?.closed).toBe(true)
    expect(deps.registry.get('s-1')).toBeUndefined()
  })
})

describe('images', () => {
  const ref = { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 3, width: 1, height: 1 } as unknown as ImageAttachmentRef

  it('sends image content as SDK image blocks in the first user message', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    const message = createUserMessage({
      content: [{ type: 'text', text: 'what is this?' }, { type: 'image', attachment: ref }],
      source: { kind: 'user' },
    })
    await collect(streamClaudeCode(
      dependencies(query, { loadImage: () => () => Promise.resolve({ mediaType: 'image/png', data: 'AAAA' }) }),
      request([message]),
    ))
    expect(calls[0]?.userMessages).toEqual([{
      type: 'user',
      parent_tool_use_id: null,
      message: {
        role: 'user',
        content: [
          { type: 'text', text: 'what is this?' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
        ],
      },
    }])
  })
})

describe('workspace lookup', () => {
  it('runs in the directory of the resolved Session', async () => {
    const { query, calls } = fakeSdk(oneTurn)
    const agent = fakeAgent('/elsewhere')
    await collect(streamClaudeCode(
      dependencies(query, { resolveWorkspace: () => ({ agent, cwd: '/elsewhere' }) }),
      request([user('hi')]),
    ))
    expect(calls[0]?.options.cwd).toBe('/elsewhere')
    expect(requestCalls(calls)).toHaveLength(1)
  })
})
