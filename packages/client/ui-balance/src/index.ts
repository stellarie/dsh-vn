/** Host registration for the DeepSeek balance readout. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import { BALANCE_PATH, createBalanceCache, readBalance } from './balance.ts'

export * from './balance.ts'

/** Provider API root that serves the balance endpoint. */
const DEFAULT_BASE_URL = 'https://api.deepseek.com'
/** Credential reference that holds the DeepSeek API key. */
const DEFAULT_API_KEY_REF = 'DEEPSEEK_API_KEY'
/** Shortest accepted cache window, so a click cannot stampede the provider. */
const MIN_CACHE_MS = 5_000
/** Longest accepted cache window. */
const MAX_CACHE_MS = 3_600_000

/** Host configuration for the balance readout. */
export interface Config {
  /** Provider API root serving the balance endpoint. */
  baseURL?: string
  /** Credential reference holding the API key. */
  apiKeyRef?: string
  /** How long one provider read stays current. */
  cacheMs?: number
}
export const Config: z<Config> = z.object({
  baseURL: z.string().default(DEFAULT_BASE_URL),
  apiKeyRef: z.string().pattern(/^[A-Za-z_][A-Za-z0-9_]*$/).role('credential-ref').default(DEFAULT_API_KEY_REF),
  cacheMs: z.number().step(1000).min(MIN_CACHE_MS).max(MAX_CACHE_MS).default(60_000),
})

/**
 * Whether one request asks for a read that bypasses the cache. The toggle sends
 * this every time it is shown, so a reopened readout is current.
 * @param request - the authenticated balance request.
 * @returns true when the caller wants the provider read now.
 */
function asksFresh(request: Request): boolean {
  return new URL(request.url).searchParams.get('fresh') === '1'
}

/**
 * Register the authenticated balance route.
 * @param ctx - host Context.
 * @param config - provider root, credential reference, and cache window.
 */
export function apply(ctx: Context, config: Config): void {
  const baseURL = config.baseURL ?? DEFAULT_BASE_URL
  // The config pattern already restricts this value to a shell identifier, so
  // the brand is established at this boundary instead of re-derived here.
  const apiKeyRef = (config.apiKeyRef ?? DEFAULT_API_KEY_REF) as CredentialRef
  const cacheMs = config.cacheMs ?? 60_000
  ctx.inject(['connection', 'credentials'], (routeCtx) => {
    const cached = createBalanceCache({
      cacheMs,
      read: async () => await readBalance({
        baseURL,
        fetch: globalThis.fetch,
        apiKey: async () => (await routeCtx.credentials.resolve(apiKeyRef))?.value,
      }),
    })
    routeCtx.effect(() => routeCtx.connection.fetch.register({
      path: BALANCE_PATH, methods: ['GET'], requestBody: 'buffered',
      fetch: async request => Response.json(await cached(asksFresh(request))),
    }), 'ui-balance: balance route')
  })
}
