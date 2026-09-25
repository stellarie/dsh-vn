import { describe, expect, it } from 'vitest'
import { validate } from '../src/blackboard/rules.ts'

const frontmatter = `---
protocol: imouto-blackboard/v1
task: task
initiator: Sherry
execution_mode: auto
coordination_transport: native
status: implementing
owner: Sherry
next_action: Work.
created: 2026-09-19
updated: 2026-09-19
project: x
base_revision: abc
---
`
const completeBlock = `### Riko
- Spawned by: Sherry
- Role: implement
- Model: gpt-5.6-luna
- Effort: max
- Host ID: /root/riko
- Work file: task.work/W001-riko-implement.md
- Task: Implement the bounded task.
- Outcome: Completed the bounded task.
`
function fixture(subimoutos = 'None.'): string {
  return `${frontmatter}## Objective
x
## Acceptance Test
- [auto] x
## Plan
x
## Work Items
x
## Implementation Notes
x
## Review
x
## Subimoutos
${subimoutos}
## Thread
x
`
}
function rules(text: string): string[] {
  const result = validate('task.md', text)
  if (result === 'legacy') return ['legacy']
  return result.map(finding => finding.rule)
}

describe('frontmatter and sections', () => {
  it('accepts a valid file', () =>{  expect(validate('task.md', fixture())).toEqual([]) })
  it('reports a file without frontmatter as legacy', () =>{  expect(validate('old.md', '# old')).toBe('legacy') })
  it('reports malformed delimited YAML as fm-parse', () => {
    expect(rules('---\nowner: [\n---\n')).toEqual(['fm-parse'])
  })
  const cases: [string, string, string][] = [
    ['fm-required', 'project: x\n', ''],
    ['fm-enum', 'owner: Sherry', 'owner: bad'],
    ['fm-task-slug', 'task: task', 'task: wrong'],
    ['fm-date', 'created: 2026-09-19', 'created: yesterday'],
    ['verifying-verifier', 'status: implementing', 'status: verifying'],
    ['done-owner', 'status: implementing', 'status: done'],
    ['section-required', '## Objective\nx\n', ''],
    ['section-expected', '## Review\nx\n', ''],
    ['acceptance-tag', '- [auto] x', '- x'],
  ]
  for (const [rule, from, to] of cases) {
    it(`isolates ${rule}`, () =>{  expect(rules(fixture().replace(from, to))).toContain(rule) })
  }
})

describe('dsh protocol enums', () => {
  it('accepts Yuu as initiator and owner with driver transport', () => {
    const yuu = fixture().replace('initiator: Sherry', 'initiator: Yuu').replace('coordination_transport: native', 'coordination_transport: driver').replace('owner: Sherry', 'owner: Yuu')
    expect(rules(yuu)).toEqual([])
  })
  it('accepts Yuu as Spawned by', () =>{  expect(rules(fixture(completeBlock.replace('Spawned by: Sherry', 'Spawned by: Yuu')))).toEqual([]) })
})

describe('subimouto fixtures', () => {
  it('accepts None', () =>{  expect(rules(fixture('None.'))).toEqual([]) })
  it('accepts one complete valid block', () =>{  expect(rules(fixture(completeBlock))).toEqual([]) })
  it('rejects an empty body', () =>{  expect(rules(fixture(''))).toContain('subimouto-fields') })
  for (const field of ['Spawned by', 'Role', 'Model', 'Effort', 'Host ID', 'Work file', 'Task', 'Outcome']) {
    it(`rejects a block missing ${field}`, () => {
      const incomplete = completeBlock.replace(new RegExp(`^- ${field}:.*\\n`, 'm'), '')
      expect(rules(fixture(incomplete))).toContain('subimouto-fields')
    })
  }
  const enumCases: [string, string][] = [
    ['- Spawned by: Sherry', '- Spawned by: invalid'],
    ['- Role: implement', '- Role: invalid'],
    ['- Effort: max', '- Effort: normal'],
  ]
  for (const [from, to] of enumCases) {
    it(`rejects invalid enum ${to}`, () =>{  expect(rules(fixture(completeBlock.replace(from, to)))).toContain('subimouto-enum') })
  }
  for (const model of ['gpt-5.6-terra', 'gpt-6-astra', 'gpt-5.6-luna-max', 'subimouto']) {
    it(`rejects model ${model}`, () => {
      expect(rules(fixture(completeBlock.replace('gpt-5.6-luna', model)))).toContain('subimouto-model')
    })
  }
})
