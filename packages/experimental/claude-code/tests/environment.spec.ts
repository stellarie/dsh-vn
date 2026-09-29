import { describe, expect, it } from 'vitest'
import { childEnvironment } from '../src/environment.ts'

describe('childEnvironment', () => {
  it('removes the Claude Code marker, Claude Code variables, and Anthropic variables', () => {
    const env = childEnvironment({}, {
      PATH: '/bin',
      HOME: '/home/a',
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
      CLAUDE_CODE_OAUTH_TOKEN: 'sentinel',
      ANTHROPIC_API_KEY: 'sentinel',
      ANTHROPIC_AUTH_TOKEN: 'sentinel',
      ANTHROPIC_BASE_URL: 'https://proxy.invalid',
    })
    expect(env).toEqual({ PATH: '/bin', HOME: '/home/a' })
  })

  it('matches names case-insensitively because Windows environments are', () => {
    expect(childEnvironment({}, { Anthropic_Api_Key: 'x', claudecode: '1', Path: 'p' })).toEqual({ Path: 'p' })
  })

  it('keeps variables that only resemble the removed names', () => {
    const env = childEnvironment({}, { CLAUDE_CONFIG_DIR: '/c', MY_ANTHROPIC_KEY: 'k', CLAUDECODEX: 'y' })
    expect(env).toEqual({ CLAUDE_CONFIG_DIR: '/c', MY_ANTHROPIC_KEY: 'k', CLAUDECODEX: 'y' })
  })

  it('layers the configured overlay last, even over a removed name', () => {
    const env = childEnvironment({ ANTHROPIC_BASE_URL: 'https://gateway.invalid', EXTRA: '1' }, {
      ANTHROPIC_BASE_URL: 'https://parent.invalid',
      EXTRA: '0',
    })
    expect(env).toEqual({ ANTHROPIC_BASE_URL: 'https://gateway.invalid', EXTRA: '1' })
  })

  it('drops undefined parent values and does not mutate the parent', () => {
    const parent: NodeJS.ProcessEnv = { A: '1', B: undefined, CLAUDECODE: '1' }
    expect(childEnvironment({}, parent)).toEqual({ A: '1' })
    expect(parent).toEqual({ A: '1', B: undefined, CLAUDECODE: '1' })
  })
})
