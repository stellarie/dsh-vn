// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { EMPTY_CHAT_SNAPSHOT } from '@deepseek-ai/dsh-client-ui-chat/src/client/contract/snapshot.ts'
import { DEFAULT_VN_SETTINGS, type VnSettings } from '../src/vn-settings.ts'
import { VN_FADE_MS, VnSettingsSection, VnStage } from '../src/client/VnPresentation.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const IDLE = `${'a'.repeat(64)}.png`
const OTHER = `${'b'.repeat(64)}.png`

function settings(value: VnSettings, set = vi.fn(async () => {})) {
  const snapshot = { status: 'ready', value, base: {}, user: {}, revision: 1, writable: true, mode: 'host' }
  return { getSnapshot: () => snapshot, subscribe: () => () => {}, set, mutate: vi.fn(), unset: vi.fn() }
}

const translate = (key: string): string => key

/** Stage props for one durable value, so a test can rerender the same stage. */
function stageProps(value: VnSettings): ComponentProps<typeof VnStage> {
  return {
    settings: settings(value), sessionId: 's1', t: translate,
    useSessionStatus: (select: (state: Map<string, object>) => unknown) => select(new Map([['s1', { running: true }]])),
    useSession: (select: (state: object) => unknown) => select({ openError: null, promptError: null, lastAgentError: null }),
    useChat: (select: (state: object) => unknown) => select({
      ...EMPTY_CHAT_SNAPSHOT,
      legacy: { ...EMPTY_CHAT_SNAPSHOT.legacy, runningCalls: [{}] },
    }),
  } as unknown as ComponentProps<typeof VnStage>
}

/** Render one stage with a fixed Session and Chat observation. */
function renderStage(value: VnSettings) {
  const view = render(<VnStage {...stageProps(value)} />)
  return {
    stage: view.container.querySelector('[data-vn-stage]') as HTMLElement,
    fade: view.container.querySelector<HTMLElement>('[data-vn-fade]'),
    style: view.container.querySelector('style')?.textContent ?? '',
    view,
  }
}

/** Render the Settings page with one durable value. */
function renderSection(value: VnSettings = DEFAULT_VN_SETTINGS, set = vi.fn(async () => {})) {
  const props = { settings: settings(value, set), t: translate } as unknown as ComponentProps<typeof VnSettingsSection>
  return { view: render(<VnSettingsSection {...props} />), set }
}

/** Report `installed` as the only families the canvas probe can measure. */
function stubFontCanvas(installed: readonly string[]): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    font: '',
    measureText(this: { font: string }): { width: number } {
      return { width: installed.some(name => this.font.includes(name)) ? 120 : 60 }
    },
  } as unknown as CanvasRenderingContext2D)
}

describe('VN presentation', () => {
  it('selects live Chat and Session states with idle fallback', () => {
    const { stage } = renderStage({
      ...DEFAULT_VN_SETTINGS,
      enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE, tool: `${'b'.repeat(64)}.png` },
    })
    expect(stage.dataset.vnState).toBe('tool')
    expect(stage.style.backgroundImage).toContain(`${'b'.repeat(64)}.png`)
  })

  it('covers the stage at its center by default', () => {
    const { stage } = renderStage({ ...DEFAULT_VN_SETTINGS, enabled: true, images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE } })
    expect(stage.style.backgroundSize).toBe('cover')
    expect(stage.style.backgroundPosition).toBe('50% 50%')
    expect(stage.style.transform).toBe('')
  })

  it('applies the configured fit, zoom, and focus to the stage', () => {
    const { stage } = renderStage({
      ...DEFAULT_VN_SETTINGS, enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      imageFit: 'contain', imageZoom: 150, imageFocusX: 25, imageFocusY: 75,
    })
    expect(stage.style.backgroundSize).toBe('contain')
    expect(stage.style.backgroundPosition).toBe('25% 75%')
    expect(stage.style.transform).toBe('scale(1.5)')
    expect(stage.style.transformOrigin).toBe('25% 75%')
  })

  it('stretches the stage to its box when the fit asks for it', () => {
    const { stage } = renderStage({
      ...DEFAULT_VN_SETTINGS, enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      imageFit: 'stretch', imageZoom: 100,
    })
    expect(stage.style.backgroundSize).toBe('100% 100%')
    expect(stage.style.transform).toBe('')
  })

  it('publishes the surface opacities and the chosen role fonts', () => {
    const { style } = renderStage({
      ...DEFAULT_VN_SETTINGS, enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      inputOpacity: 60, userOpacity: 65, fileOpacity: 70, headerOpacity: 75,
      fonts: { transcript: 'Georgia', input: 'Verdana', code: 'Consolas' },
    })
    expect(style).toContain('--vn-input-opacity: 60%')
    expect(style).toContain('--vn-user-opacity: 65%')
    expect(style).toContain('--vn-file-opacity: 70%')
    expect(style).toContain('--vn-header-opacity: 75%')
    expect(style).toContain('font-family: "Georgia"')
    expect(style).toContain('--dsw-font-family: "Verdana"')
    expect(style).toContain('--ds-font-family-code: "Consolas"')
  })

  it('keeps the shipped stacks when no role font is chosen', () => {
    const { style } = renderStage({ ...DEFAULT_VN_SETTINGS, enabled: true, images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE } })
    expect(style).not.toContain('font-family: "')
    expect(style).not.toContain('--ds-font-family-code')
    expect(style).not.toContain('[data-composer-card]')
  })

  it('keeps the stage image for a stored record that predates the role fonts', () => {
    // The same record that used to crash the Settings page also crashed the
    // stage, because both read the absent `fonts` map. The stage must keep
    // painting the state image instead of dropping the whole background.
    const stored = {
      enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      panelOpacity: 0.75,
      panelBlur: 2,
      imageFit: 'cover',
      imageZoom: 65,
      imageFocusX: 52,
      imageFocusY: 51,
    } as unknown as VnSettings
    const { stage } = renderStage(stored)
    expect(stage.dataset.vnState).toBe('tool')
    expect(stage.style.backgroundImage).toContain(IDLE)
  })

  it('fades the incoming state image in over the one already on screen', () => {
    const first = { ...DEFAULT_VN_SETTINGS, enabled: true, images: { ...DEFAULT_VN_SETTINGS.images, tool: IDLE } }
    const { view } = renderStage(first)
    expect(view.container.querySelector('[data-vn-fade]')).toBeNull()
    view.rerender(<VnStage {...stageProps({ ...first, images: { ...first.images, tool: OTHER } })} />)
    const stage = view.container.querySelector('[data-vn-stage]') as HTMLElement
    const fade = view.container.querySelector('[data-vn-fade]') as HTMLElement
    // The image on screen stays put; the newcomer arrives above it, so a state
    // change never exposes an unpainted stage.
    expect(stage.style.backgroundImage).toContain(IDLE)
    expect(fade.style.backgroundImage).toContain(OTHER)
    expect(fade.style.animationDuration).toBe(`${String(VN_FADE_MS)}ms`)
    expect(fade.style.backgroundSize).toBe(stage.style.backgroundSize)
    expect(fade.style.backgroundPosition).toBe(stage.style.backgroundPosition)
  })

  it('promotes the incoming image once the fade ends', () => {
    vi.useFakeTimers()
    const first = { ...DEFAULT_VN_SETTINGS, enabled: true, images: { ...DEFAULT_VN_SETTINGS.images, tool: IDLE } }
    const { view } = renderStage(first)
    view.rerender(<VnStage {...stageProps({ ...first, images: { ...first.images, tool: OTHER } })} />)
    expect(view.container.querySelector('[data-vn-fade]')).not.toBeNull()
    act(() => { vi.advanceTimersByTime(VN_FADE_MS + 1) })
    expect(view.container.querySelector('[data-vn-fade]')).toBeNull()
    expect((view.container.querySelector('[data-vn-stage]') as HTMLElement).style.backgroundImage).toContain(OTHER)
  })

  it('renders the persisted presentation values as one settings page', () => {
    const { view } = renderSection({
      ...DEFAULT_VN_SETTINGS, enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      panelOpacity: 0.5, panelBlur: 4,
      imageFit: 'stretch', imageZoom: 150, imageFocusX: 25, imageFocusY: 75,
      inputOpacity: 60, userOpacity: 65, fileOpacity: 70, headerOpacity: 75,
    })
    expect(view.getByRole('switch', { name: 'enabled' }).getAttribute('aria-checked')).toBe('true')
    expect((view.getByRole('combobox', { name: 'fit' }) as HTMLSelectElement).value).toBe('stretch')
    const ranges = ['zoom', 'focusX', 'focusY', 'panel', 'blur']
      .map(name => (view.getByRole('slider', { name }) as HTMLInputElement).value)
    expect(ranges).toEqual(['150', '25', '75', '0.5', '4'])
    const percents = ['inputOpacity', 'userOpacity', 'fileOpacity', 'headerOpacity']
      .map(name => (view.getByRole('spinbutton', { name }) as HTMLInputElement).value)
    expect(percents).toEqual(['60', '65', '70', '75'])
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(6)
    expect(view.getAllByRole('button', { name: 'remove' })).toHaveLength(1)
  })

  it('offers the detected system families for every text role', () => {
    stubFontCanvas(['Georgia'])
    const { view } = renderSection()
    for (const role of ['transcript', 'input', 'code']) {
      const options = [...(view.getByRole('combobox', { name: role }) as HTMLSelectElement).options].map(option => option.value)
      expect(options).toEqual(['', 'Georgia'])
    }
  })

  it('writes the surface opacities, the role fonts, and the framing controls', async () => {
    stubFontCanvas(['Georgia'])
    const { view, set } = renderSection()
    fireEvent.change(view.getByRole('spinbutton', { name: 'inputOpacity' }), { target: { value: '60' } })
    fireEvent.change(view.getByRole('spinbutton', { name: 'userOpacity' }), { target: { value: '65' } })
    fireEvent.change(view.getByRole('spinbutton', { name: 'fileOpacity' }), { target: { value: '70' } })
    fireEvent.change(view.getByRole('spinbutton', { name: 'headerOpacity' }), { target: { value: '75' } })
    fireEvent.change(view.getByRole('combobox', { name: 'transcript' }), { target: { value: 'Georgia' } })
    fireEvent.change(view.getByRole('combobox', { name: 'input' }), { target: { value: 'Georgia' } })
    fireEvent.change(view.getByRole('combobox', { name: 'code' }), { target: { value: 'Georgia' } })
    await waitFor(() => { expect(set).toHaveBeenCalledTimes(7) })
    expect(set).toHaveBeenNthCalledWith(1, 'inputOpacity', 60)
    expect(set).toHaveBeenNthCalledWith(2, 'userOpacity', 65)
    expect(set).toHaveBeenNthCalledWith(3, 'fileOpacity', 70)
    expect(set).toHaveBeenNthCalledWith(4, 'headerOpacity', 75)
    expect(set).toHaveBeenNthCalledWith(5, 'fonts', { transcript: 'Georgia', input: '', code: '' })
    expect(set).toHaveBeenNthCalledWith(6, 'fonts', { transcript: '', input: 'Georgia', code: '' })
    expect(set).toHaveBeenNthCalledWith(7, 'fonts', { transcript: '', input: '', code: 'Georgia' })
  })

  it('ignores an empty percent field instead of writing zero', async () => {
    const { view, set } = renderSection()
    fireEvent.change(view.getByRole('spinbutton', { name: 'inputOpacity' }), { target: { value: '' } })
    await Promise.resolve()
    expect(set).not.toHaveBeenCalled()
  })

  it('renders a stored record that predates the current fields', () => {
    // The durable section keeps only the fields that existed when it was
    // written, so a record from an earlier release reaches the page without
    // the newer keys at all.
    const stored = {
      enabled: true,
      images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE },
      panelOpacity: 0.75,
      panelBlur: 2,
      imageFit: 'cover',
      imageZoom: 65,
      imageFocusX: 52,
      imageFocusY: 51,
    } as unknown as VnSettings
    const { view } = renderSection(stored)
    expect((view.getByRole('spinbutton', { name: 'inputOpacity' }) as HTMLInputElement).value)
      .toBe(String(DEFAULT_VN_SETTINGS.inputOpacity))
    expect((view.getByRole('combobox', { name: 'transcript' }) as HTMLSelectElement).value).toBe('')
  })

  it('removes a state image and deletes the unreferenced asset', async () => {
    const fetch = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetch)
    const { view, set } = renderSection({ ...DEFAULT_VN_SETTINGS, images: { ...DEFAULT_VN_SETTINGS.images, idle: IDLE } })
    fireEvent.click(view.getByRole('button', { name: 'remove' }))
    await waitFor(() => { expect(set).toHaveBeenCalledTimes(1) })
    expect(set).toHaveBeenCalledWith('images', { ...DEFAULT_VN_SETTINGS.images })
    await waitFor(() => { expect(fetch).toHaveBeenCalledTimes(1) })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(IDLE), expect.objectContaining({ method: 'POST' }))
  })

  it('rolls back an upload and announces a failed settings write', async () => {
    const asset = `${'c'.repeat(64)}.png`
    const set = vi.fn(async () => { throw new Error('settings unavailable') })
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: asset }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetch)
    const { view } = renderSection(DEFAULT_VN_SETTINGS, set)
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['image'], 'idle.png', { type: 'image/png' })] } })
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('operationFailed') })
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining(asset), expect.objectContaining({ method: 'POST' }))
  })
})
