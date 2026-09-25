/** DeepSeek balance readout: wire parsing and one provider read. */

/** Authenticated Connection route owned by the balance service. */
export const BALANCE_PATH = '/api/ui-balance/read'

/** Provider endpoint that reports the account balance. */
const BALANCE_ENDPOINT = '/user/balance'

/** One resolved balance readout. */
export interface BalanceSnapshot {
  /** `ok` carries amounts; `unconfigured` means no credential; `unavailable` means the provider refused or answered without a balance. */
  readonly status: 'ok' | 'unconfigured' | 'unavailable'
  /** Currency code the provider reports. */
  readonly currency?: string
  /** Total available balance, granted plus topped up. */
  readonly total?: string
  /** Unexpired granted balance. */
  readonly granted?: string
  /** Topped-up balance. */
  readonly toppedUp?: string
}

/** Inputs for one provider balance read. */
export interface BalanceReaderOptions {
  /** Provider API root that serves the balance endpoint. */
  readonly baseURL: string
  /** Fetch implementation; injected so a test can drive the provider. */
  readonly fetch: typeof globalThis.fetch
  /** Resolves the API key, or undefined while none is configured. */
  readonly apiKey: () => Promise<string | undefined>
}

/** One non-empty string field of the provider payload. */
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Read one balance row out of a provider payload. The provider answers at a
 * wire boundary, so every field is checked before it reaches the UI.
 * @param payload - decoded balance response body.
 * @returns the snapshot, or `unavailable` when no complete row exists.
 */
export function parseBalance(payload: unknown): BalanceSnapshot {
  const body = payload as { balance_infos?: unknown } | null | undefined
  const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : []
  const row = infos.find(entry => typeof entry === 'object' && entry !== null) as Record<string, unknown> | undefined
  const currency = text(row?.['currency'])
  const total = text(row?.['total_balance'])
  const granted = text(row?.['granted_balance'])
  const toppedUp = text(row?.['topped_up_balance'])
  if (currency === undefined || total === undefined || granted === undefined || toppedUp === undefined) {
    return { status: 'unavailable' }
  }
  return { status: 'ok', currency, total, granted, toppedUp }
}

/** Perform the authenticated provider request. */
async function requestBalance(options: BalanceReaderOptions, key: string): Promise<BalanceSnapshot> {
  const response = await options.fetch(new URL(BALANCE_ENDPOINT, options.baseURL), {
    headers: { accept: 'application/json', authorization: `Bearer ${key}` },
  })
  if (!response.ok) return { status: 'unavailable' }
  return parseBalance(await response.json())
}

/**
 * Read the account balance once.
 * @param options - provider root, fetch, and the credential reader.
 * @returns the snapshot; a refused read is a display state, never a throw.
 */
export async function readBalance(options: BalanceReaderOptions): Promise<BalanceSnapshot> {
  const key = await options.apiKey()
  if (key === undefined || key === '') return { status: 'unconfigured' }
  try {
    return await requestBalance(options, key)
  } catch {
    // A refused provider read is a display state: the composer keeps working.
    return { status: 'unavailable' }
  }
}

/** Inputs for the cache one balance route keeps. */
export interface BalanceCacheOptions {
  /** How long one read stays current for a caller that accepts the cache. */
  readonly cacheMs: number
  /** Performs one provider read. */
  readonly read: () => Promise<BalanceSnapshot>
  /** Clock, injectable so a test can advance the window. */
  readonly now?: () => number
}

/**
 * Build the read cache behind the balance route. A caller that shows the
 * readout asks fresh, so a reopened readout is current; other callers share one
 * provider read inside the window.
 * @param options - cache window, provider reader, and clock.
 * @returns a reader taking the caller's freshness request.
 */
export function createBalanceCache(options: BalanceCacheOptions): (fresh: boolean) => Promise<BalanceSnapshot> {
  const now = options.now ?? Date.now
  let cached: { readonly at: number; readonly snapshot: BalanceSnapshot } | undefined
  return async (fresh) => {
    const at = now()
    if (!fresh && cached !== undefined && at - cached.at < options.cacheMs) return cached.snapshot
    const snapshot = await options.read()
    cached = { at, snapshot }
    return snapshot
  }
}
