/** The Claude Code process is a wire boundary: events it sends are validated, never trusted. */

import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { streamClaudeCode } from '../src/stream.ts'
import { ToolBridge } from '../src/tool-bridge.ts'
import { summarizeInput, toolLine } from '../src/tool-summary.ts'
import {
  blockDelta, blockStart, blockStop, collect, dependencies, emits, fakeSdk, init, messageDelta, messageStart, request, success,
  textDelta, thinkingDelta, user, weatherTool,
} from './support.ts'
import type { Script } from './support.ts'

async function run(script: Script) {
  const sdk = fakeSdk(script)
  return collect(streamClaudeCode(dependencies(sdk.query), request([user('go')])))
}

const finishOnly = [{ type: 'usage', usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 2 } }]

describe('content block validation', () => {
  it('ignores block types it cannot show, together with their deltas and stop', async () => {
    const chunks = await run(emits(
      init(),
      messageStart(),
      blockStart(0, { type: 'redacted_thinking', data: 'x' }),
      blockDelta(0, { type: 'text_delta', text: 'ignored' }),
      blockStop(0),
      blockStop(9),
      blockDelta(9, { type: 'text_delta', text: 'orphan' }),
      success(),
    ))
    expect(chunks.map(chunk => chunk.type)).toEqual(['usage', 'finish'])
    expect(chunks[0]).toMatchObject(finishOnly[0]!)
  })

  it('opens a text block that starts without text and one that starts with text', async () => {
    const chunks = await run(emits(
      init(),
      messageStart(),
      blockStart(0, { type: 'text' }),
      textDelta(0, ''),
      blockStop(0),
      blockStart(1, { type: 'text', text: 'Hi' }),
      blockStop(1),
      success(),
    ))
    expect(chunks.slice(0, -2)).toEqual([
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'block-end', index: 0, block: { type: 'text', text: '' } },
      { type: 'block-start', index: 1, blockType: 'text' },
      { type: 'text-delta', index: 1, text: 'Hi' },
      { type: 'block-end', index: 1, block: { type: 'text', text: 'Hi' } },
    ])
  })

  it('takes initial thinking text and drops deltas of the wrong kind', async () => {
    const chunks = await run(emits(
      init(),
      messageStart(),
      blockStart(0, { type: 'thinking' }),
      blockStop(0),
      blockStart(1, { type: 'thinking', thinking: 'first ' }),
      thinkingDelta(1, 'second'),
      textDelta(1, 'wrong kind'),
      blockDelta(1, { type: 'thinking_delta' }),
      blockStop(1),
      blockStart(2, { type: 'text', text: '' }),
      thinkingDelta(2, 'wrong kind'),
      blockDelta(2, { type: 'input_json_delta', partial_json: '{}' }),
      blockStop(2),
      success(),
    ))
    expect(chunks.filter(chunk => chunk.type === 'reasoning-delta')).toEqual([
      { type: 'reasoning-delta', index: 0, text: 'first ' },
      { type: 'reasoning-delta', index: 0, text: 'second' },
    ])
    expect(chunks.filter(chunk => chunk.type === 'block-end').map(chunk => chunk.block)).toEqual([
      { type: 'reasoning', text: 'first second' },
      { type: 'text', text: '' },
    ])
  })

  it('shows a nameless tool call, a server tool, and unreadable tool input as short lines', async () => {
    const chunks = await run(emits(
      init(),
      messageStart(),
      blockStart(0, { type: 'tool_use' }),
      blockStop(0),
      blockStart(1, { type: 'server_tool_use', name: 'web_search' }),
      blockDelta(1, { type: 'input_json_delta', partial_json: '{"query":"dsh"}' }),
      blockStop(1),
      blockStart(2, { type: 'mcp_tool_use', name: 'mcp__x__y' }),
      blockDelta(2, { type: 'input_json_delta', partial_json: '{"broken' }),
      blockDelta(2, { type: 'input_json_delta' }),
      blockStop(2),
      success(),
    ))
    const lines = chunks.flatMap(chunk => (chunk.type === 'reasoning-delta' ? [chunk.text] : []))
    expect(lines).toEqual(['tool', 'web_search: dsh', 'mcp__x__y'])
  })
})

describe('message validation', () => {
  it('skips events that are not objects and message kinds it does not map', async () => {
    const chunks = await run(emits(
      init(),
      { type: 'system', subtype: 'status' },
      { type: 'rate_limit_event' },
      { type: 'assistant', parent_tool_use_id: null, message: {} },
      { type: 'stream_event', parent_tool_use_id: null, event: undefined },
      { type: 'stream_event', parent_tool_use_id: null, event: { type: 'message_delta' } },
      { type: 'stream_event', parent_tool_use_id: null, event: { type: 'content_block_stop' } },
      { type: 'stream_event', parent_tool_use_id: null, event: { type: 'content_block_start', content_block: 'x' } },
      success(),
    ))
    expect(chunks.map(chunk => chunk.type)).toEqual(['usage', 'finish'])
  })

  it('reports zero tokens when the result carries no usage', async () => {
    const chunks = await run(emits(init(), success('claude-session-1', { usage: undefined })))
    expect(chunks[0]).toEqual({ type: 'usage', usage: { inputTokens: 0, outputTokens: 0 } })
  })

  it('words an error result without detail or text', async () => {
    const noDetail = await run(emits(init(), {
      type: 'result', subtype: 'error_during_execution', is_error: true, errors: [], session_id: 's', usage: {},
    }))
    expect(noDetail.at(-1)).toEqual({
      type: 'finish',
      reason: {
        kind: 'error',
        failure: { message: 'Claude Code stopped with error_during_execution', code: 'CLAUDE_CODE_EXECUTION_FAILED' },
      },
    })
    const unknownSubtype = await run(emits(init(), {
      type: 'result', subtype: 'error_new_kind', is_error: true, errors: ['x'], session_id: 's', usage: {},
    }))
    expect(unknownSubtype.at(-1)).toMatchObject({ reason: { kind: 'error', failure: { code: 'CLAUDE_CODE_FAILED' } } })
    const noText = await run(emits(init(), success('s', { is_error: true, result: '' })))
    expect(noText.at(-1)).toEqual({
      type: 'finish',
      reason: { kind: 'error', failure: { message: 'Claude Code reported an error', code: 'CLAUDE_CODE_RESULT_ERROR' } },
    })
  })

  it('finishes aborted when the process fails after cancellation, and words a non-Error failure', async () => {
    const controller = new AbortController()
    // The SDK rejects a pending read when its abort controller fires, before the adapter's own race settles.
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

    const thrown = fakeSdk(async function* () {
      yield init()
      throw 'plain failure'
    })
    const failed = await collect(streamClaudeCode(dependencies(thrown.query), request([user('go')])))
    expect(failed.at(-1)).toMatchObject({
      reason: { kind: 'error', failure: { message: 'Claude Code process failed: plain failure' } },
    })
  })
})

describe('bridge and stream edge cases', () => {
  it('ignores stream events of a nested subagent', async () => {
    const chunks = await run(emits(
      init(),
      messageStart(),
      blockStart(0, { type: 'text', text: '' }, 'tool-parent'),
      blockDelta(0, { type: 'text_delta', text: 'inner' }, 'tool-parent'),
      success(),
    ))
    expect(chunks.map(chunk => chunk.type)).toEqual(['usage', 'finish'])
  })

  it('gives a dsh tool call without input the empty JSON object', async () => {
    const chunks = await run(emits(
      init(),
      messageStart({ input_tokens: 1 }),
      blockStart(0, { type: 'tool_use', id: 'toolu_1', name: 'mcp__dsh__ping', input: {} }),
      blockStop(0),
      messageDelta('tool_use'),
    ))
    expect(chunks).toContainEqual({
      type: 'block-end',
      index: 0,
      block: { type: 'tool-call', id: 'toolu_1', name: 'ping', arguments: '{}' },
    })
    expect(chunks.at(-1)).toMatchObject({ reason: { kind: 'tool-calls' } })
  })

  it('adds up usage when only some Claude messages report cache tokens', async () => {
    const chunks = await run(emits(
      init(),
      messageStart({ input_tokens: 4, cache_read_input_tokens: 2 }),
      messageDelta('end_turn', 1),
      messageStart({ input_tokens: 6, cache_creation_input_tokens: 3 }),
      messageDelta('end_turn', 2),
      success(),
    ))
    expect(chunks[0]).toEqual({
      type: 'usage',
      usage: { inputTokens: 10, outputTokens: 3, cacheReadTokens: 2, cacheWriteTokens: 3 },
    })
  })

  it('answers a bridged call that carries no tool use id with an error result', async () => {
    const bridge = new ToolBridge([weatherTool])
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0.0.0' })
    await Promise.all([bridge.server.connect(serverSide), client.connect(clientSide)])
    const bare = await client.callTool({ name: 'get_weather', arguments: {} })
    const noKey = await client.callTool({ name: 'get_weather', arguments: {}, _meta: { other: 1 } })
    expect(bare).toEqual({ content: [{ type: 'text', text: 'The tool call carried no tool use id.' }], isError: true })
    expect(noKey.isError).toBe(true)
    await client.close()
  })

  it('answers every parked call with an error when the bridge is abandoned', async () => {
    const bridge = new ToolBridge([weatherTool])
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0.0.0' })
    await Promise.all([bridge.server.connect(serverSide), client.connect(clientSide)])
    const parked = client.callTool({ name: 'get_weather', arguments: {}, _meta: { 'claudecode/toolUseId': 'toolu_1' } })
    await new Promise(resolve => setTimeout(resolve, 10))
    bridge.abandon('closed')
    expect(await parked).toEqual({ content: [{ type: 'text', text: 'closed' }], isError: true })
    await client.close()
  })

  it('answers a result that arrives before its call', async () => {
    const bridge = new ToolBridge([weatherTool])
    const [serverSide, clientSide] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0.0.0' })
    await Promise.all([bridge.server.connect(serverSide), client.connect(clientSide)])
    bridge.resolve('toolu_early', { content: [{ type: 'text', text: 'early' }] })
    const early = await client.callTool({ name: 'get_weather', arguments: {}, _meta: { 'claudecode/toolUseId': 'toolu_early' } })
    expect(early.content).toEqual([{ type: 'text', text: 'early' }])
    await client.close()
  })
})

describe('tool summaries', () => {
  it('cuts a long summary at 200 characters with an ellipsis', () => {
    const summary = summarizeInput({ command: 'x'.repeat(300) })
    expect(summary).toBe(`${'x'.repeat(199)}…`)
  })

  it('summarizes strings, descriptive fields, other objects, and empty input', () => {
    expect(summarizeInput('  a\n b ')).toBe('a b')
    expect(summarizeInput({ command: 'ls', path: '/x' })).toBe('ls')
    expect(summarizeInput({ command: '', path: '/x' })).toBe('/x')
    expect(summarizeInput({ depth: 2 })).toBe('{"depth":2}')
    expect(summarizeInput({})).toBe('')
    expect(summarizeInput(42)).toBe('')
    expect(summarizeInput(null)).toBe('')
  })

  it('names the tool alone when the input has no summary', () => {
    expect(toolLine('Task', {})).toBe('Task')
    expect(toolLine('Bash', { command: 'ls' })).toBe('Bash: ls')
  })
})
