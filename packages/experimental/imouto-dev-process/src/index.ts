import fs from 'node:fs'
import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { validate } from './blackboard/rules.ts'
import { transition, type Owner, type Status } from './blackboard/transition.ts'

export const name = 'imouto-blackboard'
export const inject = ['tools']

function markdownPath(value: string): string {
  if (!path.isAbsolute(value) || path.extname(value).toLowerCase() !== '.md') throw new Error('path must be an absolute .md path')
  return value
}

/**
 * Render blackboard validation findings.
 * @param file - absolute Markdown path.
 * @returns one display line per finding.
 */
export function validationLines(file: string): string {
  const result = validate(file, fs.readFileSync(file, 'utf8'))
  if (result === 'legacy') return `${file}: legacy`
  if (!result.length) return `${file}: ok`
  return result.map(item => `${file}:${item.line}: ${item.severity} ${item.rule} ${item.message}`).join('\n')
}

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'blackboard_validate',
    description: 'Validate one absolute Markdown blackboard task path.',
    parameters: { path: { type: 'string', required: true } },
    output: { schema: { type: 'string' }, render: (_args: unknown, value: string) => [{ type: 'text', text: value }] },
    execute: (args: { path: string }) => Promise.resolve(validationLines(markdownPath(args.path))),
  }))
  ctx.tools.register(defineTool({
    name: 'blackboard_transition',
    description: 'Apply one legal blackboard task status transition atomically.',
    parameters: {
      path: { type: 'string', required: true },
      to: { type: 'string', required: true },
      owner: { type: 'string', required: true },
      next_action: { type: 'string', required: true },
      verifier: { type: 'string' },
    },
    output: { schema: { type: 'string' }, render: (_args: unknown, value: string) => [{ type: 'text', text: value }] },
    execute: (args: { path: string; to: string; owner: string; next_action: string; verifier?: string }) => {
      const file = markdownPath(args.path)
      const result = transition(fs.readFileSync(file, 'utf8'), {
        to: args.to as Status,
        owner: args.owner as Owner,
        nextAction: args.next_action,
        ...(args.verifier === undefined ? {} : { verifier: args.verifier }),
        today: new Date().toISOString().slice(0, 10),
      })
      const temporary = `${file}.tmp-${process.pid}`
      fs.writeFileSync(temporary, result)
      fs.renameSync(temporary, file)
      return Promise.resolve(result.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '')
    },
  }))
}
