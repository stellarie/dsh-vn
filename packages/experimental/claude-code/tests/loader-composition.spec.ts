/**
 * Real-composition guard: a test-only cordis.yml boots the llm service and this
 * plugin through the actual Loader + Include path, so the config schema
 * defaults, the `inject` declaration, and the exported plugin fields are the
 * ones a Profile uses. Only the Claude Agent SDK `query` is replaced.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime, { BlockAssembler } from '@deepseek-ai/dsh-llm'
import * as ClaudeCode from '../src/index.ts'
import type { QueryFunction } from '../src/stream.ts'
import { blockStart, blockStop, collect, emits, fakeAgent, fakeSdk, init, messageStart, request, requestCalls, success, textDelta, user } from './support.ts'

const holder = vi.hoisted(() => ({ query: undefined as unknown as QueryFunction }))

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: (params: Parameters<QueryFunction>[0]) => holder.query(params),
}))

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  vi.unstubAllEnvs()
})

async function boot(yamlLines: string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-claude-code-composition-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    '- id: llm',
    "  name: '@deepseek-ai/dsh-llm'",
    '- id: claude-code',
    "  name: '@deepseek-ai/dsh-experimental-claude-code'",
    ...yamlLines,
    '',
  ].join('\n'))
  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-llm', LlmRuntime],
    ['@deepseek-ai/dsh-experimental-claude-code', ClaudeCode],
  ])
  // The custom importer bypasses Node resolution; mirror the package manifests a deployed cordis.yml has.
  await Promise.all([...modules.keys()].map(async (packageName) => {
    const packageDir = join(root!, 'node_modules', ...packageName.split('/'))
    await mkdir(packageDir, { recursive: true })
    await writeFile(join(packageDir, 'package.json'), `${JSON.stringify({ name: packageName, version: '0.1.0', type: 'module' })}\n`)
  }))
  ctx.loader.internal = {
    version: 'v2',
    import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return Promise.resolve(modules.get(specifier))
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

const reply = emits(
  init(),
  messageStart(),
  blockStart(0, { type: 'text', text: '' }),
  textDelta(0, 'pong'),
  blockStop(0),
  success(),
)

describe('claude-code Loader composition', () => {
  it('registers the default route with schema defaults and answers a request', async () => {
    const sdk = fakeSdk(reply)
    holder.query = sdk.query
    vi.stubEnv('CLAUDECODE', '1')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-key')
    const ctx = await boot([])
    ctx.provide('agents', { get: () => fakeAgent('/work/composed') } as never)

    expect(ctx.llm.listProviders()).toEqual([{ id: 'claude-code', name: 'Claude Code' }])
    const assembler = new BlockAssembler()
    for await (const chunk of ctx.llm.stream(request([user('ping')]))) assembler.push(chunk)
    expect(assembler.blocks()).toEqual([{ type: 'text', text: 'pong' }])

    const [call] = requestCalls(sdk.calls)
    expect(call?.options).toMatchObject({
      cwd: '/work/composed',
      thinking: { type: 'adaptive', display: 'summarized' },
    })
    expect(call?.options.env).not.toHaveProperty('CLAUDECODE')
    expect(call?.options.env).not.toHaveProperty('ANTHROPIC_API_KEY')
  })

  it('applies the configured route name, thinking display, and environment overlay', async () => {
    const sdk = fakeSdk(reply)
    holder.query = sdk.query
    const ctx = await boot([
      '  config:',
      '    providerName: claude-alt',
      '    thinkingDisplay: omitted',
      '    env:',
      '      EXTRA_FLAG: "yes"',
      '    idleTimeoutMs: 1234',
    ])
    ctx.provide('agents', { get: () => fakeAgent('/work/composed') } as never)

    expect(ctx.llm.listProviders().map(provider => provider.id)).toEqual(['claude-alt'])
    await collect(ctx.llm.stream(request([user('ping')], { provider: 'claude-alt' })))
    const [call] = requestCalls(sdk.calls)
    expect(call?.options).toMatchObject({ thinking: { type: 'adaptive', display: 'omitted' } })
    expect(call?.options.env).toMatchObject({ EXTRA_FLAG: 'yes' })
  })
})
