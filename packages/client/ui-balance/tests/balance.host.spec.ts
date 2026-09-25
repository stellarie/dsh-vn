import { describe, expect, it, vi } from 'vitest'
import { createBalanceCache, parseBalance, readBalance } from '../src/balance.ts'

/** The documented provider payload shape. */
const payload = {
  is_available: true,
  balance_infos: [{
    currency: 'CNY',
    total_balance: '110.00',
    granted_balance: '10.00',
    topped_up_balance: '100.00',
  }],
}

const root = 'https://api.deepseek.com'

describe('balance readout', () => {
  it('reads the topped-up row out of a provider payload', () => {
    expect(parseBalance(payload)).toEqual({
      status: 'ok', currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00',
    })
  })

  it('reports unavailable when the payload carries no complete row', () => {
    expect(parseBalance({ balance_infos: [{ currency: 'CNY' }] })).toEqual({ status: 'unavailable' })
    expect(parseBalance({ balance_infos: [] })).toEqual({ status: 'unavailable' })
    expect(parseBalance(null)).toEqual({ status: 'unavailable' })
  })

  it('reports unconfigured without a credential, and makes no provider call', async () => {
    const fetch = vi.fn()
    const snapshot = await readBalance({ baseURL: root, fetch, apiKey: async () => undefined })
    expect(snapshot).toEqual({ status: 'unconfigured' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requests the provider balance endpoint with the bearer credential', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    const snapshot = await readBalance({ baseURL: root, fetch, apiKey: async () => 'sk-test' })
    expect(snapshot.status).toBe('ok')
    expect(fetch).toHaveBeenCalledWith(new URL(`${root}/user/balance`), {
      headers: { accept: 'application/json', authorization: 'Bearer sk-test' },
    })
  })

  it('reports unavailable when the provider refuses or the read throws', async () => {
    const refused = vi.fn(async () => new Response('nope', { status: 401 }))
    const refusedSnapshot = await readBalance({ baseURL: root, fetch: refused, apiKey: async () => 'k' })
    expect(refusedSnapshot).toEqual({ status: 'unavailable' })
    const thrown = vi.fn(async () => { throw new Error('offline') })
    const thrownSnapshot = await readBalance({ baseURL: root, fetch: thrown, apiKey: async () => 'k' })
    expect(thrownSnapshot).toEqual({ status: 'unavailable' })
  })
})

describe('balance cache', () => {
  const snapshot = { status: 'ok', currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00' } as const

  it('serves the cached read inside the window, and re-reads on a fresh request', async () => {
    let now = 1_000
    const read = vi.fn(async () => snapshot)
    const cached = createBalanceCache({ cacheMs: 60_000, read, now: () => now })
    expect(await cached(false)).toEqual(snapshot)
    await cached(false)
    expect(read).toHaveBeenCalledTimes(1)
    // The toggle asks fresh every time it is shown, so a reopened readout is current.
    await cached(true)
    expect(read).toHaveBeenCalledTimes(2)
    now += 60_001
    await cached(false)
    expect(read).toHaveBeenCalledTimes(3)
  })
})
