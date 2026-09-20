// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import { DEFAULT_VN_SETTINGS, type VnSettings } from '../src/vn-settings.ts'
import { VnControls, VnStage } from '../src/client/VnPresentation.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function settings(value: VnSettings, set = vi.fn(async () => {})) {
  const snapshot = { status: 'ready', value, base: {}, user: {}, revision: 1, writable: true, mode: 'host' }
  return { getSnapshot: () => snapshot, subscribe: () => () => {}, set, mutate: vi.fn(), unset: vi.fn() }
}

const translate = (key: string): string => key

describe('VN presentation', () => {
  it('selects live Chat and Session states with idle fallback', () => {
    const value = {
      ...DEFAULT_VN_SETTINGS,
      enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: `${'a'.repeat(64)}.png`, tool: `${'b'.repeat(64)}.png` },
    }
    const props = {
      settings: settings(value), sessionId: 's1', t: translate,
      useSessionStatus: (select: (state: Map<string, object>) => unknown) => select(new Map([['s1', { running: true }]])),
      useSession: (select: (state: object) => unknown) => select({ openError: null, promptError: null, lastAgentError: null }),
      useChat: (select: (state: object) => unknown) => select({
        ...EMPTY_CHAT_SNAPSHOT,
        legacy: { ...EMPTY_CHAT_SNAPSHOT.legacy, runningCalls: [{}] },
      }),
    } as unknown as ComponentProps<typeof VnStage>
    const view = render(<VnStage {...props} />)
    const stage = view.container.querySelector('[data-vn-stage]') as HTMLElement
    expect(stage.dataset.vnState).toBe('tool')
    expect(stage.style.backgroundImage).toContain(`${'b'.repeat(64)}.png`)
  })

  it('rolls back an upload and announces a failed settings write', async () => {
    const asset = `${'c'.repeat(64)}.png`
    const set = vi.fn(async () => { throw new Error('settings unavailable') })
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: asset }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetch)
    const props = { settings: settings(DEFAULT_VN_SETTINGS, set), t: translate } as unknown as ComponentProps<typeof VnControls>
    const view = render(<VnControls {...props} />)
    fireEvent.click(view.getByText('title'))
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['image'], 'idle.png', { type: 'image/png' })] } })
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('operationFailed') })
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining(asset), expect.objectContaining({ method: 'POST' }))
  })
})
