import path from 'node:path'
import { parse, lineOf } from './parse.ts'
/** One blackboard validation finding. */
export interface Finding { rule: string; severity: 'error' | 'warn'; line: number; message: string }
const required = ['protocol','task','initiator','execution_mode','status','owner','next_action','created','updated','project','base_revision']
const enums: Record<string,string[]> = { initiator:['Chloe','Sherry','Yuu','oniichan'], execution_mode:['solo','delegated','auto'], coordination_transport:['native','discord','driver'], status:['planning','ready','implementing','review','verifying','done','blocked'], owner:['Chloe','Sherry','Yuu','oniichan','none'] }
function section(body: string, name: string): string | undefined { return new RegExp(`^## ${name}\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(body)?.[1] }
function finding(rule: string, severity: 'error'|'warn', line: number, message: string): Finding { return { rule, severity, line, message } }
/**
 * Validate one blackboard task document.
 * @param file - task file path.
 * @param text - task Markdown.
 * @returns findings, or `legacy` for an older file.
 */
export function validate(file: string, text: string): Finding[] | 'legacy' {
  let parsed
  try { parsed = parse(text) } catch (error) {
    const source = text.replace(/^\uFEFF/, '')
    return source.startsWith('---\n') || source.startsWith('---\r\n')
      ? [finding('fm-parse','error',1,String(error))]
      : 'legacy'
  }
  if (!('protocol' in parsed.data)) return 'legacy'
  const out: Finding[] = []
  for (const key of required) if (!(key in parsed.data)) out.push(finding('fm-required','error',1,`missing ${key}`))
  for (const [key, values] of Object.entries(enums)) if (key in parsed.data && !values.includes(String(parsed.data[key]))) out.push(finding('fm-enum','error',lineOf(text,`${key}:`),`invalid ${key}`))
  if (String(parsed.data.task) !== path.basename(file, '.md')) out.push(finding('fm-task-slug','error',lineOf(text,'task:'),'task must match filename'))
  for (const key of ['created','updated']) if (key in parsed.data && !/^\d{4}-\d{2}-\d{2}$/.test(String(parsed.data[key]))) out.push(finding('fm-date','error',lineOf(text,`${key}:`),`invalid ${key}`))
  const verifier = typeof parsed.data.verifier === 'string' ? parsed.data.verifier : ''
  if (parsed.data.status === 'verifying' && !verifier.trim()) out.push(finding('verifying-verifier','error',lineOf(text,'status:'),'verifying requires verifier'))
  if (parsed.data.status === 'done' && (parsed.data.owner !== 'none' || parsed.data.next_action !== 'none')) out.push(finding('done-owner','error',lineOf(text,'status:'),'done requires owner and next_action none'))
  for (const name of ['Objective','Acceptance Test','Plan','Subimoutos','Thread']) if (section(parsed.body,name) === undefined) out.push(finding('section-required','error',1,`missing ${name}`))
  for (const name of ['Work Items','Implementation Notes','Review']) if (section(parsed.body,name) === undefined) out.push(finding('section-expected','warn',1,`missing ${name}`))
  const acceptance = section(parsed.body,'Acceptance Test')
  if (acceptance !== undefined) for (const line of acceptance.split(/\r?\n/)) if (/^(?:- |\d+\. )/.test(line) && !/\[(?:auto|manual|review)]/.test(line)) out.push(finding('acceptance-tag','error',lineOf(text,line),'acceptance item lacks tag'))
  const subs = section(parsed.body,'Subimoutos')
  if (subs !== undefined && subs.trim() !== 'None.') {
    const blocks = [...subs.matchAll(/^### .+\r?\n([\s\S]*?)(?=^### |(?![\s\S]))/gm)]
    const fields = ['Spawned by','Role','Model','Effort','Host ID','Work file','Task','Outcome']
    if (!blocks.length) out.push(finding('subimouto-fields','error',lineOf(text,'## Subimoutos'),'missing subimouto block'))
    for (const block of blocks) {
      const body = block[1] ?? ''
      const values: Record<string, string> = {}
      for (const match of body.matchAll(/^- ([^:]+): (.*)$/gm)) {
        const key = match[1]
        const value = match[2]
        if (key !== undefined && value !== undefined) values[key] = value
      }
      for (const field of fields) if (!(field in values)) out.push(finding('subimouto-fields','error',lineOf(text,block[0]),`missing ${field}`))
      if (values['Spawned by'] && !['Chloe','Sherry','Yuu'].includes(values['Spawned by'])) out.push(finding('subimouto-enum','error',lineOf(text,block[0]),'invalid Spawned by'))
      if (values.Role && !['explore','implement','review','repair','integrate'].includes(values.Role)) out.push(finding('subimouto-enum','error',lineOf(text,block[0]),'invalid Role'))
      if (values.Effort && !['minimal','low','medium','high','xhigh','max','ultra'].includes(values.Effort)) out.push(finding('subimouto-enum','error',lineOf(text,block[0]),'invalid Effort'))
      if (values.Model && (['gpt-5.6-terra','gpt-6-astra','subimouto'].includes(values.Model) || values.Model.endsWith('-max'))) out.push(finding('subimouto-model','error',lineOf(text,block[0]),'invalid Model'))
    }
  }
  return out
}
