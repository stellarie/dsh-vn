import { describe, expect, it } from 'vitest'
import { createSystemMessage, createToolResultMessage, createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { planConversation, systemTextOf, toolResultContent, turnEnvelopeOf } from '../src/conversation.ts'
import type { LiveState } from '../src/conversation.ts'
import { assistant, assistantCalling, request, toolResult, user } from './support.ts'

const stopped = { response: { claudeSessionId: 'abc', model: 'sonnet', turn: 1, stopped: true } }
const parked = { response: { claudeSessionId: 'abc', model: 'sonnet', turn: 1, stopped: false } }
const noImages = () => Promise.reject(new Error('no image expected'))

const live = (extra: Partial<LiveState> = {}): LiveState => ({
  claudeSessionId: 'abc',
  turn: 1,
  parkedIds: [],
  model: 'sonnet',
  effort: undefined,
  toolsSignature: 'sig',
  ...extra,
})

const plan = (messages: Parameters<typeof request>[0], state?: LiveState, overrides: Parameters<typeof request>[1] = {}) =>
  planConversation(request(messages, overrides), 'claude-code', noImages, state, 'sig')

describe('turn envelopes', () => {
  it('reads the session, turn, and stop state of this route only', () => {
    expect(turnEnvelopeOf(assistant('a', 'claude-code', stopped), 'claude-code')).toEqual({ claudeSessionId: 'abc', turn: 1, stopped: true })
    expect(turnEnvelopeOf(assistant('a', 'claude-code', parked), 'claude-code')).toEqual({ claudeSessionId: 'abc', turn: 1, stopped: false })
    expect(turnEnvelopeOf(assistant('a', 'claude-code', { response: { claudeSessionId: 'abc' } }), 'claude-code'))
      .toEqual({ claudeSessionId: 'abc', turn: undefined, stopped: true })
    expect(turnEnvelopeOf(assistant('a', 'other', stopped), 'claude-code')).toBeUndefined()
    expect(turnEnvelopeOf(user('a'), 'claude-code')).toBeUndefined()
  })

  it.each([
    ['no envelope', undefined],
    ['a non-object envelope', 'text'],
    ['an envelope without a session id', { response: {} }],
    ['an empty session id', { response: { claudeSessionId: '' } }],
  ])('rejects %s', (_label, replayState) => {
    expect(turnEnvelopeOf(assistant('a', 'claude-code', replayState), 'claude-code')).toBeUndefined()
  })
})

describe('planConversation', () => {
  it('continues the live query with tool results in any order and extra user text', async () => {
    const calls = assistantCalling([['t1', 'a', '{}'], ['t2', 'b', '{}']], parked)
    const result = await plan(
      [user('go'), calls, toolResult('t2', 'two'), toolResult('t1', 'one'), user('and be brief')],
      live({ parkedIds: ['t1', 't2'] }),
    )
    expect(result).toEqual({
      kind: 'continue',
      results: [
        { id: 't2', content: [{ type: 'text', text: 'two' }], isError: false },
        { id: 't1', content: [{ type: 'text', text: 'one' }], isError: false },
      ],
      extras: [{ type: 'text', text: 'and be brief' }],
    })
  })

  it('continues an idle live query with new user text', async () => {
    const result = await plan([user('a'), assistant('b', 'claude-code', stopped), user('c'), user('d')], live())
    expect(result).toEqual({
      kind: 'continue',
      results: [],
      extras: [{ type: 'text', text: 'c' }, { type: 'text', text: '\n\n' }, { type: 'text', text: 'd' }],
    })
  })

  it.each([
    ['another turn', live({ turn: 2 })],
    ['another Claude session', live({ claudeSessionId: 'zzz' })],
    ['another model', live({ model: 'haiku' })],
    ['another effort', live({ effort: 'high' })],
    ['another tool set', live({ toolsSignature: 'changed' })],
    ['no live query', undefined],
  ])('does not continue for %s and resumes the finished session instead', async (_label, state) => {
    const result = await plan([user('a'), assistant('b', 'claude-code', stopped), user('c')], state)
    expect(result).toEqual({ kind: 'resume', resumeSessionId: 'abc', parts: [{ type: 'text', text: 'c' }] })
  })

  it('does not continue when a parked call has no result, an unknown call is answered, or nothing new follows', async () => {
    const state = live({ parkedIds: ['t1'] })
    const calls = assistantCalling([['t1', 'a', '{}']], parked)
    expect((await plan([user('go'), calls, user('never mind')], state)).kind).toBe('fresh')
    expect((await plan([user('go'), calls, toolResult('t9', 'x')], state)).kind).toBe('fresh')
    expect((await plan([user('go'), calls, toolResult('t1', 'x'), toolResult('t1', 'again')], state)).kind).toBe('fresh')
    expect((await plan([user('a'), assistant('b', 'claude-code', stopped)], live())).kind).toBe('fresh')
    expect((await plan([user('a'), assistant('b', 'claude-code', { ...stopped, response: { ...stopped.response, turn: 1 } }), toolResult('t1', 'x')], live())).kind).toBe('fresh')
  })

  it('never resumes after a tool-use stop, only after a final answer', async () => {
    const calls = assistantCalling([['t1', 'a', '{}']], parked)
    const result = await plan([user('go'), calls, toolResult('t1', 'x')], undefined)
    expect(result.kind).toBe('fresh')
    const text = result.kind === 'fresh' ? result.parts.map(part => (part.type === 'text' ? part.text : '')).join('') : ''
    expect(text).toContain('[tool call a] {}')
    expect(text).toContain('[tool result]')
  })

  it('accepts an envelope from before bridge mode as a final answer', async () => {
    const legacy = { response: { claudeSessionId: 'abc', model: 'sonnet' } }
    expect((await plan([user('a'), assistant('b', 'claude-code', legacy), user('c')])).kind).toBe('resume')
  })

  it('starts fresh when another route answered after the envelope', async () => {
    const result = await plan([user('a'), assistant('b', 'claude-code', stopped), user('c'), assistant('d', 'deepseek-official'), user('e')], live())
    expect(result.kind).toBe('fresh')
  })

  it('starts fresh with the plain message for a single user message and labels a longer history', async () => {
    expect(await plan([user('only')])).toEqual({ kind: 'fresh', parts: [{ type: 'text', text: 'only' }] })
    const longer = await plan([user('one'), assistant('two'), user('three')])
    expect(longer.kind === 'fresh' ? longer.parts.map(part => (part.type === 'text' ? part.text : '')).join('') : '').toBe([
      'The conversation so far follows. Reply to the last user message.',
      '[user]\none',
      '[assistant]\ntwo',
      '[user]\nthree',
    ].join('\n\n'))
  })

  it('never continues or resumes an auxiliary request', async () => {
    const result = await plan([user('a'), assistant('b', 'claude-code', stopped), user('c')], live(), { purpose: 'compaction' })
    expect(result.kind).toBe('fresh')
  })
})

describe('history rendering', () => {
  it('renders files and skips reasoning, empty text, and unknown blocks', async () => {
    const file = createUserMessage({
      content: [
        { type: 'text', text: '' },
        { type: 'file', attachment: { attachmentId: 'sha256:abcdef0123456789', name: 'notes.txt', bytes: 5 } as never },
        { type: 'weird' } as never,
      ],
      source: { kind: 'user' },
    })
    const thinker = { ...assistant('', 'deepseek-official'), content: [{ type: 'reasoning', text: 'hidden' }, { type: 'text', text: 'shown' }] } as never
    const result = await plan([file, thinker, user('next')])
    const text = result.kind === 'fresh' ? result.parts.map(part => (part.type === 'text' ? part.text : '')).join('') : ''
    expect(text).toContain('"notes.txt"')
    expect(text).toContain('shown')
    expect(text).not.toContain('hidden')
  })

  it('renders a nested tool result inside a tool result message', async () => {
    const nested = createToolResultMessage({ callId: ToolCallId('t1'), isError: false, content: [{ type: 'text', text: 'file body' }] })
    const result = await plan([user('a'), assistantCalling([['t1', 'read', '{}']]), nested, user('b')])
    const text = result.kind === 'fresh' ? result.parts.map(part => (part.type === 'text' ? part.text : '')).join('') : ''
    expect(text).toContain('file body')
  })
})

describe('toolResultContent', () => {
  it('maps text and images to MCP content and uses a placeholder for nothing', async () => {
    const blocks: ContentBlock[] = [{ type: 'text', text: 'a' }, { type: 'text', text: '' }]
    expect(await toolResultContent(blocks, noImages)).toEqual([{ type: 'text', text: 'a' }])
    expect(await toolResultContent([], noImages)).toEqual([{ type: 'text', text: '(no output)' }])
  })
})

describe('systemTextOf', () => {
  it('returns the system field, or nothing when the request has no system text', () => {
    expect(systemTextOf(request([user('a')], { system: 'S1' }))).toBe('S1')
    expect(systemTextOf(request([user('a')]))).toBeUndefined()
  })

  it('joins the system field with the text of leading system messages', () => {
    const system = createSystemMessage('S2', 'dsh-system-prompt')
    const empty = createSystemMessage('', 'dsh-system-prompt')
    expect(systemTextOf(request([system, empty, user('a')], { system: 'S1' }))).toBe('S1\n\nS2')
    expect(systemTextOf(request([empty, user('a')], { system: '' }))).toBeUndefined()
    const mixed = { ...system, content: [{ type: 'text', text: '' }, { type: 'reasoning', text: 'r' }, { type: 'text', text: 'kept' }] } as never
    expect(systemTextOf(request([mixed, user('a')]))).toBe('kept')
  })
})
