/**
 * Maps the content blocks of Claude message streams to dsh chunks. Claude
 * restarts block positions at each message; dsh indexes stay unique for the
 * whole response.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/blocks
 */

import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { BRIDGE_TOOL_PREFIX } from './tool-bridge.ts'
import { toolLine } from './tool-summary.ts'

function parseJson(text: string): unknown {
  if (text.length === 0) return {}
  try {
    return JSON.parse(text)
  } catch (_partialToolInput) {
    return {}
  }
}

/** One Claude content block being mapped to dsh chunks. */
type Slot =
  | { kind: 'text'; index: number; text: string }
  | { kind: 'thinking'; index: number | undefined; text: string }
  /** A call to a dsh tool: becomes a dsh tool-call block. */
  | { kind: 'call'; index: number; id: string; name: string; json: string }
  /** A call to any other tool, which Claude Code denies: shown as one reasoning line. */
  | { kind: 'denied'; name: string; json: string }
  | { kind: 'ignored' }

/** Streaming state of one dsh response. */
export class BlockMapper {
  private nextIndex = 0
  private readonly slots = new Map<number, Slot>()
  private readonly ids: string[] = []

  /** `tool_use` ids of the dsh tool calls seen so far, in stream order. */
  get callIds(): readonly string[] {
    return this.ids
  }

  /** Begin a new Claude message; block positions restart. */
  startMessage(): void {
    this.slots.clear()
  }

  /**
   * Handle `content_block_start`.
   * @param position - Claude block position.
   * @param block - the started block.
   * @returns chunks to emit.
   */
  startBlock(position: number, block: Record<string, unknown>): StreamChunk[] {
    switch (block.type) {
      case 'text': {
        const slot: Slot = { kind: 'text', index: this.nextIndex++, text: '' }
        this.slots.set(position, slot)
        const chunks: StreamChunk[] = [{ type: 'block-start', index: slot.index, blockType: 'text' }]
        if (typeof block.text === 'string') chunks.push(...this.appendText(slot, block.text))
        return chunks
      }
      case 'thinking': {
        const slot: Slot = { kind: 'thinking', index: undefined, text: '' }
        this.slots.set(position, slot)
        return this.appendThinking(slot, typeof block.thinking === 'string' ? block.thinking : '')
      }
      case 'tool_use':
      case 'server_tool_use':
      case 'mcp_tool_use':
        return this.startCall(position, block)
      default:
        this.slots.set(position, { kind: 'ignored' })
        return []
    }
  }

  private startCall(position: number, block: Record<string, unknown>): StreamChunk[] {
    const name = typeof block.name === 'string' ? block.name : 'tool'
    const id = typeof block.id === 'string' ? block.id : `call-${this.nextIndex}`
    if (!name.startsWith(BRIDGE_TOOL_PREFIX)) {
      this.slots.set(position, { kind: 'denied', name, json: '' })
      return []
    }
    const slot: Slot = { kind: 'call', index: this.nextIndex++, id, name: name.slice(BRIDGE_TOOL_PREFIX.length), json: '' }
    this.slots.set(position, slot)
    this.ids.push(id)
    return [
      { type: 'block-start', index: slot.index, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: slot.index, id: ToolCallId(id), name: slot.name, argumentsDelta: '' },
    ]
  }

  /**
   * Handle `content_block_delta`.
   * @param position - Claude block position.
   * @param delta - the delta payload.
   * @returns chunks to emit.
   */
  delta(position: number, delta: Record<string, unknown>): StreamChunk[] {
    const slot = this.slots.get(position)
    if (slot === undefined) return []
    if (slot.kind === 'text' && delta.type === 'text_delta' && typeof delta.text === 'string') {
      return this.appendText(slot, delta.text)
    }
    if (slot.kind === 'thinking' && delta.type === 'thinking_delta' && typeof delta.thinking === 'string') {
      return this.appendThinking(slot, delta.thinking)
    }
    if ((slot.kind === 'call' || slot.kind === 'denied') && delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
      slot.json += delta.partial_json
      if (slot.kind === 'call') {
        return [{ type: 'tool-call-delta', index: slot.index, id: ToolCallId(slot.id), argumentsDelta: delta.partial_json }]
      }
    }
    return []
  }

  /**
   * Handle `content_block_stop`.
   * @param position - Claude block position.
   * @returns chunks to emit.
   */
  stopBlock(position: number): StreamChunk[] {
    const slot = this.slots.get(position)
    this.slots.delete(position)
    switch (slot?.kind) {
      case 'text':
        return [{ type: 'block-end', index: slot.index, block: { type: 'text', text: slot.text } }]
      case 'thinking':
        return slot.index === undefined
          ? []
          : [{ type: 'block-end', index: slot.index, block: { type: 'reasoning', text: slot.text } }]
      case 'call':
        return [{
          type: 'block-end',
          index: slot.index,
          block: { type: 'tool-call', id: ToolCallId(slot.id), name: slot.name, arguments: slot.json.length > 0 ? slot.json : '{}' },
        }]
      case 'denied': {
        const index = this.nextIndex++
        const text = toolLine(slot.name, parseJson(slot.json))
        return [
          { type: 'block-start', index, blockType: 'reasoning' },
          { type: 'reasoning-delta', index, text },
          { type: 'block-end', index, block: { type: 'reasoning', text } },
        ]
      }
      default:
        return []
    }
  }

  private appendText(slot: Extract<Slot, { kind: 'text' }>, text: string): StreamChunk[] {
    if (text.length === 0) return []
    slot.text += text
    return [{ type: 'text-delta', index: slot.index, text }]
  }

  /** A thinking block opens on its first non-empty delta, so omitted thinking leaves no empty block. */
  private appendThinking(slot: Extract<Slot, { kind: 'thinking' }>, text: string): StreamChunk[] {
    if (text.length === 0) return []
    const chunks: StreamChunk[] = []
    if (slot.index === undefined) {
      slot.index = this.nextIndex++
      chunks.push({ type: 'block-start', index: slot.index, blockType: 'reasoning' })
    }
    slot.text += text
    chunks.push({ type: 'reasoning-delta', index: slot.index, text })
    return chunks
  }
}
