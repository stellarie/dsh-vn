/** Host registration for visual-novel assets and settings. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-settings'
import { MAX_ASSET_BYTES, VnAssetStore } from './store.ts'
import { VN_ASSET_PATH, VN_DELETE_PATH, VN_UPLOAD_PATH } from './protocol.ts'
import { VN_SETTINGS_NAMESPACE, VnSettingsSchema, type VnSettings } from './vn-settings.ts'

export * from './vn-settings.ts'

export { VN_ASSET_PATH, VN_DELETE_PATH, VN_UPLOAD_PATH } from './protocol.ts'

/** Host configuration for managed VN image storage. */
export interface Config {
  /** Absolute directory that owns content-addressed VN images. */
  assetRoot: string
}
export const Config: z<Config> = z.object({ assetRoot: z.string().required() })

/**
 * Handle one authenticated VN asset read.
 * @param store - managed image store.
 * @param request - authenticated asset request.
 * @returns the image response or a bounded failure.
 */
export async function readVnAsset(store: VnAssetStore, request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id')
  if (id === null) return new Response('missing id', { status: 400 })
  try {
    const image = await store.read(id)
    const body = new Uint8Array(image.bytes.byteLength)
    body.set(image.bytes)
    return new Response(body.buffer, { headers: { 'content-type': image.mediaType, 'cache-control': 'private, max-age=31536000, immutable' } })
  } catch { return new Response('not found', { status: 404 }) }
}

/**
 * Handle one authenticated VN asset upload.
 * @param store - managed image store.
 * @param request - authenticated streaming upload request.
 * @returns the identifier response or a bounded failure.
 */
export async function uploadVnAsset(store: VnAssetStore, request: Request): Promise<Response> {
  try {
    const declared = Number(request.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_ASSET_BYTES) {
      return Response.json({ error: 'VN image size is outside the allowed range.' }, { status: 413 })
    }
    const id = await store.save(await boundedBody(request, MAX_ASSET_BYTES))
    return Response.json({ id })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: message }, { status: message.includes('size') ? 413 : 400 })
  }
}

async function boundedBody(request: Request, limit: number): Promise<Uint8Array> {
  if (request.body === null) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.byteLength
      if (length > limit) {
        await reader.cancel('VN image exceeds the byte limit.')
        throw new Error('VN image size is outside the allowed range.')
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

/**
 * Handle one reference-safe authenticated VN asset deletion.
 * @param store - managed image store.
 * @param settings - current durable VN settings.
 * @param request - authenticated deletion request.
 * @returns an empty success or refusal response.
 */
export async function deleteVnAsset(
  store: VnAssetStore,
  settings: VnSettings,
  request: Request,
): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id')
  if (id === null) return new Response('missing id', { status: 400 })
  if (Object.values(settings.images).includes(id)) return new Response('asset is referenced', { status: 409 })
  await store.remove(id)
  return new Response(null, { status: 204 })
}

export function apply(ctx: Context, config: Config): void {
  const store = new VnAssetStore(config.assetRoot)
  ctx.inject(['settings'], (settingsCtx) => { settingsCtx.settings.register(VN_SETTINGS_NAMESPACE, VnSettingsSchema) })
  ctx.inject(['connection', 'settings'], (routeCtx) => {
    routeCtx.effect(() => routeCtx.connection.fetch.register({
      path: VN_ASSET_PATH, methods: ['GET'], requestBody: 'buffered',
      fetch: request => readVnAsset(store, request),
    }), 'ui-vn: asset read route')
    routeCtx.effect(() => routeCtx.connection.fetch.register({
      path: VN_UPLOAD_PATH, methods: ['POST'], requestBody: 'streaming',
      fetch: request => uploadVnAsset(store, request),
    }), 'ui-vn: asset upload route')
    routeCtx.effect(() => routeCtx.connection.fetch.register({
      path: VN_DELETE_PATH, methods: ['POST'], requestBody: 'buffered',
      fetch: request => deleteVnAsset(
        store,
        routeCtx.settings.get(VN_SETTINGS_NAMESPACE) as VnSettings,
        request,
      ),
    }), 'ui-vn: asset delete route')
  })
}
