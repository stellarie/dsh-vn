/**
 * In-process MCP server named `dsh`. It lists the dsh tools of a request to
 * Claude Code and parks each Claude Code tool call until the dsh agent loop
 * returns the tool result on a later request.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/tool-bridge
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'

/** Server name; Claude Code prefixes every tool with `mcp__dsh__`. */
export const BRIDGE_SERVER_NAME = 'dsh'

/** Prefix Claude Code puts on the name of every bridged tool. */
export const BRIDGE_TOOL_PREFIX = `mcp__${BRIDGE_SERVER_NAME}__`

/** `_meta` key that carries the Claude `tool_use` id of a tool call. */
const TOOL_USE_ID_KEY = 'claudecode/toolUseId'

/**
 * Stable text form of a tool set, used to detect a change between requests.
 * @param tools - dsh tool schemas.
 * @returns a string that differs whenever a name, description, or schema differs.
 */
export function toolsSignature(tools: readonly ToolSchema[]): string {
  return JSON.stringify(tools.map(tool => [tool.name, tool.description, tool.parameters]))
}

interface Waiter {
  promise: Promise<CallToolResult>
  resolve: (result: CallToolResult) => void
}

function waiter(): Waiter {
  const { promise, resolve } = Promise.withResolvers<CallToolResult>()
  return { promise, resolve }
}

/** The `dsh` MCP server plus the table of tool calls that wait for a result. */
export class ToolBridge {
  /** The server instance passed to the SDK as an in-process MCP server. */
  readonly server: McpServer
  private readonly waiters = new Map<string, Waiter>()

  /**
   * @param tools - dsh tools to list; the list is fixed for the life of the bridge.
   */
  constructor(private readonly tools: readonly ToolSchema[]) {
    this.server = new McpServer({ name: BRIDGE_SERVER_NAME, version: '0.0.0' }, { capabilities: { tools: {} } })
    this.server.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { ...tool.parameters, type: 'object' as const },
      })),
    }))
    this.server.server.setRequestHandler(CallToolRequestSchema, (request) => {
      const meta: unknown = request.params._meta
      const id = typeof meta === 'object' && meta !== null
        ? (meta as Record<string, unknown>)[TOOL_USE_ID_KEY]
        : undefined
      if (typeof id !== 'string') {
        return { content: [{ type: 'text' as const, text: 'The tool call carried no tool use id.' }], isError: true }
      }
      return this.slot(id).promise
    })
  }

  private slot(id: string): Waiter {
    let slot = this.waiters.get(id)
    if (slot === undefined) {
      slot = waiter()
      this.waiters.set(id, slot)
    }
    return slot
  }

  /**
   * Answer one parked tool call. A result that arrives before its call waits for the call.
   * @param id - Claude `tool_use` id.
   * @param result - MCP result to return to Claude Code.
   */
  resolve(id: string, result: CallToolResult): void {
    this.slot(id).resolve(result)
  }

  /**
   * Answer every parked tool call with an error so Claude Code stops waiting.
   * @param message - error text returned as the tool result.
   */
  abandon(message: string): void {
    for (const slot of this.waiters.values()) {
      slot.resolve({ content: [{ type: 'text', text: message }], isError: true })
    }
  }
}
