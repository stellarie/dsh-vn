import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { uploadVnAsset } from '../src/index.ts'
import { MAX_ASSET_BYTES, VnAssetStore } from '../src/store.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('VN upload route', () => {
  it('rejects declared and streamed oversized bodies before storage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-vn-route-'))
    roots.push(root)
    const store = new VnAssetStore(root)
    const declared = new Request('https://dsh.test/api/ui-vn/upload', {
      method: 'POST', headers: { 'content-length': String(MAX_ASSET_BYTES + 1) }, body: new Uint8Array([1]),
    })
    expect((await uploadVnAsset(store, declared)).status).toBe(413)

    const streamed = new Request('https://dsh.test/api/ui-vn/upload', {
      method: 'POST', body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(MAX_ASSET_BYTES))
          controller.enqueue(new Uint8Array([1]))
          controller.close()
        },
      }),
      duplex: 'half',
    } as RequestInit)
    expect((await uploadVnAsset(store, streamed)).status).toBe(413)
  })
})
