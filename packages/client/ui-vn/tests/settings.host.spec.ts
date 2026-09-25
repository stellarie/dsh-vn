import { describe, expect, it } from 'vitest'
import { VnSettingsSchema } from '../src/vn-settings.ts'

describe('VN settings', () => {
  it('resolves defaults and rejects unsafe values', () => {
    const defaults = VnSettingsSchema({} as never)
    expect(defaults.enabled).toBe(false)
    expect(defaults.images.idle).toBe('')
    expect(() => VnSettingsSchema({ panelOpacity: 2 } as never)).toThrow()
    expect(() => VnSettingsSchema({ images: { idle: '../outside.png' } } as never)).toThrow()
  })
})
