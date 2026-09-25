import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const presetRoot = path.resolve(import.meta.dirname, '../presets/yuu')
const skillsRoot = path.join(presetRoot, 'skills')

const packagedSkills = ['deepseek-only-dev', 'subimouto-dev']
const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hostInvocation = /~\/\.claude|~\/\.codex|~\/\.imouto|~\/notes|imouto-dispatch|mcp__claude|codex exec|claude -p/
const absoluteHostPath = /(?:^|[\s("'`\[])[A-Za-z]:[\\/]|\\\\[A-Za-z]|\/Users\/|\/home\/|\/root\//m

function scalar(source: string, key: string): string {
  return new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(source)?.[1]?.trim() ?? ''
}

function presetFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name)
    if (entry.isDirectory()) return presetFiles(child)
    return entry.name.endsWith('.md') ? [child] : []
  })
}

describe('Yuu preset manifest', () => {
  it('declares the preset identity', () => {
    const manifest = fs.readFileSync(path.join(presetRoot, 'preset.yml'), 'utf8')
    expect(scalar(manifest, 'name')).toBe('Yuu')
    expect(scalar(manifest, 'description').length).toBeGreaterThan(0)
    expect(Number(scalar(manifest, 'order'))).toBeGreaterThan(0)
  })

  it('ships exactly the packaged preset skills', () => {
    const shipped = fs.readdirSync(skillsRoot).filter(entry => !entry.endsWith('.retired')).sort()
    expect(shipped).toEqual(packagedSkills)
  })

  for (const name of packagedSkills) {
    it(`${name}/SKILL.md carries a name that matches its directory`, () => {
      const source = fs.readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8')
      expect(source.startsWith('---\n')).toBe(true)
      expect(scalar(source, 'name')).toBe(name)
      expect(scalar(source, 'name')).toMatch(skillName)
      expect(scalar(source, 'description').length).toBeGreaterThan(0)
    })
  }
})

describe('Yuu preset portability', () => {
  it('loads the TypeScript imouto-driver entry through tsx', () => {
    const config = fs.readFileSync(path.join(presetRoot, 'agent.cordis.yml'), 'utf8')
    expect(config).toContain('command: !!js "process.execPath"')
    expect(config).toContain('- --import\n      - tsx/esm')
    expect(config).toContain('IMOUTO_DRIVER_ENTRY is required for imouto-yuu')
  })

  it('carries no absolute host path', () => {
    const offenders = presetFiles(presetRoot).filter(file => absoluteHostPath.test(fs.readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('carries no host-specific invocation', () => {
    const offenders = presetFiles(presetRoot).filter(file => hostInvocation.test(fs.readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
