/**
 * Host registration for the imouto-driver worker panel.
 *
 * The route reads the driver's state directory on demand. The browser polls it,
 * so no host timer and no push channel are needed, and nothing here writes to a
 * file the driver owns.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel
 */

import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import { PANEL_PATH, readPanelSnapshot, type PanelBounds } from './panel.ts'
import { driverStateDirFor } from './state-dir.ts'

export * from './panel.ts'
export type { DriverActivity, DriverSnapshot, DriverWorker, DriverWorkerStatus } from './types.ts'

/** Maximum worker rows one request answers. */
const DEFAULT_MAX_WORKERS = 32
/** Maximum trailing bytes of the activity stream one request scans. */
const DEFAULT_MAX_TAIL_BYTES = 262_144
/** Shortest accepted activity window. */
const MIN_TAIL_BYTES = 1_024
/** Longest accepted activity window. */
const MAX_TAIL_BYTES = 4_194_304

/** Host configuration for the driver worker panel. */
export interface Config {
  /** Absolute driver root whose per-project state directory the panel reads. */
  root: string
  /** Maximum worker rows one request answers. */
  maxWorkers?: number
  /** Maximum trailing bytes of the activity stream one request scans. */
  maxTailBytes?: number
}

export const Config: z<Config> = z.object({
  root: z.string().pattern(/^(?:[A-Za-z]:[\\/]|\/)/),
  maxWorkers: z.number().step(1).min(1).max(256).default(DEFAULT_MAX_WORKERS),
  maxTailBytes: z.number().step(1024).min(MIN_TAIL_BYTES).max(MAX_TAIL_BYTES).default(DEFAULT_MAX_TAIL_BYTES),
})

/**
 * Register the authenticated driver snapshot route.
 * @param ctx - host Context carrying the Connection service.
 * @param config - validated driver root and read bounds.
 */
export function apply(ctx: Context, config: Config): void {
  // The state directory is derived forward from the configured root. A reader
  // must never reverse map one from a directory name: the hash is the identity
  // and the label is only a basename.
  const bounds: PanelBounds = {
    stateDir: driverStateDirFor(config.root, { home: homedir(), platform: process.platform, env: process.env }),
    maxWorkers: config.maxWorkers ?? DEFAULT_MAX_WORKERS,
    maxTailBytes: config.maxTailBytes ?? DEFAULT_MAX_TAIL_BYTES,
  }
  ctx.inject(['connection'], (routeCtx) => {
    routeCtx.effect(() => routeCtx.connection.fetch.register({
      path: PANEL_PATH, methods: ['GET'], requestBody: 'buffered',
      fetch: () => Promise.resolve(Response.json(readPanelSnapshot(bounds, new Date().toISOString()))),
    }), 'imouto-driver-panel: snapshot route')
  })
}
