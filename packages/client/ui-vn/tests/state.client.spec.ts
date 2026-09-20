import { describe, expect, it } from 'vitest'
import { deriveVnState } from '../src/client/state.ts'

describe('VN state derivation', () => {
  it('uses deterministic precedence', () => {
    expect(deriveVnState({})).toBe('idle')
    expect(deriveVnState({ running: true })).toBe('thinking')
    expect(deriveVnState({ running: true, responding: true })).toBe('responding')
    expect(deriveVnState({ responding: true, tool: true })).toBe('tool')
    expect(deriveVnState({ tool: true, pendingDecision: true })).toBe('decision')
    expect(deriveVnState({ pendingDecision: true, error: true })).toBe('error')
  })
})
