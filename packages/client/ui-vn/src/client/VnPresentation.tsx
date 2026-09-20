import { useState, useSyncExternalStore } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import { DEFAULT_VN_SETTINGS, VN_STATES, type VnAssetId, type VnSettings, type VnState } from '../vn-settings.ts'
import { VN_ASSET_PATH, VN_DELETE_PATH, VN_UPLOAD_PATH } from '../protocol.ts'
import { deriveVnState } from './state.ts'
import type { VnLocaleKey } from './locale.ts'
import './vn.css'

interface SharedProps {
  readonly settings: SettingsScope<VnSettings>
  readonly t: (key: VnLocaleKey) => string
}
type StageProps = PropsRuntime<'conversation.background'> & SharedProps
type ControlsProps = PropsRuntime<'conversation.composer.footer'> & SharedProps

function useSettings(settings: SettingsScope<VnSettings>): VnSettings {
  return useSyncExternalStore(
    listener => settings.subscribe(listener),
    () => settings.getSnapshot(),
  ).value ?? DEFAULT_VN_SETTINGS
}

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
  if (id === '') return null
  const family = value.fontFamily === 'serif' ? 'Georgia, serif'
    : value.fontFamily === 'rounded' ? 'ui-rounded, system-ui, sans-serif'
      : 'system-ui, sans-serif'
  const variables = `[data-conversation-content]:has([data-vn-stage]) [data-conversation-scroll] {
    --vn-panel-opacity: ${String(value.panelOpacity)};
    --vn-panel-blur: ${String(value.panelBlur)}px;
    --vn-font-family: ${family};
  }`
  return <>
    <div className="dsh-vn-stage" data-vn-stage="" data-vn-state={state} style={{
      backgroundImage: `url(${VN_ASSET_PATH}?id=${encodeURIComponent(id)})`,
    }} />
    <style>{variables}</style>
  </>
}

export function VnControls({ settings, t }: ControlsProps) {
  const value = useSettings(settings)
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
  return <details className="dsh-vn-controls" data-vn-controls="">
    <summary>{t('title')}</summary>
    <label><input type="checkbox" checked={value.enabled} onChange={(event) => { void settings.set('enabled', event.target.checked) }} /> {t('enabled')}</label>
    <label>{t('panel')} <input type="range" min="0.35" max="1" step="0.05" value={value.panelOpacity} onChange={(event) => { void settings.set('panelOpacity', Number(event.target.value)) }} /></label>
    <label>{t('blur')} <input type="range" min="0" max="32" step="1" value={value.panelBlur} onChange={(event) => { void settings.set('panelBlur', Number(event.target.value)) }} /></label>
    <select value={value.fontFamily} onChange={(event) => { void settings.set('fontFamily', event.target.value) }} aria-label={t('font')}>
      <option value="system">{t('system')}</option><option value="serif">{t('serif')}</option><option value="rounded">{t('rounded')}</option>
    </select>
    <div className="dsh-vn-images">{VN_STATES.map(state => <label key={state}>
      <span>{t(state)}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy !== undefined} onChange={(event) => {
        const file = event.target.files?.[0]
        if (file !== undefined) void upload(state, file)
        event.target.value = ''
      }} />
      {value.images[state] === '' ? null : <button type="button" onClick={() => { void remove(state) }}>{t('remove')}</button>}
    </label>)}</div>
    <span className="dsh-vn-status" role="status" aria-live="polite">{failure ? t('operationFailed') : ''}</span>
  </details>
}
