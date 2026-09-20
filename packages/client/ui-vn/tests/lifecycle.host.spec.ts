import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { apply, VN_SETTINGS_NAMESPACE } from '../src/index.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> { return Promise.resolve() }
}

describe('VN Host lifecycle', () => {
  it('registers and disposes settings and all authenticated routes', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const routes = new Set<string>()
    const disposers: ReturnType<typeof vi.fn>[] = []
    ctx.provide('connection', { fetch: { register: (route: { path: string }) => {
      routes.add(route.path)
      const dispose = vi.fn(async () => { routes.delete(route.path) })
      disposers.push(dispose)
      return dispose
    } } } as never)
    const fiber = ctx.plugin({ apply }, { assetRoot: 'C:/unused-vn-assets' })
    await fiber.await()
    expect(ctx.settings.get(VN_SETTINGS_NAMESPACE)).toMatchObject({ enabled: false })
    expect(routes).toHaveLength(3)
    await fiber.dispose()
    expect(routes).toHaveLength(0)
    expect(disposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(VN_SETTINGS_NAMESPACE)
  })
})
