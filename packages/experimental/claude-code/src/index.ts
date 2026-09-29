/**
 * Claude Code as a dsh model provider. Claude is the model only: each request
 * is a turn of a live Claude Code query under the logged-in Claude account.
 * dsh keeps the tools, approvals, questions, skills, and transcript, and
 * offers its tools to Claude through an in-process MCP server. Claude Code
 * built-in tools, settings files, hooks, and user MCP servers stay off.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code
 */

import { tmpdir } from 'node:os'
import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk'
import type { ModelInfo, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-attachment'
import { ClaudeCodeAdapter } from './adapter.ts'
import { childEnvironment } from './environment.ts'
import { LiveRegistry } from './live.ts'
import { ClaudeModelCatalog } from './models.ts'
import type { CatalogSnapshot } from './models.ts'
import { streamClaudeCode } from './stream.ts'
import type { QueryFunction, StreamDependencies } from './stream.ts'

export { ClaudeCodeAdapter } from './adapter.ts'
export { childEnvironment } from './environment.ts'
export { planConversation } from './conversation.ts'
export type { ConversationPlan, ImageLoader, LiveState, PromptPart, ToolResultInput } from './conversation.ts'
export { LiveQuery, LiveRegistry } from './live.ts'
export { CLAUDE_EFFORTS, ClaudeModelCatalog, FALLBACK_MODELS, modelsFromRows } from './models.ts'
export type { CatalogSnapshot, ClaudeEffort, ClaudeModel } from './models.ts'
export { ToolBridge } from './tool-bridge.ts'
export { streamClaudeCode } from './stream.ts'
export type { QueryFunction, QueryInit, SessionWorkspace, StreamDependencies } from './stream.ts'

export const name = 'experimental-claude-code'
export const inject = ['llm']

const DEFAULT_PROVIDER_NAME = 'claude-code'
const SETTINGS_NAMESPACE = 'experimental-claude-code'
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_TOOL_TIMEOUT_MS = 24 * 60 * 60 * 1000

/** Deployment-owned provider route, thinking display, child environment, and query timeouts. */
export interface Config {
  /** LLM provider route name (default `claude-code`). */
  providerName?: string
  /** Whether Claude returns thinking summaries (`summarized`, default) or none (`omitted`). */
  thinkingDisplay?: 'summarized' | 'omitted'
  /** Variables layered over the child environment after the Claude Code and Anthropic variables are removed. */
  env?: Record<string, string>
  /** Milliseconds a live Claude Code query may sit unused before it closes (default 30 minutes). */
  idleTimeoutMs?: number
  /** Milliseconds one dsh tool call may take, human approval included (default 24 hours; at least 24 hours is advised). */
  toolTimeoutMs?: number
}

export const Config: z<Config> = z.object({
  providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
  thinkingDisplay: z.union(['summarized', 'omitted'] as const).default('summarized'),
  env: z.dict(z.string()).default({}),
  idleTimeoutMs: z.number().min(1).default(DEFAULT_IDLE_TIMEOUT_MS),
  toolTimeoutMs: z.number().min(1000).default(DEFAULT_TOOL_TIMEOUT_MS),
})

/**
 * Read the model rows from a throwaway Claude Code query.
 * @param query - SDK query function.
 * @param env - configured variables layered over the scrubbed environment.
 * @returns the rows from `supportedModels()`.
 */
export async function discoverWithSdk(
  query: QueryFunction,
  env: Readonly<Record<string, string>>,
): Promise<ModelInfo[]> {
  const release = Promise.withResolvers<void>()
  // No message is ever sent, so discovery costs no model tokens.
  const idle = (async function* (): AsyncGenerator<SDKUserMessage> {
    await release.promise
  })()
  const discovery = query({
    prompt: idle,
    options: { cwd: tmpdir(), env: childEnvironment(env), persistSession: false, tools: [] },
  })
  try {
    return await discovery.supportedModels()
  } finally {
    release.resolve()
    discovery.close()
  }
}

/**
 * Register the `claude-code` provider route.
 * @param ctx - context carrying the `llm` service and, optionally, agents and attachments.
 * @param config - provider route, thinking display, child environment, and query timeouts.
 * @param query - SDK query function; tests substitute a fake.
 */
export function install(ctx: Context, config: Config, query: QueryFunction): void {
  const providerName = config.providerName ?? DEFAULT_PROVIDER_NAME
  const env = config.env ?? {}
  const directory = ctx.llm.registerConfigurableProviders([
    { provider: providerName, displayName: 'Claude Code', settingsNs: SETTINGS_NAMESPACE, settingsPath: [] },
  ])
  const catalog = new ClaudeModelCatalog(
    () => discoverWithSdk(query, env),
    (snapshot: CatalogSnapshot) => {
      if (snapshot.diagnostic === undefined) return
      ctx.logger.warn(`experimental-claude-code: ${snapshot.diagnostic}`)
      directory.replace([{
        provider: providerName,
        displayName: 'Claude Code',
        settingsNs: SETTINGS_NAMESPACE,
        settingsPath: [],
        error: snapshot.diagnostic,
      }])
    },
  )
  const registry = new LiveRegistry()
  ctx.on('agent/disposed', ({ agent }) => { registry.close(String(agent.id)) })
  ctx.effect(function* () {
    yield () => { registry.closeAll() }
  }, 'experimental-claude-code live queries')
  const dependencies: StreamDependencies = {
    query,
    providerName,
    thinkingDisplay: config.thinkingDisplay ?? 'summarized',
    env,
    idleTimeoutMs: config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
    toolTimeoutMs: config.toolTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS,
    registry,
    resolveWorkspace: (options) => {
      if (options.sessionId === undefined) return undefined
      const agent = ctx.get('agents')?.get(options.sessionId)
      const cwd = agent?.session.header.cwd
      return agent === undefined || cwd === undefined ? undefined : { agent, cwd }
    },
    loadImage: signal => async (ref) => {
      const attachments = ctx.get('attachments')
      if (attachments === undefined) {
        throw new Error('experimental-claude-code: image input requires the durable attachment service')
      }
      const stored = await attachments.readImage(ref, signal)
      return { mediaType: ref.mediaType, data: Buffer.from(stored.data).toString('base64') }
    },
    onInit: (init) => {
      ctx.logger.debug(`experimental-claude-code: query ${init.claudeSessionId} on ${init.model}, apiKeySource ${init.apiKeySource}`)
    },
  }
  ctx.llm.registerAdapter([providerName], new ClaudeCodeAdapter({
    catalog,
    stream: options => streamClaudeCode(dependencies, options),
  }))
}

/**
 * Register the `claude-code` provider route over the official Agent SDK.
 * @param ctx - context carrying the `llm` service.
 * @param config - provider route, thinking display, child environment, and query timeouts.
 */
export function apply(ctx: Context, config: Config): void {
  install(ctx, config, sdkQuery)
}
