import { validate } from './rules.ts'
/** Blackboard task status. */
export type Status = 'planning'|'ready'|'implementing'|'review'|'verifying'|'done'|'blocked'
/** Blackboard task owner. */
export type Owner = 'Chloe'|'Sherry'|'Yuu'|'oniichan'|'none'
/** Inputs for one validated task transition. */
export interface TransitionInput { to: Status; owner: Owner; nextAction: string; verifier?: string; today: string }
const edges: Record<Status, Status[]> = { planning:['ready','implementing','blocked'], ready:['implementing','blocked'], implementing:['review','blocked'], review:['implementing','verifying','done','blocked'], verifying:['implementing','done','blocked'], blocked:['planning','ready','implementing','review'], done:[] }
/**
 * Apply one legal task transition.
 * @param text - current task Markdown.
 * @param input - requested transition fields.
 * @returns updated task Markdown.
 */
export function transition(text: string, input: TransitionInput): string {
  const prior = validate('task.md', text); if (prior === 'legacy') throw new Error('legacy file')
  const current = /^status: (.+)$/m.exec(text)?.[1] as Status | undefined
  if (!current || !edges[current].includes(input.to)) throw new Error(`illegal transition ${current} -> ${input.to}`)
  if (input.to === 'verifying' && !input.verifier) throw new Error('verifying requires verifier')
  const owner = input.to === 'done' ? 'none' : input.owner; const next = input.to === 'done' ? 'none' : input.nextAction
  let result = text.replace(/^status: .*$/m,`status: ${input.to}`).replace(/^owner: .*$/m,`owner: ${owner}`).replace(/^next_action: .*$/m,`next_action: ${next}`).replace(/^updated: .*$/m,`updated: ${input.today}`)
  if (input.to === 'verifying') result = /^verifier: .*$/m.test(result) ? result.replace(/^verifier: .*$/m,`verifier: ${input.verifier}`) : result.replace(/^next_action: .*$/m, line=>`${line}\nverifier: ${input.verifier}`)
  else result = result.replace(/^verifier: .*\r?\n/m, '')
  const after = validate('task.md', result); if (after === 'legacy') throw new Error('invalid result')
  const oldErrors = new Set(prior.filter(f=>f.severity==='error').map(f=>`${f.rule}:${f.message}`))
  const added = after.filter(f=>f.severity==='error' && !oldErrors.has(`${f.rule}:${f.message}`)); if (added.length) throw new Error(added[0]?.message)
  return result
}
