/**
 * One dsh request as a turn of a live Claude Code query. Claude is the model
 * only: dsh tools are offered through an in-process MCP server, each tool call
 * ends the dsh response with a tool-use finish, and the next request carries
 * the results back into the same query.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/stream
 */

import type { Options } from '@anthropic-ai/claude-agent-sdk'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { LlmError } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { planConversation, systemTextOf, toolResultContent } from './conversation.ts'
import type { ImageLoader } from './conversation.ts'
import { childEnvironment } from './environment.ts'
import { LiveQuery } from './live.ts'
import type { LiveRegistry, QueryFunction, QueryInit } from './live.ts'
import { isClaudeEffort } from './models.ts'
import { toolsSignature } from './tool-bridge.ts'

export type { QueryFunction, QueryInit } from './live.ts'

/** A Session's live Agent and its working directory. */
export interface SessionWorkspace {
  readonly agent: Agent
  readonly cwd: string
}

/** Everything one stream needs from the plugin. */
export interface StreamDependencies {
  readonly query: QueryFunction
  readonly providerName: string
  readonly thinkingDisplay: 'summarized' | 'omitted'
  /** Configured variables layered over the scrubbed environment. */
  readonly env: Readonly<Record<string, string>>
  /** Environment to scrub; defaults to `process.env`. */
  readonly parentEnv?: NodeJS.ProcessEnv
  /** Milliseconds an unused live query stays open. */
  readonly idleTimeoutMs: number
  /** Milliseconds a bridged tool call may wait for its dsh result. */
  readonly toolTimeoutMs: number
  /** Live queries of this adapter. */
  readonly registry: LiveRegistry
  /** Finds the Agent and cwd of the request Session. */
  readonly resolveWorkspace: (options: GenerateOptions) => SessionWorkspace | undefined
  /** Reads durable images for prompt content. */
  readonly loadImage: (signal: AbortSignal | undefined) => ImageLoader
  /** Observes the init message of each query. */
  readonly onInit?: (init: QueryInit) => void
}

const ABORTED: StreamChunk = {
  type: 'finish',
  reason: { kind: 'aborted', failure: { message: 'Claude Code request aborted by caller', code: 'ABORTED' } },
}

/**
 * Run one dsh request as a turn of a Claude Code query.
 * @param deps - plugin services and configuration.
 * @param options - the dsh request; its tools and system text reach Claude.
 * @returns dsh chunks ending in exactly one `finish`.
 * @throws {LlmError} `CLAUDE_CODE_NO_WORKSPACE` when the Session directory is unresolved.
 * @throws {LlmError} `UNSUPPORTED_REASONING_EFFORT` for an unknown effort.
 */
export async function* streamClaudeCode(
  deps: StreamDependencies,
  options: GenerateOptions,
): AsyncGenerator<StreamChunk> {
  const workspace = deps.resolveWorkspace(options)
  if (workspace === undefined) {
    throw new LlmError(
      'claude-code: the request Session has no live agent or working directory; refusing to run in another directory',
      'CLAUDE_CODE_NO_WORKSPACE',
    )
  }
  const effort = options.reasoningEffort === undefined ? undefined : String(options.reasoningEffort)
  if (effort !== undefined && !isClaudeEffort(effort)) {
    throw new LlmError(`claude-code does not support reasoning effort "${effort}"`, 'UNSUPPORTED_REASONING_EFFORT')
  }
  const signal = options.signal
  const isAborted = (): boolean => signal?.aborted === true
  if (isAborted()) {
    yield ABORTED
    return
  }

  const auxiliary = options.purpose !== undefined
  const key = String(options.sessionId)
  const tools = auxiliary ? [] : options.tools ?? []
  const existing = auxiliary ? undefined : deps.registry.get(key)
  const loadImage = deps.loadImage(signal)
  const plan = await planConversation(options, deps.providerName, loadImage, existing?.liveState, toolsSignature(tools))
  if (isAborted()) {
    existing?.close(true)
    yield ABORTED
    return
  }

  let live: LiveQuery
  if (plan.kind === 'continue') {
    // The planner returns `continue` only for the live query it was given.
    const parked = existing as LiveQuery
    const answers = await Promise.all(plan.results.map(async result => ({
      id: result.id,
      content: await toolResultContent(result.content, loadImage),
      isError: result.isError,
    })))
    if (isAborted()) {
      parked.close(true)
      yield ABORTED
      return
    }
    for (const answer of answers) parked.answer(answer.id, { content: answer.content, isError: answer.isError })
    if (plan.extras.length > 0) parked.push(plan.extras)
    live = parked
  } else {
    existing?.close(true)
    const sdk: Options = {
      ...options.model === 'default' ? {} : { model: options.model },
      ...effort === undefined ? {} : { effort },
      thinking: options.purpose === 'session-title'
        ? { type: 'disabled' }
        : { type: 'adaptive', display: deps.thinkingDisplay },
      includePartialMessages: true,
      cwd: workspace.cwd,
      env: childEnvironment(deps.env, deps.parentEnv),
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      systemPrompt: systemTextOf(options) ?? '',
      persistSession: !auxiliary,
      ...plan.kind === 'resume' ? { resume: plan.resumeSessionId } : {},
    }
    live = new LiveQuery({
      query: deps.query,
      sdk,
      tools,
      model: options.model,
      effort,
      persist: !auxiliary,
      idleTimeoutMs: deps.idleTimeoutMs,
      toolTimeoutMs: deps.toolTimeoutMs,
      ...deps.onInit === undefined ? {} : { onInit: deps.onInit },
      onClosed: () => { deps.registry.release(key, live) },
    }, plan.parts)
    if (!auxiliary) deps.registry.register(key, live)
  }

  try {
    yield* live.drive(signal)
  } finally {
    if (auxiliary) live.close(false)
  }
}
