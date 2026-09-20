import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULT_VN_SETTINGS, VN_FONT_ROLES, VN_STATES,
  type VnAssetId, type VnFontRole, type VnSettings, type VnState,
} from '../vn-settings.ts'
import { VN_ASSET_PATH, VN_DELETE_PATH, VN_UPLOAD_PATH } from '../protocol.ts'
import { detectAvailableFonts } from './fonts.ts'
import { deriveVnState } from './state.ts'
import type { VnLocaleKey } from './locale.ts'
import css from './VnSettingsSection.module.css'
import './vn.css'

interface SharedProps {
  readonly settings: SettingsScope<VnSettings>
  readonly t: (key: VnLocaleKey) => string
}
type StageProps = PropsRuntime<'conversation.background'> & SharedProps
type SectionProps = PropsRuntime<'settings.section'> & SharedProps

/** Surface percentages the Settings page edits as whole numbers. */
type VnPercentKey = 'inputOpacity' | 'userOpacity' | 'fileOpacity' | 'headerOpacity'

/** Scope every VN rule hangs from: a Conversation that renders a stage. */
const VN_SCOPE = '[data-conversation-content]:has([data-vn-stage])'

/** How long one incoming state image takes to fade in. */
export const VN_FADE_MS = 320

/** One state image fading in over the image already on screen. */
interface VnFade {
  /** The image at full opacity; it stays until the fade completes. */
  readonly shown: VnAssetId
  /** The image fading in over it, or null while no fade runs. */
  readonly incoming: VnAssetId | null
}

/**
 * Hold the image on screen steady while the next one fades in over it. A fade
 * out would expose an unpainted stage whenever the incoming image has not
 * loaded yet, which reads as a flash.
 * @param id - content-addressed image the stage should show now.
 * @returns the stable image and the incoming one, when a fade is running.
 */
function useCrossfade(id: VnAssetId): VnFade {
  const [fade, setFade] = useState<VnFade>({ shown: id, incoming: null })
  useEffect(() => {
    setFade(current => current.shown === id ? current : { shown: current.shown, incoming: id })
  }, [id])
  const incoming = fade.incoming
  useEffect(() => {
    if (incoming === null) return
    const timer = setTimeout(() => {
      setFade(current => current.incoming === incoming ? { shown: incoming, incoming: null } : current)
    }, VN_FADE_MS)
    return () => { clearTimeout(timer) }
  }, [incoming])
  return fade
}

/**
 * Resolve one durable record over the shipped defaults. A section keeps only
 * the fields that existed when it was written, so a record from an earlier
 * release reaches the page without the newer keys.
 * @param stored - the stored section value, absent before the first read.
 * @returns complete settings.
 */
function resolveVnSettings(stored: VnSettings | undefined): VnSettings {
  if (stored === undefined) return DEFAULT_VN_SETTINGS
  return {
    ...DEFAULT_VN_SETTINGS,
    ...stored,
    images: { ...DEFAULT_VN_SETTINGS.images, ...stored.images },
    fonts: { ...DEFAULT_VN_SETTINGS.fonts, ...stored.fonts },
  }
}

function useSettings(settings: SettingsScope<VnSettings>): VnSettings {
  const stored = useSyncExternalStore(
    listener => settings.subscribe(listener),
    () => settings.getSnapshot(),
  ).value
  return resolveVnSettings(stored)
}

/** Quoted CSS family for one stored role value, or '' when the role is unset. */
function fontStack(family: string): string {
  return family === '' ? '' : `"${family}"`
}

/**
 * Build the stylesheet one stage installs: the variables the shipped sheet
 * reads, plus the font each text role chooses.
 * @param value - durable VN settings.
 * @returns CSS text for the stage's style element.
 */
function vnVariables(value: VnSettings): string {
  const transcript = fontStack(value.fonts.transcript)
  const input = fontStack(value.fonts.input)
  const code = fontStack(value.fonts.code)
  const lines = [
    `${VN_SCOPE} {`,
    `  --vn-input-opacity: ${String(value.inputOpacity)}%;`,
    `  --vn-user-opacity: ${String(value.userOpacity)}%;`,
    `  --vn-file-opacity: ${String(value.fileOpacity)}%;`,
    `  --vn-header-opacity: ${String(value.headerOpacity)}%;`,
    '}',
    `${VN_SCOPE} [data-conversation-scroll] {`,
    `  --vn-panel-opacity: ${String(value.panelOpacity)};`,
    `  --vn-panel-blur: ${String(value.panelBlur)}px;`,
  ]
  if (transcript !== '') lines.push(`  font-family: ${transcript};`)
  if (code !== '') lines.push(`  --ds-font-family-code: ${code};`)
  lines.push('}')
  if (input !== '') lines.push(`${VN_SCOPE} [data-composer-card] {`, `  --dsw-font-family: ${input};`, '}')
  return lines.join('\n')
}

/**
 * The conversation stage: the state image, the stylesheet the shipped sheet
 * reads, and nothing that claims layout.
 */
export function VnStage({ settings, sessionId, useSessionStatus, useSession, useChat }: StageProps) {
  const value = useSettings(settings)
  const status = useSessionStatus(snapshot => snapshot.get(sessionId))
  const session = useSession(snapshot => snapshot)
  const chat = useChat(snapshot => snapshot.legacy)
  if (!value.enabled) return null
  const state = deriveVnState({
    ...(status?.running === undefined ? {} : { running: status.running }),
    pendingDecision: status?.pendingInteraction !== undefined,
    responding: chat.partial !== null,
    tool: chat.runningCalls.length > 0,
    error: session.openError !== null || session.promptError !== null || session.lastAgentError !== null,
  })
  const id = value.images[state] || value.images.idle
  const { shown, incoming } = useCrossfade(id)
  const focus = `${String(value.imageFocusX)}% ${String(value.imageFocusY)}%`
  const size = value.imageFit === 'cover' ? 'cover' : value.imageFit === 'contain' ? 'contain' : '100% 100%'
  const frame = { backgroundSize: size, backgroundPosition: focus }
  const image = (asset: VnAssetId): string => `url(${VN_ASSET_PATH}?id=${encodeURIComponent(asset)})`
  return <>
    <div className="dsh-vn-stage" data-vn-stage="" data-vn-state={state} style={{
      ...(shown === '' ? {} : { backgroundImage: image(shown) }),
      ...frame,
      transform: value.imageZoom === 100 ? undefined : `scale(${String(value.imageZoom / 100)})`,
      transformOrigin: focus,
    }}>
      {/* The newcomer fades in above the image already on screen, so the stage
          never shows an unpainted background mid-change. */}
      {incoming === null ? null : <div className="dsh-vn-fade" data-vn-fade="" style={{
        backgroundImage: image(incoming),
        ...frame,
        animationDuration: `${String(VN_FADE_MS)}ms`,
      }} />}
    </div>
    <style>{vnVariables(value)}</style>
  </>
}

export function VnSettingsSection({ settings, t }: SectionProps): ReactNode {
  const value = useSettings(settings)
  const [families] = useState(detectAvailableFonts)
  const [busy, setBusy] = useState<VnState>()
  const [failure, setFailure] = useState(false)
  const deleteAsset = async (id: VnAssetId): Promise<void> => {
    const response = await fetch(`${VN_DELETE_PATH}?id=${encodeURIComponent(id)}`, {
      method: 'POST', credentials: 'include',
    })
    if (!response.ok) throw new Error(`delete failed with HTTP ${String(response.status)}`)
  }
  const updateImages = async (images: VnSettings['images']): Promise<void> => settings.set('images', images)
  const upload = async (state: VnState, file: File): Promise<void> => {
    setBusy(state)
    setFailure(false)
    let uploaded: VnAssetId | undefined
    try {
      const response = await fetch(VN_UPLOAD_PATH, { method: 'POST', credentials: 'include', body: file })
      if (!response.ok) throw new Error(`upload failed with HTTP ${String(response.status)}`)
      const payload = await response.json() as { id: VnAssetId }
      uploaded = payload.id
      const previous = value.images[state]
      const images = { ...value.images, [state]: payload.id }
      await updateImages(images)
      uploaded = undefined
      if (previous !== '' && !Object.values(images).includes(previous)) {
        await deleteAsset(previous)
      }
    } catch {
      setFailure(true)
      if (uploaded !== undefined) await deleteAsset(uploaded).catch(() => {})
    } finally { setBusy(undefined) }
  }
  const remove = async (state: VnState): Promise<void> => {
    setFailure(false)
    const previous = value.images[state]
    const images = { ...value.images }
    images[state] = ''
    try {
      await updateImages(images)
      if (previous !== '' && !Object.values(images).includes(previous)) await deleteAsset(previous)
    } catch {
      setFailure(true)
    }
  }
  const setPercent = (key: VnPercentKey, raw: string): void => {
    if (raw === '') return
    const next = Number(raw)
    if (Number.isFinite(next)) void settings.set(key, Math.min(100, Math.max(0, Math.round(next))))
  }
  const setFont = (role: VnFontRole, family: string): void => {
    void settings.set('fonts', { ...value.fonts, [role]: family })
  }
  const percentRow = (key: VnPercentKey, label: string, current: number): ReactNode => (
    <label className={css.row} key={key}>
      <span className={css.label}>{label}</span>
      <span className={css.percent}>
        <input
          type="number" min="0" max="100" step="1" value={current} aria-label={label}
          onChange={(event) => { setPercent(key, event.target.value) }}
        />
        <span aria-hidden="true">%</span>
      </span>
    </label>
  )
  const fontRow = (role: VnFontRole): ReactNode => (
    <label className={css.row} key={role}>
      <span className={css.label}>{t(role)}</span>
      <select value={value.fonts[role]} aria-label={t(role)} onChange={(event) => { setFont(role, event.target.value) }}>
        <option value="">{t('fontDefault')}</option>
        {families.map(family => <option key={family} value={family}>{family}</option>)}
        {value.fonts[role] === '' || families.includes(value.fonts[role])
          ? null
          : <option value={value.fonts[role]}>{value.fonts[role]}</option>}
      </select>
    </label>
  )
  return <div className={css.section} data-vn-section="">
    <div className={css.row}>
      <span className={css.label}>{t('enabled')}</span>
      <Switch checked={value.enabled} label={t('enabled')} onChange={(next) => { void settings.set('enabled', next) }} />
    </div>
    <label className={css.row}>
      <span className={css.label}>{t('fit')}</span>
      <select value={value.imageFit} aria-label={t('fit')} onChange={(event) => { void settings.set('imageFit', event.target.value) }}>
        <option value="cover">{t('cover')}</option>
        <option value="contain">{t('contain')}</option>
        <option value="stretch">{t('stretch')}</option>
      </select>
    </label>
    <label className={css.row}>
      <span className={css.label}>{t('zoom')}</span>
      <input type="range" min="50" max="200" step="1" value={value.imageZoom} aria-label={t('zoom')} onChange={(event) => { void settings.set('imageZoom', Number(event.target.value)) }} />
    </label>
    <label className={css.row}>
      <span className={css.label}>{t('focusX')}</span>
      <input type="range" min="0" max="100" step="1" value={value.imageFocusX} aria-label={t('focusX')} onChange={(event) => { void settings.set('imageFocusX', Number(event.target.value)) }} />
    </label>
    <label className={css.row}>
      <span className={css.label}>{t('focusY')}</span>
      <input type="range" min="0" max="100" step="1" value={value.imageFocusY} aria-label={t('focusY')} onChange={(event) => { void settings.set('imageFocusY', Number(event.target.value)) }} />
    </label>
    {percentRow('inputOpacity', t('inputOpacity'), value.inputOpacity)}
    {percentRow('userOpacity', t('userOpacity'), value.userOpacity)}
    {percentRow('fileOpacity', t('fileOpacity'), value.fileOpacity)}
    {percentRow('headerOpacity', t('headerOpacity'), value.headerOpacity)}
    {VN_FONT_ROLES.map(fontRow)}
    <label className={css.row}>
      <span className={css.label}>{t('panel')}</span>
      <input type="range" min="0.35" max="1" step="0.05" value={value.panelOpacity} aria-label={t('panel')} onChange={(event) => { void settings.set('panelOpacity', Number(event.target.value)) }} />
    </label>
    <label className={css.row}>
      <span className={css.label}>{t('blur')}</span>
      <input type="range" min="0" max="32" step="1" value={value.panelBlur} aria-label={t('blur')} onChange={(event) => { void settings.set('panelBlur', Number(event.target.value)) }} />
    </label>
    <div className={css.images}>{VN_STATES.map(state => <div key={state} className={css.imageRow}>
      <span className={css.label}>{t(state)}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={t(state)} disabled={busy !== undefined} onChange={(event) => {
        const file = event.target.files?.[0]
        if (file !== undefined) void upload(state, file)
        event.target.value = ''
      }} />
      {value.images[state] === '' ? null : <Button variant="outline" size="sm" onClick={() => { void remove(state) }}>{t('remove')}</Button>}
    </div>)}</div>
    <span className={css.status} role="status" aria-live="polite">{failure ? t('operationFailed') : ''}</span>
  </div>
}
