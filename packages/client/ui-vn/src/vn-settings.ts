/** Durable visual-novel presentation preferences. */
import z from '@deepseek-ai/schemastery'

/** Durable settings namespace owned by the VN plugin. */
export const VN_SETTINGS_NAMESPACE = 'ui-vn'
/** Supported presentation states in control order. */
export const VN_STATES = ['idle', 'thinking', 'responding', 'decision', 'tool', 'error'] as const
/** One supported VN presentation state. */
export type VnState = typeof VN_STATES[number]
/** Content-addressed managed image identifier. */
export type VnAssetId = string

/** Durable VN presentation settings. */
export interface VnSettings {
  enabled: boolean
  images: Record<VnState, VnAssetId>
  panelOpacity: number
  panelBlur: number
  fontFamily: 'system' | 'serif' | 'rounded'
}

const asset = z.union(['', z.string().pattern(/^[a-f0-9]{64}\.(?:png|jpg|webp)$/)])
const images = z.object({
  idle: asset.default(''),
  thinking: asset.default(''),
  responding: asset.default(''),
  decision: asset.default(''),
  tool: asset.default(''),
  error: asset.default(''),
})

/** Validation and defaults for durable VN settings. */
export const VnSettingsSchema: z<VnSettings> = z.object({
  enabled: z.boolean().default(false),
  images: images.default({ idle: '', thinking: '', responding: '', decision: '', tool: '', error: '' }),
  panelOpacity: z.number().min(0.35).max(1).default(0.78),
  panelBlur: z.number().step(1).min(0).max(32).default(12),
  fontFamily: z.union(['system', 'serif', 'rounded']).default('system'),
})

/** Resolved defaults used before the Client receives Host settings. */
export const DEFAULT_VN_SETTINGS: VnSettings = {
  enabled: false,
  images: { idle: '', thinking: '', responding: '', decision: '', tool: '', error: '' },
  panelOpacity: 0.78,
  panelBlur: 12,
  fontFamily: 'system',
}
