import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { validationLines } from '../src/index.ts'

const fixtures = path.resolve(import.meta.dirname, 'fixtures')
describe('dsh validator', () => {
  for (const name of fs.readdirSync(fixtures).filter(file => file.endsWith('.md'))) {
    it(`matches CLI format for ${name}`, () => {
      const file = path.join(fixtures, name)
      const lines = validationLines(file)
      expect(lines).toContain(file)
    })
  }
})
