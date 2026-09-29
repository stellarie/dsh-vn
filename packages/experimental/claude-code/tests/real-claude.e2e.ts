/**
 * Real Claude Code smoke through the adapter. It spends a few subscription
 * tokens on model `haiku`, so it runs only with `DSH_CLAUDE_CODE_E2E=1` and a
 * logged-in Claude Code installation.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BlockAssembler, createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { Message } from '@deepseek-ai/dsh-llm'
import { ClaudeCodeAdapter } from '../src/adapter.ts'
import { discoverWithSdk } from '../src/index.ts'
import { LiveRegistry } from '../src/live.ts'
import { ClaudeModelCatalog } from '../src/models.ts'
import { streamClaudeCode } from '../src/stream.ts'
import type { QueryInit } from '../src/stream.ts'
import { fakeAgent, request, toolResult, user, weatherTool } from './support.ts'

const enabled = process.env.DSH_CLAUDE_CODE_E2E === '1'

describe.skipIf(!enabled)('claude-code adapter against the real runtime', () => {
  let cwd: string
  beforeAll(async () => { cwd = await mkdtemp(join(tmpdir(), 'dsh-claude-code-e2e-')) })
  afterAll(async () => {
    // The Claude Code process can hold the directory briefly after it is closed.
    await rm(cwd, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }).catch(() => {})
  })

  it('runs one dsh tool round trip on haiku under subscription auth and keeps the query for a follow-up', async () => {
    const inits: QueryInit[] = []
    const agent = fakeAgent(cwd)
    const registry = new LiveRegistry()
    let started = 0
    const counting: typeof query = (params) => {
      started += 1
      return query(params)
    }
    const catalog = new ClaudeModelCatalog(() => discoverWithSdk(query, {}))
    const adapter = new ClaudeCodeAdapter({
      catalog,
      stream: options => streamClaudeCode({
        query: counting,
        providerName: 'claude-code',
        thinkingDisplay: 'summarized',
        env: {},
        idleTimeoutMs: 600_000,
        toolTimeoutMs: 86_400_000,
        registry,
        resolveWorkspace: () => ({ agent, cwd }),
        loadImage: () => () => Promise.reject(new Error('no image expected')),
        onInit: init => inits.push(init),
      }, options),
    })

    const listed = await adapter.listModels('claude-code')
    expect(listed.map(model => model.id)).toContain('haiku')

    const run = async (messages: Message[]) => {
      const assembler = new BlockAssembler()
      const options = request(messages, {
        model: 'haiku',
        system: 'You are a terse assistant. Use the provided tools whenever they apply.',
        tools: [weatherTool],
      })
      for await (const piece of adapter.stream(options)) assembler.push(piece)
      const answered = createAssistantMessage({
        content: assembler.blocks(),
        source: { provider: 'claude-code', model: 'haiku', ...assembler.replayState === undefined ? {} : { replayState: assembler.replayState } },
      })
      return { assembler, answered }
    }

    const ask = user('What is the weather in Paris? Call the get_weather tool, then answer in one short sentence.')
    const one = await run([ask])
    expect(one.assembler.finish).toEqual({ kind: 'tool-calls' })
    const call = one.assembler.blocks().find(block => block.type === 'tool-call')
    expect(call).toMatchObject({ name: 'get_weather' })
    expect(inits[0]?.apiKeySource).toBe('none')
    expect(registry.get('s-1')?.state).toBe('parked')

    const result = toolResult(String(call?.type === 'tool-call' ? call.id : ''), 'Sunny, 21C')
    const two = await run([ask, one.answered, result])
    expect(two.assembler.finish).toEqual({ kind: 'stop' })
    const text = two.assembler.blocks().flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
    expect(text).toContain('21')

    const three = await run([ask, one.answered, result, two.answered, user('Thanks. Reply with the single word: done')])
    expect(three.assembler.finish).toEqual({ kind: 'stop' })
    expect(started).toBe(1)
    expect(new Set(inits.map(init => init.claudeSessionId)).size).toBe(1)
    expect(inits.every(init => init.apiKeySource === 'none')).toBe(true)
    registry.closeAll()
  }, 300_000)
})
