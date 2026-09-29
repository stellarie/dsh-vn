/**
 * Continue, resume, or fresh decision for one request. A request continues the
 * live query when the history ends with that query's last turn plus the tool
 * results it waits for. It resumes a finished Claude session when the history
 * ends with a final answer plus new user input. Every other history starts a
 * fresh session from a labeled transcript.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/conversation
 */

import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { fileHandleText, offloadedImageText } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, Message } from '@deepseek-ai/dsh-llm'

/** One piece of the prompt sent to Claude Code. */
export type PromptPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly mediaType: string; readonly data: string }

/** Reads one durable image as base64 data and its media type. */
export type ImageLoader = (ref: ImageAttachmentRef) => Promise<{ mediaType: string; data: string }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** What a stored replay envelope says about one earlier Claude Code turn. */
export interface TurnEnvelope {
  /** Claude Code session that produced the turn. */
  readonly claudeSessionId: string
  /** Turn counter of the live query when the turn finished; absent in envelopes from before bridge mode. */
  readonly turn: number | undefined
  /** Whether the turn ended with a final answer, so the Claude session can resume after it. */
  readonly stopped: boolean
}

/**
 * Read the envelope this adapter stored on an assistant message.
 * @param message - a history message.
 * @param providerName - the provider route this adapter serves.
 * @returns the envelope, or undefined when the message is not a usable envelope of this route.
 */
export function turnEnvelopeOf(message: Message, providerName: string): TurnEnvelope | undefined {
  if (message.role !== 'assistant' || message.source.kind !== 'model') return undefined
  if (message.source.provider !== providerName) return undefined
  const state = message.source.replayState
  if (!isRecord(state) || !isRecord(state.response)) return undefined
  const { claudeSessionId, turn, stopped } = state.response
  if (typeof claudeSessionId !== 'string' || claudeSessionId.length === 0) return undefined
  return {
    claudeSessionId,
    turn: typeof turn === 'number' ? turn : undefined,
    stopped: stopped !== false,
  }
}

async function renderBlocks(blocks: readonly ContentBlock[], loadImage: ImageLoader): Promise<PromptPart[]> {
  const parts: PromptPart[] = []
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        if (block.text.length > 0) parts.push({ type: 'text', text: block.text })
        break
      case 'reasoning':
        break
      case 'image':
        if (block.offloaded === true) {
          parts.push({ type: 'text', text: offloadedImageText(block.attachment) })
        } else {
          const image = await loadImage(block.attachment)
          parts.push({ type: 'image', mediaType: image.mediaType, data: image.data })
        }
        break
      case 'file':
        parts.push({ type: 'text', text: fileHandleText(block.attachment, undefined) })
        break
      case 'tool-call':
        parts.push({ type: 'text', text: `[tool call ${block.name}] ${block.arguments}` })
        break
      case 'tool-result':
        parts.push({ type: 'text', text: '[tool result]' }, ...await renderBlocks(block.content, loadImage))
        break
      default:
        break
    }
  }
  return parts
}

function joinMessages(groups: readonly (readonly PromptPart[])[]): PromptPart[] {
  const parts: PromptPart[] = []
  groups.forEach((group, position) => {
    if (position > 0) parts.push({ type: 'text', text: '\n\n' })
    parts.push(...group)
  })
  return parts
}

async function transcript(messages: readonly Message[], loadImage: ImageLoader): Promise<PromptPart[]> {
  const conversation = messages.filter(message => message.role !== 'system')
  const first = conversation[0]
  if (conversation.length === 1 && first?.role === 'user') return renderBlocks(first.content, loadImage)
  const groups: PromptPart[][] = [[{
    type: 'text',
    text: 'The conversation so far follows. Reply to the last user message.',
  }]]
  for (const message of conversation) {
    groups.push([
      { type: 'text', text: `[${message.role}]\n` },
      ...await renderBlocks(message.content, loadImage),
    ])
  }
  return joinMessages(groups)
}

/** One dsh tool result to hand to a parked Claude Code tool call. */
export interface ToolResultInput {
  /** Claude `tool_use` id, which is also the dsh tool call id. */
  readonly id: string
  readonly content: readonly ContentBlock[]
  readonly isError: boolean
}

/** Facts about the live query the planner may continue. */
export interface LiveState {
  readonly claudeSessionId: string
  /** Number of turns the live query has finished. */
  readonly turn: number
  /** `tool_use` ids the live query waits on. */
  readonly parkedIds: readonly string[]
  readonly model: string
  readonly effort: string | undefined
  readonly toolsSignature: string
}

/** How one request reaches Claude Code. */
export type ConversationPlan =
  /** Feed the live query: answer its parked tool calls, then queue any extra user content. */
  | { readonly kind: 'continue'; readonly results: readonly ToolResultInput[]; readonly extras: readonly PromptPart[] }
  /** Start a query that resumes a finished Claude session. */
  | { readonly kind: 'resume'; readonly resumeSessionId: string; readonly parts: readonly PromptPart[] }
  /** Start a new Claude session from the history. */
  | { readonly kind: 'fresh'; readonly parts: readonly PromptPart[] }

interface SplitUserMessages {
  readonly results: ToolResultInput[]
  readonly extras: PromptPart[]
}

async function splitUserMessages(messages: readonly Message[], loadImage: ImageLoader): Promise<SplitUserMessages> {
  const results: ToolResultInput[] = []
  const groups: PromptPart[][] = []
  for (const message of messages) {
    const others: ContentBlock[] = []
    for (const block of message.content) {
      if (block.type === 'tool-result') {
        results.push({ id: block.toolCallId, content: block.content, isError: block.isError === true })
      } else {
        others.push(block)
      }
    }
    const parts = await renderBlocks(others, loadImage)
    if (parts.length > 0) groups.push(parts)
  }
  return { results, extras: joinMessages(groups) }
}

function continues(live: LiveState, envelope: TurnEnvelope, results: readonly ToolResultInput[], extras: readonly PromptPart[]): boolean {
  if (envelope.claudeSessionId !== live.claudeSessionId || envelope.turn !== live.turn) return false
  const answered = new Set(results.map(result => result.id))
  const parked = new Set(live.parkedIds)
  if (answered.size !== results.length || answered.size !== parked.size) return false
  if (![...answered].every(id => parked.has(id))) return false
  return parked.size > 0 || extras.length > 0
}

/**
 * Decide how one request reaches Claude Code.
 * @param options - the dsh request.
 * @param providerName - the provider route this adapter serves.
 * @param loadImage - reads durable images for prompt content.
 * @param live - the live query of this Session, when it can take input.
 * @param toolsSignature - signature of the request tools.
 * @returns `continue` when the history extends the live query; `resume` when it extends a finished Claude session; otherwise `fresh`.
 */
export async function planConversation(
  options: GenerateOptions,
  providerName: string,
  loadImage: ImageLoader,
  live?: LiveState,
  toolsSignature?: string,
): Promise<ConversationPlan> {
  const messages = options.messages
  if (options.purpose === undefined) {
    let anchor = -1
    let envelope: TurnEnvelope | undefined
    for (const [position, message] of messages.entries()) {
      const found = turnEnvelopeOf(message, providerName)
      if (found !== undefined) {
        anchor = position
        envelope = found
      }
    }
    const following = messages.slice(anchor + 1)
    if (envelope !== undefined && following.length > 0 && following.every(message => message.role === 'user')) {
      const split = await splitUserMessages(following, loadImage)
      const effort = options.reasoningEffort === undefined ? undefined : String(options.reasoningEffort)
      if (
        live !== undefined
        && live.model === options.model
        && live.effort === effort
        && live.toolsSignature === toolsSignature
        && continues(live, envelope, split.results, split.extras)
      ) {
        return { kind: 'continue', results: split.results, extras: split.extras }
      }
      if (envelope.stopped && split.results.length === 0) {
        return { kind: 'resume', resumeSessionId: envelope.claudeSessionId, parts: split.extras }
      }
    }
  }
  return { kind: 'fresh', parts: await transcript(messages, loadImage) }
}

/**
 * Convert one dsh tool result to MCP content.
 * @param blocks - dsh result content.
 * @param loadImage - reads durable images.
 * @returns text and image content; an empty result becomes one placeholder text.
 */
export async function toolResultContent(
  blocks: readonly ContentBlock[],
  loadImage: ImageLoader,
): Promise<({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[]> {
  const parts = await renderBlocks(blocks, loadImage)
  const content = parts.map(part => (part.type === 'text'
    ? { type: 'text' as const, text: part.text }
    : { type: 'image' as const, data: part.data, mimeType: part.mediaType }))
  return content.length > 0 ? content : [{ type: 'text', text: '(no output)' }]
}

/**
 * Collect the system text of a request.
 * @param options - the dsh request.
 * @returns the joined `system` field and leading system messages, or undefined when empty.
 */
export function systemTextOf(options: GenerateOptions): string | undefined {
  const texts: string[] = []
  if (options.system !== undefined && options.system.length > 0) texts.push(options.system)
  for (const message of options.messages) {
    if (message.role !== 'system') continue
    for (const block of message.content) {
      if (block.type === 'text' && block.text.length > 0) texts.push(block.text)
    }
  }
  return texts.length === 0 ? undefined : texts.join('\n\n')
}
