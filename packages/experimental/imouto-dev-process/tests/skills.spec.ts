import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

const processSkills = path.resolve(import.meta.dirname, '../skills')
const presetSkills = path.resolve(import.meta.dirname, '../../imouto-dev-profile/presets/yuu/skills')
const roots = [processSkills, presetSkills]

// The profile preset composes this package, so one catalog covers both roots.
const expectedSkills = [
  'brainstorming', 'code-review', 'codebase-analysis', 'deepseek-only-dev', 'executing-plans', 'how-claude-thinks',
  'imouto-blackboard', 'imouto-plan', 'imouto-standards', 'kotlin-guidelines', 'rust-guidelines',
  'skill-synthesis', 'subimouto-dev', 'systematic-debugging', 'test-driven-development',
  'verification-before-completion', 'writing-ste100',
]

// Workflow skills that must not enter the portable package.
const excludedSkills = ['imouto-dispatch', 'ste-writing', 'notes-wiki', 'tool-creation']

// Skill names the Yuu workflow skills maintain themselves.
const workflowSkills = [
  'deepseek-only-dev', 'imouto-blackboard', 'imouto-plan', 'imouto-standards', 'subimouto-dev',
]

const hostInvocation = /~\/\.claude|~\/\.codex|~\/\.imouto|~\/notes|imouto-dispatch|mcp__claude|codex exec|claude -p/
const absoluteHostPath = /(?:^|[\s("'`\[])[A-Za-z]:[\\/]|\\\\[A-Za-z]|\/Users\/|\/home\/|\/root\//m
const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const kebabToken = /`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g
const pageLink = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g

// Backticked tokens that are not skill names: model ids, status and phase values, host ids,
// upstream skill names kept in provenance, and chapter names in the imported pages.
const nonSkillTokens = new Map<string, string>([
  ['compliance-meaning', 'chapter name in rust-guidelines/Safety-Critical-Overview.md'],
  ['deepseek-flash', 'worker model id'],
  ['gpt-6-astra', 'model id'],
  ['imo-3', 'host id example'],
  ['imouto-driver', 'MCP worker transport name, not a skill'],
  ['needs-context', 'work-item status value'],
  ['receiving-code-review', 'upstream skill name in a provenance note'],
  ['reduce-human-error', 'chapter name in rust-guidelines/Safety-Critical-Overview.md'],
  ['requesting-code-review', 'upstream skill name in a provenance note'],
  ['self-review', 'mini-SDLC phase value'],
  ['undefined-behavior', 'chapter name in rust-guidelines/Safety-Critical-Overview.md'],
  ['writing-plans', 'upstream skill name in a provenance note'],
])

interface PackagedSkill {
  directory: string
  name: string
  description: string
  pages: string[]
}

function readCatalog(): PackagedSkill[] {
  const catalog: PackagedSkill[] = []
  for (const root of roots) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const directory = path.join(root, entry.name)
      const source = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8')
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source)
      if (frontmatter === null) throw new Error(`${entry.name}/SKILL.md has no closed frontmatter`)
      const data = parseYaml(frontmatter[1] ?? '') as { name?: unknown; description?: unknown }
      catalog.push({
        directory,
        name: typeof data.name === 'string' ? data.name : '',
        description: typeof data.description === 'string' ? data.description : '',
        pages: fs.readdirSync(directory).filter(file => file.endsWith('.md')).sort(),
      })
    }
  }
  return catalog
}

interface PageText {
  page: string
  text: string
}

function readPages(skill: PackagedSkill): PageText[] {
  return skill.pages.map(page => ({ page, text: fs.readFileSync(path.join(skill.directory, page), 'utf8') }))
}

const catalog = readCatalog()

describe('packaged skill frontmatter', () => {
  it('packages the expected catalog', () => {
    expect(catalog.map(skill => skill.name).sort()).toEqual(expectedSkills)
  })

  for (const skill of catalog) {
    it(`${skill.name}/SKILL.md carries a name that matches its directory`, () => {
      expect(path.basename(skill.directory)).toBe(skill.name)
      expect(skill.name).toMatch(skillName)
    })

    it(`${skill.name}/SKILL.md carries a description`, () => {
      expect(skill.description.trim().length).toBeGreaterThan(0)
    })
  }
})

describe('catalog resolution', () => {
  for (const skill of catalog) {
    it(`${skill.name} names only skills that the catalog resolves`, () => {
      const unresolved = new Set<string>()
      for (const { text } of readPages(skill)) {
        for (const match of text.matchAll(kebabToken)) {
          const token = match[1] ?? ''
          if (nonSkillTokens.has(token) || expectedSkills.includes(token)) continue
          unresolved.add(token)
        }
      }
      expect([...unresolved].sort()).toEqual([])
    })

    it(`${skill.name} links only pages that it packages`, () => {
      const missing = new Set<string>()
      for (const { text } of readPages(skill)) {
        for (const match of text.matchAll(pageLink)) {
          const target = (match[1] ?? '').trim()
          if (target === 'Page' || skill.pages.includes(`${target}.md`)) continue
          missing.add(target)
        }
      }
      expect([...missing].sort()).toEqual([])
    })
  }
})

describe('dangling prose', () => {
  it('never names a workflow skill that the package excludes', () => {
    const offenders: string[] = []
    for (const skill of catalog) {
      for (const { page, text } of readPages(skill)) {
        for (const name of excludedSkills) {
          if (text.includes(name)) offenders.push(`${skill.name}/${page}: ${name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('never refers to the protocol or the reasoning guide by prose alone', () => {
    const banned = /repository reasoning guide|blackboard protocol named by|How-Claude-Thinks pages|`PROTOCOL\.md`/
    const offenders: string[] = []
    for (const skill of catalog) {
      for (const { page, text } of readPages(skill)) {
        if (banned.test(text)) offenders.push(`${skill.name}/${page}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('portability', () => {
  it('keeps every packaged page free of absolute host paths', () => {
    const offenders: string[] = []
    for (const skill of catalog) {
      for (const { page, text } of readPages(skill)) {
        if (absoluteHostPath.test(text)) offenders.push(`${skill.name}/${page}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the Yuu workflow skills free of host-specific invocation', () => {
    const offenders: string[] = []
    for (const skill of catalog.filter(entry => workflowSkills.includes(entry.name))) {
      for (const { page, text } of readPages(skill)) {
        if (hostInvocation.test(text)) offenders.push(`${skill.name}/${page}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
