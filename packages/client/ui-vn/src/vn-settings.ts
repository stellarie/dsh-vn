/** Durable visual-novel presentation preferences. */
import z from '@deepseek-ai/schemastery'

/** Durable settings namespace owned by the VN plugin. */
export const VN_SETTINGS_NAMESPACE = 'ui-vn'
/** Supported presentation states in control order. */
export const VN_STATES = ['idle', 'thinking', 'responding', 'decision', 'tool', 'error'] as const
/** One supported VN presentation state. */
export type VnState = typeof VN_STATES[number]
/** Supported background fit modes in control order. */
export const VN_FITS = ['cover', 'contain', 'stretch'] as const
/** One supported background fit mode. */
export type VnFit = typeof VN_FITS[number]
/** Text roles that carry an independent font choice, in control order. */
export const VN_FONT_ROLES = ['transcript', 'input', 'code'] as const
/** One text role with its own font choice. */
export type VnFontRole = typeof VN_FONT_ROLES[number]
/** Content-addressed managed image identifier. */
export type VnAssetId = string

/** One font family per text role; an empty value keeps the shipped font stack. */
export type VnFonts = Record<VnFontRole, string>

/** Durable VN presentation settings. */
export interface VnSettings {
  enabled: boolean
  images: Record<VnState, VnAssetId>
  panelOpacity: number
  panelBlur: number
  /** How the stage scales one background image inside its box. */
  imageFit: VnFit
  /** Background scale in percent, applied around the focus point. */
  imageZoom: number
  /** Horizontal focus in percent: 0 keeps the left edge, 100 keeps the right edge. */
  imageFocusX: number
  /** Vertical focus in percent: 0 keeps the top edge, 100 keeps the bottom edge. */
  imageFocusY: number
  /** Chat input box opacity in percent; 100 keeps the surface opaque. */
  inputOpacity: number
  /** Chat-log user message opacity in percent. */
  userOpacity: number
  /** Chat-log file and code card opacity in percent. */
  fileOpacity: number
  /** Chat-log file and code header opacity in percent. */
  headerOpacity: number
  /** Font family per text role; empty values keep the shipped stacks. */
  fonts: VnFonts
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
/** Percent surface controls; 100 leaves the shipped surface unchanged. */
const percent = z.number().step(1).min(0).max(100)
/**
 * A chosen font family. The pattern keeps a value that reaches CSS free of
 * quotes and braces, so one stored string cannot rewrite the rule it lands in.
 */
const family = z.string().pattern(/^[A-Za-z0-9 _-]*$/)
const fonts = z.object({
  transcript: family.default(''),
  input: family.default(''),
  code: family.default(''),
})

/** Validation and defaults for durable VN settings. */
export const VnSettingsSchema: z<VnSettings> = z.object({
  enabled: z.boolean().default(false),
  images: images.default({ idle: '', thinking: '', responding: '', decision: '', tool: '', error: '' }),
  panelOpacity: z.number().min(0.35).max(1).default(0.78),
  panelBlur: z.number().step(1).min(0).max(32).default(12),
  imageFit: z.union(['cover', 'contain', 'stretch']).default('cover'),
  imageZoom: z.number().step(1).min(50).max(200).default(100),
  imageFocusX: z.number().step(1).min(0).max(100).default(50),
  imageFocusY: z.number().step(1).min(0).max(100).default(50),
  inputOpacity: percent.default(80),
  userOpacity: percent.default(80),
  fileOpacity: percent.default(85),
  headerOpacity: percent.default(70),
  fonts: fonts.default({ transcript: '', input: '', code: '' }),
})

/** Resolved defaults used before the Client receives Host settings. */
export const DEFAULT_VN_SETTINGS: VnSettings = {
  enabled: false,
  images: { idle: '', thinking: '', responding: '', decision: '', tool: '', error: '' },
  panelOpacity: 0.78,
  panelBlur: 12,
  imageFit: 'cover',
  imageZoom: 100,
  imageFocusX: 50,
  imageFocusY: 50,
  inputOpacity: 80,
  userOpacity: 80,
  fileOpacity: 85,
  headerOpacity: 70,
  fonts: { transcript: '', input: '', code: '' },
}
