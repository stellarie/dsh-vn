/**
 * Permission callback for Claude Code. dsh owns approval for every tool it
 * runs, so Claude Code allows the bridged dsh tools and denies everything else.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/permissions
 */

import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk'
import { BRIDGE_TOOL_PREFIX } from './tool-bridge.ts'

/**
 * Allow a `mcp__dsh__*` tool and deny any other tool.
 * @param toolName - Claude Code tool name.
 * @param input - tool input, returned unchanged on allow.
 * @returns the permission decision.
 */
export const allowBridgeToolsOnly: CanUseTool = (toolName, input) => Promise.resolve(
  toolName.startsWith(BRIDGE_TOOL_PREFIX)
    ? { behavior: 'allow', updatedInput: input }
    : { behavior: 'deny', message: `Only dsh tools are available. ${toolName} is not one of them.` },
)
