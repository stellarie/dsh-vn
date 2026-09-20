/** Managed content-addressed VN image store. */
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { VnAssetId } from './vn-settings.ts'

/** Maximum accepted encoded image size. */
export const MAX_ASSET_BYTES = 12 * 1024 * 1024
/** Maximum accepted width or height in pixels. */
export const MAX_ASSET_DIMENSION = 8192

/** Loaded managed image bytes and media type. */
export interface VnImage { readonly bytes: Uint8Array; readonly mediaType: string }

function inspect(bytes: Uint8Array): { ext: 'png' | 'jpg' | 'webp'; width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return { ext: 'png', width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    && String.fromCharCode(...bytes.slice(12, 16)) === 'VP8X') {
    const width = 1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16)
    const height = 1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16)
    return { ext: 'webp', width, height }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue }
      const marker = bytes[offset + 1] ?? 0
      const length = view.getUint16(offset + 2)
      if (length < 2) throw new Error('VN JPEG contains an invalid segment.')
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { ext: 'jpg', height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
      }
      offset += 2 + length
    }
  }
  throw new Error('VN image must be a PNG, JPEG, or extended WebP file.')
}

/** Content-addressed managed image store. */
export class VnAssetStore {
  constructor(private readonly root: string) {}

  /**
   * Validate and publish one encoded image.
   * @param bytes - complete encoded image bytes.
   * @returns the content-addressed identifier.
   */
  async save(bytes: Uint8Array): Promise<VnAssetId> {
    if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES) throw new Error('VN image size is outside the allowed range.')
    const image = inspect(bytes)
    if (image.width < 1 || image.height < 1 || image.width > MAX_ASSET_DIMENSION || image.height > MAX_ASSET_DIMENSION) {
      throw new Error('VN image dimensions are outside the allowed range.')
    }
    const hash = createHash('sha256').update(bytes).digest('hex')
    const id = `${hash}.${image.ext}`
    const dir = join(this.root, hash.slice(0, 2))
    const target = join(dir, id)
    await mkdir(dir, { recursive: true })
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
    const file = await open(temporary, 'wx')
    try {
      await file.writeFile(bytes)
      await file.sync()
    } finally {
      await file.close()
    }
    try {
      await rename(temporary, target)
    } catch (error) {
      const targetExists = await access(target).then(() => true, () => false)
      if (!targetExists) throw error
    } finally {
      await rm(temporary, { force: true })
    }
    return id
  }

  /**
   * Read one managed image.
   * @param id - validated content-addressed identifier.
   * @returns the encoded image and media type.
   */
  async read(id: VnAssetId): Promise<VnImage> {
    const bytes = await readFile(this.path(id))
    return { bytes, mediaType: id.endsWith('.png') ? 'image/png' : id.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }
  }

  /**
   * Remove one managed image when its owner permits deletion.
   * @param id - validated content-addressed identifier.
   * @returns settlement after removal.
   */
  async remove(id: VnAssetId): Promise<void> { await rm(this.path(id), { force: true }) }

  private path(id: VnAssetId): string {
    if (!/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(id)) throw new Error('Invalid VN asset identifier.')
    return join(this.root, id.slice(0, 2), id)
  }
}
