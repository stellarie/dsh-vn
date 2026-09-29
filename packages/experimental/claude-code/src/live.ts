/**
 * One Claude Code query kept alive across dsh requests. Claude is the model
 * only: it asks for dsh tools through the `dsh` MCP server, the query parks
 * while dsh runs them, and the next dsh request feeds the results back.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/live
 */

import type {
  ApiKeySource,
  Options,
  Query,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { LlmFailure, StreamChunk, TokenUsage, ToolSchema } from '@deepseek-ai/dsh-llm'
import { BlockMapper } from './blocks.ts'
import type { LiveState, PromptPart } from './conversation.ts'
import { allowBridgeToolsOnly } from './permissions.ts'
import { BRIDGE_SERVER_NAME, ToolBridge, toolsSignature } from './tool-bridge.ts'

/** The SDK `query` function; tests substitute a fake. */
export type QueryFunction = (params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}) => Query

/** Facts the query reports when it starts. */
export interface QueryInit {
  readonly claudeSessionId: string
  readonly model: string
  readonly apiKeySource: ApiKeySource
}

/** Everything needed to start one live query. */
export interface LiveOptions {
  readonly query: QueryFunction
  /** Query options other than input, cancellation, permission callback, and MCP servers. */
  readonly sdk: Options
  /** dsh tools to expose; an empty list mounts no MCP server. */
  readonly tools: readonly ToolSchema[]
  readonly model: string
  readonly effort: string | undefined
  /** Whether Claude Code persists the session, which later resumes need. */
  readonly persist: boolean
  /** Milliseconds a query may sit unused before it closes. */
  readonly idleTimeoutMs: number
  /** Milliseconds one bridged tool call may wait for its result. */
  readonly toolTimeoutMs: number
  readonly onInit?: ((init: QueryInit) => void) | undefined
  /** Called once when the query closes for any reason. */
  readonly onClosed: () => void
}

/** Lifecycle of a live query. */
export type LiveStatus = 'idle' | 'streaming' | 'parked' | 'closed'

const ABORT_FAILURE: LlmFailure = { message: 'Claude Code request aborted by caller', code: 'ABORTED' }

/** Stable failure codes; none is retryable, because a Claude Code run may already have acted. */
const RESULT_ERROR_CODES: Record<string, string> = {
  error_during_execution: 'CLAUDE_CODE_EXECUTION_FAILED',
  error_max_turns: 'CLAUDE_CODE_MAX_TURNS',
  error_max_budget_usd: 'CLAUDE_CODE_MAX_BUDGET',
  error_max_structured_output_retries: 'CLAUDE_CODE_STRUCTURED_OUTPUT_FAILED',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function addUsage(total: TokenUsage, part: TokenUsage): TokenUsage {
  const sum = (a: number | undefined, b: number | undefined): number | undefined => (
    a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0)
  )
  const cacheRead = sum(total.cacheReadTokens, part.cacheReadTokens)
  const cacheWrite = sum(total.cacheWriteTokens, part.cacheWriteTokens)
  return {
    inputTokens: total.inputTokens + part.inputTokens,
    outputTokens: total.outputTokens + part.outputTokens,
    ...cacheRead === undefined ? {} : { cacheReadTokens: cacheRead },
    ...cacheWrite === undefined ? {} : { cacheWriteTokens: cacheWrite },
  }
}

function usageOf(record: Record<string, unknown>): TokenUsage {
  const cacheRead = count(record.cache_read_input_tokens)
  const cacheWrite = count(record.cache_creation_input_tokens)
  return {
    inputTokens: count(record.input_tokens) ?? 0,
    outputTokens: count(record.output_tokens) ?? 0,
    ...cacheRead === undefined ? {} : { cacheReadTokens: cacheRead },
    ...cacheWrite === undefined ? {} : { cacheWriteTokens: cacheWrite },
  }
}

function failureOf(result: SDKResultMessage, assistantError: string | undefined): LlmFailure | undefined {
  if (result.subtype !== 'success') {
    const detail = result.errors.join('; ')
    return {
      message: `Claude Code stopped with ${result.subtype}${detail === '' ? '' : `: ${detail}`}`,
      code: RESULT_ERROR_CODES[result.subtype] ?? 'CLAUDE_CODE_FAILED',
    }
  }
  if (!result.is_error) return undefined
  const status = result.api_error_status
  return {
    message: result.result === '' ? 'Claude Code reported an error' : result.result,
    code: assistantError === undefined ? 'CLAUDE_CODE_RESULT_ERROR' : `CLAUDE_CODE_${assistantError.toUpperCase()}`,
    ...typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? { status } : {},
  }
}

function userMessage(parts: readonly PromptPart[]): SDKUserMessage {
  const texts = parts.flatMap(part => (part.type === 'text' ? [part.text] : []))
  const content = texts.length === parts.length
    ? texts.join('')
    : parts.map(part => (part.type === 'text'
      ? { type: 'text' as const, text: part.text }
      : {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: part.mediaType as 'image/png', data: part.data },
      }))
  return { type: 'user', message: { role: 'user', content }, parent_tool_use_id: null }
}

/** One Claude Code query and the dsh tool calls it waits on. */
export class LiveQuery {
  /** Turns finished so far; stored in each replay envelope to match history to this query. */
  turn = 0
  private status: LiveStatus = 'idle'
  private parked: string[] = []
  private sessionId = ''
  private readonly bridge: ToolBridge | undefined
  private readonly signature: string
  private readonly controller = new AbortController()
  private readonly query: Query
  private readonly iterator: AsyncIterator<SDKMessage>
  private readonly inbox: SDKUserMessage[] = []
  private wake: (() => void) | undefined
  private idleTimer: NodeJS.Timeout | undefined

  /**
   * Start the Claude Code process with a first user message.
   * @param init - query function, options, tools, and lifecycle hooks.
   * @param first - content of the first user message.
   */
  constructor(private readonly init: LiveOptions, first: readonly PromptPart[]) {
    this.signature = toolsSignature(init.tools)
    this.bridge = init.tools.length === 0 ? undefined : new ToolBridge(init.tools)
    this.inbox.push(userMessage(first))
    this.query = init.query({
      prompt: this.inputs(),
      options: {
        ...init.sdk,
        abortController: this.controller,
        canUseTool: allowBridgeToolsOnly,
        ...this.bridge === undefined
          ? {}
          : {
            mcpServers: {
              [BRIDGE_SERVER_NAME]: {
                type: 'sdk',
                name: BRIDGE_SERVER_NAME,
                instance: this.bridge.server,
                timeout: init.toolTimeoutMs,
              },
            },
          },
      },
    })
    this.iterator = this.query[Symbol.asyncIterator]()
  }

  private async * inputs(): AsyncGenerator<SDKUserMessage> {
    while (this.status !== 'closed') {
      const next = this.inbox.shift()
      if (next !== undefined) {
        yield next
        continue
      }
      await new Promise<void>((resolve) => { this.wake = resolve })
    }
  }

  /** Lifecycle status. */
  get state(): LiveStatus {
    return this.status
  }

  /** What the planner needs to decide whether a request continues this query; undefined while it cannot take input. */
  get liveState(): LiveState | undefined {
    if (this.status !== 'idle' && this.status !== 'parked') return undefined
    return {
      claudeSessionId: this.sessionId,
      turn: this.turn,
      parkedIds: this.parked,
      model: this.init.model,
      effort: this.init.effort,
      toolsSignature: this.signature,
    }
  }

  /**
   * Queue a user message; Claude Code folds it into the running turn or starts the next one.
   * @param parts - message content.
   */
  push(parts: readonly PromptPart[]): void {
    this.inbox.push(userMessage(parts))
    this.wake?.()
  }

  /**
   * Answer a parked tool call.
   * @param id - Claude `tool_use` id.
   * @param result - MCP result.
   */
  answer(id: string, result: CallToolResult): void {
    this.bridge?.resolve(id, result)
  }

  private armIdleTimer(): void {
    this.idleTimer = setTimeout(() => { this.close(false) }, this.init.idleTimeoutMs)
    this.idleTimer.unref()
  }

  /**
   * End the query and its process.
   * @param interrupt - ask Claude Code to stop the running turn first.
   */
  close(interrupt: boolean): void {
    if (this.status === 'closed') return
    this.status = 'closed'
    clearTimeout(this.idleTimer)
    if (interrupt) {
      Promise.resolve().then(() => this.query.interrupt()).catch((_interruptFailure: unknown) => {
        // The query may already be closed; the controller below ends the process either way.
      })
    }
    this.bridge?.abandon('The Claude Code query closed before this tool call finished.')
    this.controller.abort()
    this.wake?.()
    try {
      this.query.close()
    } catch (_closeFailure) {
      // The process is already ending; a close failure adds no outcome.
    }
    this.init.onClosed()
  }

  private finishFailure(failure: LlmFailure, kind: 'error' | 'aborted'): StreamChunk {
    return { type: 'finish', reason: { kind, failure } }
  }

  private response(model: string, stopped: boolean): { response: Record<string, unknown> } {
    return {
      response: {
        claudeSessionId: this.sessionId,
        model,
        ...this.init.effort === undefined ? {} : { effort: this.init.effort },
        turn: this.turn,
        stopped,
      },
    }
  }

  /**
   * Stream chunks until the current dsh response ends: a tool-use stop, a final answer, a failure, or an abort.
   * @param signal - request cancellation; an abort closes the query at once.
   * @returns dsh chunks ending in exactly one `finish`.
   */
  async * drive(signal: AbortSignal | undefined): AsyncGenerator<StreamChunk> {
    clearTimeout(this.idleTimer)
    this.status = 'streaming'
    const aborted = Promise.withResolvers<'aborted'>()
    const onAbort = (): void => {
      this.close(true)
      aborted.resolve('aborted')
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    const mapper = new BlockMapper()
    let assistantError: string | undefined
    let total: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    let current: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    let sawUsage = false
    const isAborted = (): boolean => signal?.aborted === true
    const usage = (): TokenUsage => addUsage(total, current)
    try {
      while (true) {
        const pending = this.iterator.next()
        pending.catch((_lateFailure: unknown) => {
          // A pull that loses the abort race may reject later; the abort already decided the outcome.
        })
        const step = await Promise.race([pending, aborted.promise])
        if (step === 'aborted' || isAborted()) {
          this.close(true)
          yield this.finishFailure(ABORT_FAILURE, 'aborted')
          return
        }
        if (step.done) break
        const message: SDKMessage = step.value
        if (message.type === 'system' && message.subtype === 'init') {
          this.sessionId = message.session_id
          this.init.onInit?.({ claudeSessionId: message.session_id, model: message.model, apiKeySource: message.apiKeySource })
        } else if (message.type === 'assistant') {
          if (message.error !== undefined) assistantError = message.error
        } else if (message.type === 'stream_event') {
          if (message.parent_tool_use_id !== null) continue
          const event: unknown = message.event
          if (!isRecord(event)) continue
          const position = typeof event.index === 'number' ? event.index : -1
          if (event.type === 'message_start') {
            mapper.startMessage()
            if (isRecord(event.message) && isRecord(event.message.usage)) {
              total = addUsage(total, current)
              current = usageOf(event.message.usage)
              sawUsage = true
            }
          } else if (event.type === 'content_block_start' && isRecord(event.content_block)) {
            yield* mapper.startBlock(position, event.content_block)
          } else if (event.type === 'content_block_delta' && isRecord(event.delta)) {
            yield* mapper.delta(position, event.delta)
          } else if (event.type === 'content_block_stop') {
            yield* mapper.stopBlock(position)
          } else if (event.type === 'message_delta') {
            const outputTokens = isRecord(event.usage) ? count(event.usage.output_tokens) : undefined
            if (sawUsage && outputTokens !== undefined) current = { ...current, outputTokens }
            const stop = isRecord(event.delta) ? event.delta.stop_reason : undefined
            if (stop === 'tool_use' && mapper.callIds.length > 0) {
              this.turn += 1
              this.parked = [...mapper.callIds]
              this.status = 'parked'
              this.armIdleTimer()
              yield { type: 'usage', usage: usage() }
              yield {
                type: 'finish',
                reason: { kind: 'tool-calls' },
                replayState: this.response(this.init.model, false),
              }
              return
            }
          }
        } else if (message.type === 'result') {
          this.sessionId = message.session_id
          yield { type: 'usage', usage: sawUsage ? usage() : usageOf(isRecord(message.usage) ? message.usage : {}) }
          const failure = failureOf(message, assistantError)
          if (failure !== undefined) {
            this.close(false)
            yield this.finishFailure(failure, 'error')
            return
          }
          this.turn += 1
          this.parked = []
          this.status = 'idle'
          this.armIdleTimer()
          const kind = message.stop_reason === 'max_tokens' ? 'max-tokens' : 'stop'
          yield this.init.persist
            ? { type: 'finish', reason: { kind }, replayState: this.response(this.init.model, true) }
            : { type: 'finish', reason: { kind } }
          return
        }
      }
      this.close(false)
      yield this.finishFailure({ message: 'Claude Code ended without a result', code: 'CLAUDE_CODE_NO_RESULT' }, 'error')
    } catch (error: unknown) {
      const wasAborted = isAborted()
      this.close(wasAborted)
      if (wasAborted) {
        yield this.finishFailure(ABORT_FAILURE, 'aborted')
        return
      }
      const detail = error instanceof Error ? error.message : String(error)
      yield this.finishFailure({ message: `Claude Code process failed: ${detail}`, code: 'CLAUDE_CODE_PROCESS_FAILED' }, 'error')
    } finally {
      signal?.removeEventListener('abort', onAbort)
      // A consumer that stops early leaves the turn half read; the query cannot be reused.
      if (this.status === 'streaming') this.close(true)
    }
  }
}

/** Live queries of one adapter, keyed by dsh Session id. */
export class LiveRegistry {
  private readonly lives = new Map<string, LiveQuery>()

  /**
   * Find the live query of a Session.
   * @param key - dsh Session id.
   * @returns the live query, when one exists.
   */
  get(key: string): LiveQuery | undefined {
    return this.lives.get(key)
  }

  /**
   * Record the live query of a Session. The caller closes any earlier query of that Session first.
   * @param key - dsh Session id.
   * @param live - the new live query.
   */
  register(key: string, live: LiveQuery): void {
    this.lives.set(key, live)
  }

  /**
   * Forget a live query that closed.
   * @param key - dsh Session id.
   * @param live - the closed query; a newer query for the same Session stays.
   */
  release(key: string, live: LiveQuery): void {
    if (this.lives.get(key) === live) this.lives.delete(key)
  }

  /**
   * Close the live query of one Session.
   * @param key - dsh Session id.
   */
  close(key: string): void {
    this.lives.get(key)?.close(true)
  }

  /** Close every live query. */
  closeAll(): void {
    for (const live of [...this.lives.values()]) live.close(true)
  }
}
