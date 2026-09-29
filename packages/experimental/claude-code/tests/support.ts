/** Test doubles for the Claude Agent SDK: a scripted `query` that models the Claude Code side of the dsh MCP bridge. */

import type { ModelInfo, Options, Query, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createAssistantMessage, createToolResultMessage, createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, Message, StreamChunk, ToolSchema } from '@deepseek-ai/dsh-llm'
import { LiveRegistry } from '../src/live.ts'
import type { QueryFunction } from '../src/live.ts'
import type { StreamDependencies } from '../src/stream.ts'

/** Optional overrides that never hold `undefined`, which `exactOptionalPropertyTypes` forbids. */
type Overrides<T> = { [K in keyof T]?: Exclude<T[K], undefined> }

/** One recorded `query()` call and the live state of its fake process. */
export interface FakeCall {
  readonly prompt: AsyncIterable<SDKUserMessage>
  readonly options: Options
  interrupted: boolean
  closed: boolean
  /** Every user message the adapter pushed so far. */
  readonly userMessages: SDKUserMessage[]
  /** Wait for the next user message the script has not read yet. */
  nextUser(): Promise<SDKUserMessage>
  /** Connect to the `dsh` MCP server the way Claude Code does. */
  mcp(): Promise<Client>
  /** Call a bridged tool the way Claude Code does, tagged with a `tool_use` id. */
  callTool(name: string, args: Record<string, unknown>, toolUseId: string): Promise<CallToolResult>
}

/** A script yields raw SDK messages and may await call state to model a live process. */
export type Script = (call: FakeCall) => AsyncIterable<unknown>

/**
 * Build a `query` double.
 * @param script - the messages the fake process emits for one call.
 * @param rows - rows returned by `supportedModels()`; an Error makes it reject.
 * @returns the fake function and every recorded call.
 */
export function fakeSdk(script: Script, rows: readonly ModelInfo[] | Error = []): { query: QueryFunction; calls: FakeCall[] } {
  const calls: FakeCall[] = []
  const query: QueryFunction = ({ prompt, options }) => {
    if (typeof prompt === 'string') throw new Error('the adapter always streams input')
    const seen: SDKUserMessage[] = []
    const waiting: Array<() => void> = []
    let read = 0
    let client: Promise<Client> | undefined
    const call: FakeCall = {
      prompt,
      options: options ?? {},
      interrupted: false,
      closed: false,
      userMessages: seen,
      async nextUser() {
        while (read >= seen.length) await new Promise<void>((resolve) => { waiting.push(resolve) })
        return seen[read++]!
      },
      mcp() {
        client ??= (async () => {
          const server = (call.options.mcpServers?.dsh as unknown as { instance: McpServer }).instance
          const [serverSide, clientSide] = InMemoryTransport.createLinkedPair()
          const connected = new Client({ name: 'fake-claude-code', version: '0.0.0' })
          await Promise.all([server.connect(serverSide), connected.connect(clientSide)])
          return connected
        })()
        return client
      },
      async callTool(name, args, toolUseId) {
        const connected = await call.mcp()
        return await connected.callTool(
          { name, arguments: args, _meta: { 'claudecode/toolUseId': toolUseId } },
          undefined,
          { timeout: 60_000_000 },
        ) as CallToolResult
      },
    }
    calls.push(call)
    void (async () => {
      for await (const message of prompt) {
        seen.push(message)
        for (const resume of waiting.splice(0)) resume()
      }
    })()
    const iterator = script(call)[Symbol.asyncIterator]()
    const fake = {
      next: () => iterator.next(),
      return: () => Promise.resolve({ done: true as const, value: undefined }),
      throw: (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
      [Symbol.asyncIterator]() { return fake },
      interrupt: () => {
        call.interrupted = true
        return Promise.resolve(undefined)
      },
      close: () => { call.closed = true },
      supportedModels: () => (rows instanceof Error ? Promise.reject(rows) : Promise.resolve([...rows])),
    }
    return fake as unknown as Query
  }
  return { query, calls }
}

/** The text of a user message the adapter pushed. */
export function textOf(message: SDKUserMessage | undefined): string {
  const content = message?.message.content
  if (typeof content === 'string') return content
  if (content === undefined) throw new Error('expected a user message')
  return content.map(block => (block.type === 'text' ? block.text : `<${block.type}>`)).join('')
}

/** Yield raw messages in order, after the first user message arrives. */
export function emits(...messages: unknown[]): Script {
  return call => (async function* () {
    yield messages[0]
    await call.nextUser()
    yield* messages.slice(1)
  })()
}

export const init = (sessionId = 'claude-session-1', apiKeySource = 'none') => ({
  type: 'system', subtype: 'init', session_id: sessionId, model: 'claude-test', apiKeySource,
})

const event = (payload: Record<string, unknown>, parent: string | null = null) => ({
  type: 'stream_event', event: payload, parent_tool_use_id: parent, uuid: 'u', session_id: 's',
})

export const messageStart = (usage?: Record<string, unknown>) =>
  event({ type: 'message_start', message: usage === undefined ? {} : { usage } })
export const messageDelta = (stopReason: string, outputTokens = 3) =>
  event({ type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: outputTokens } })
export const blockStart = (index: number, block: Record<string, unknown>, parent: string | null = null) =>
  event({ type: 'content_block_start', index, content_block: block }, parent)
export const blockDelta = (index: number, delta: Record<string, unknown>, parent: string | null = null) =>
  event({ type: 'content_block_delta', index, delta }, parent)
export const blockStop = (index: number) => event({ type: 'content_block_stop', index })
export const thinkingDelta = (index: number, thinking: string) => blockDelta(index, { type: 'thinking_delta', thinking })
export const textDelta = (index: number, text: string) => blockDelta(index, { type: 'text_delta', text })

/** A complete streamed `tool_use` block for a bridged dsh tool. */
export function toolUse(index: number, id: string, tool: string, input: Record<string, unknown>): unknown[] {
  return [
    blockStart(index, { type: 'tool_use', id, name: `mcp__dsh__${tool}`, input: {} }),
    blockDelta(index, { type: 'input_json_delta', partial_json: JSON.stringify(input) }),
    blockStop(index),
  ]
}

export const success = (sessionId = 'claude-session-1', extra: Record<string, unknown> = {}) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'done',
  stop_reason: 'end_turn',
  session_id: sessionId,
  usage: { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: 5, cache_creation_input_tokens: 2 },
  ...extra,
})

/** A minimal live Agent: only the session header is read. */
export function fakeAgent(cwd: string | null = '/work/project'): Agent {
  return { session: { header: cwd === null ? {} : { cwd } } } as unknown as Agent
}

/** Calls that ran a request, excluding model-discovery queries. */
export function requestCalls(calls: readonly FakeCall[]): FakeCall[] {
  return calls.filter(call => call.options.includePartialMessages === true)
}

/** Stream dependencies over a fake query, with a resolvable workspace by default. */
export function dependencies(query: QueryFunction, overrides: Overrides<StreamDependencies> = {}): StreamDependencies {
  const agent = fakeAgent()
  return {
    query,
    providerName: 'claude-code',
    thinkingDisplay: 'summarized',
    env: {},
    parentEnv: {},
    idleTimeoutMs: 60_000,
    toolTimeoutMs: 86_400_000,
    registry: new LiveRegistry(),
    resolveWorkspace: () => ({ agent, cwd: '/work/project' }),
    loadImage: () => () => Promise.reject(new Error('no image expected')),
    ...overrides,
  }
}

export const weatherTool: ToolSchema = {
  name: 'get_weather',
  description: 'Weather for a city',
  parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
}

export const user = (text: string): Message => createUserMessage({
  content: [{ type: 'text', text }],
  source: { kind: 'user' },
})

export const assistant = (text: string, provider = 'claude-code', replayState?: unknown): Message => createAssistantMessage({
  content: [{ type: 'text', text }],
  source: { provider, model: 'sonnet', ...replayState === undefined ? {} : { replayState } },
})

/** An assistant message that calls dsh tools, carrying the envelope the adapter stored. */
export function assistantCalling(calls: Array<[id: string, name: string, args: string]>, replayState?: unknown): Message {
  return createAssistantMessage({
    content: calls.map(([id, name, args]): ContentBlock => ({ type: 'tool-call', id: ToolCallId(id), name, arguments: args })),
    source: { provider: 'claude-code', model: 'sonnet', ...replayState === undefined ? {} : { replayState } },
  })
}

/** A dsh tool result message. */
export function toolResult(id: string, text: string, isError = false): Message {
  return createToolResultMessage({ callId: ToolCallId(id), content: [{ type: 'text', text }], isError })
}

export function request(messages: Message[], overrides: Overrides<GenerateOptions> = {}): GenerateOptions {
  return { provider: 'claude-code', model: 'sonnet', messages, sessionId: 's-1', ...overrides } as GenerateOptions
}

/** Drain a chunk stream. */
export async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

/** The replay state of a terminal finish chunk. */
export function replayOf(chunks: readonly StreamChunk[]): unknown {
  const finish = chunks.at(-1)
  return finish?.type === 'finish' ? finish.replayState : undefined
}

/** Wait until a condition holds, yielding to the event loop between checks. */
export async function until(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 400 && !condition(); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1))
  if (!condition()) throw new Error('condition never held')
}
