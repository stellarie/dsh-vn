import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { MAX_ASSET_BYTES, VnAssetStore } from '../src/store.ts'

const roots: string[] = []

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

function png(width = 2, height = 3): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

describe('VN asset store', () => {
  it('publishes and reads one content-addressed PNG', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-vn-'))
    roots.push(root)
    const store = new VnAssetStore(root)
    const id = await store.save(png())
    expect(id).toMatch(/^[a-f0-9]{64}\.png$/)
    expect((await store.read(id)).mediaType).toBe('image/png')
    expect(await readFile(join(root, id.slice(0, 2), id))).toEqual(Buffer.from(png()))
    await store.remove(id)
    await expect(store.read(id)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects unsupported, oversized, and over-dimensioned files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-vn-'))
    roots.push(root)
    const store = new VnAssetStore(root)
    await expect(store.save(new Uint8Array([1, 2, 3]))).rejects.toThrow('PNG, JPEG, or extended WebP')
    await expect(store.save(new Uint8Array(MAX_ASSET_BYTES + 1))).rejects.toThrow('size')
    await expect(store.save(png(8193, 1))).rejects.toThrow('dimensions')
  })

  it('deduplicates equal bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-vn-'))
    roots.push(root)
    const store = new VnAssetStore(root)
    expect(await store.save(png())).toBe(await store.save(png()))
  })
})
