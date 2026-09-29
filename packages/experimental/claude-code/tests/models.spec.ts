import { describe, expect, it } from 'vitest'
import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk'
import { ClaudeCodeAdapter } from '../src/adapter.ts'
import { ClaudeModelCatalog, FALLBACK_MODELS, modelsFromRows } from '../src/models.ts'
import type { CatalogSnapshot } from '../src/models.ts'

const rows: ModelInfo[] = [
  { value: 'default', displayName: 'Default', description: 'Recommended', supportedEffortLevels: ['low', 'high'] },
  { value: 'sonnet', displayName: 'Sonnet', description: 'Fast', supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'] },
  { value: 'haiku', displayName: 'Haiku', description: '' },
  { value: 'sonnet', displayName: 'Duplicate', description: '' },
  { value: 'odd', displayName: '', description: 'x', supportedEffortLevels: ['low', 'turbo'] as never },
]

function adapterOver(discover: () => Promise<readonly ModelInfo[]>, seen: CatalogSnapshot[] = []) {
  const catalog = new ClaudeModelCatalog(discover, snapshot => seen.push(snapshot))
  return { adapter: new ClaudeCodeAdapter({ catalog, stream: () => (async function* () {})() }), seen }
}

describe('model catalog', () => {
  it('turns runtime rows into models with the efforts each row reports', () => {
    expect(modelsFromRows(rows).map(model => [model.id, model.name, model.efforts])).toEqual([
      ['default', 'Default', ['low', 'high']],
      ['sonnet', 'Sonnet', ['low', 'medium', 'high', 'xhigh', 'max']],
      ['haiku', 'Haiku', []],
      ['odd', 'odd', ['low']],
    ])
  })

  it('advertises row values as model ids and row efforts as reasoning efforts', async () => {
    const { adapter } = adapterOver(() => Promise.resolve(rows))
    const listed = await adapter.listModels('claude-code')
    expect(listed.map(model => [model.id, model.name])).toEqual([
      ['default', 'Default'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku'], ['odd', 'odd'],
    ])
    const sonnet = await adapter.resolveModel('claude-code', 'sonnet')
    expect(sonnet.reasoning?.efforts.map(effort => [effort.id, effort.name])).toEqual([
      ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Xhigh'], ['max', 'Max'],
    ])
    expect(sonnet.reasoning?.defaultEffort).toBeUndefined()
    const haiku = await adapter.resolveModel('claude-code', 'haiku')
    expect(haiku.reasoning).toBeUndefined()
    expect(haiku.inputModalities).toEqual(['text', 'image'])
  })

  it('describes an unlisted model without efforts instead of failing', async () => {
    const { adapter } = adapterOver(() => Promise.resolve(rows))
    expect(await adapter.resolveModel('claude-code', 'claude-opus-9')).toMatchObject({ id: 'claude-opus-9', name: 'claude-opus-9' })
  })

  it('discovers once per catalog and shares the result', async () => {
    let discoveries = 0
    const { adapter } = adapterOver(() => { discoveries += 1; return Promise.resolve(rows) })
    await Promise.all([adapter.listModels('claude-code'), adapter.resolveModel('claude-code', 'sonnet'), adapter.listModels('claude-code')])
    expect(discoveries).toBe(1)
  })

  it('serves the fallback list and reports a diagnostic when discovery fails', async () => {
    const seen: CatalogSnapshot[] = []
    const { adapter } = adapterOver(() => Promise.reject(new Error('spawn failed')), seen)
    const listed = await adapter.listModels('claude-code')
    expect(listed.map(model => model.id)).toEqual(['opus', 'sonnet', 'haiku', 'claude-fable-5-1[1m]'])
    expect(FALLBACK_MODELS.map(model => model.id)).toEqual(listed.map(model => model.id))
    expect(seen).toHaveLength(1)
    expect(seen[0]?.diagnostic).toContain('spawn failed')
    expect((await adapter.resolveModel('claude-code', 'opus')).reasoning?.efforts).toHaveLength(5)
    expect((await adapter.resolveModel('claude-code', 'haiku')).reasoning).toBeUndefined()
  })

  it('serves the fallback list when the runtime reports no models', async () => {
    const { adapter, seen } = adapterOver(() => Promise.resolve([]))
    expect((await adapter.listModels('claude-code')).length).toBe(4)
    expect(seen[0]?.diagnostic).toContain('no models')
  })

  it('words a non-Error discovery failure', async () => {
    const seen: CatalogSnapshot[] = []
    // oxlint-disable-next-line prefer-promise-reject-errors -- a non-Error rejection is the case under test
    const { adapter } = adapterOver(() => Promise.reject('offline'), seen)
    await adapter.listModels('claude-code')
    expect(seen[0]?.diagnostic).toContain('offline')
  })

  it('contains a failing diagnostic sink', async () => {
    const catalog = new ClaudeModelCatalog(() => Promise.reject(new Error('x')), () => { throw new Error('sink') })
    expect((await catalog.load()).models).toBe(FALLBACK_MODELS)
  })
})
