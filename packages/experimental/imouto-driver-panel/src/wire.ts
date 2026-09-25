/**
 * Browser-safe wire vocabulary shared by both faces.
 *
 * This module imports nothing, so the browser half can name the route without
 * pulling the host reader, and its Node filesystem imports, into the bundle.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel/wire
 */

/** Authenticated Connection route owned by the driver panel. */
export const PANEL_PATH = '/api/imouto-driver-panel/snapshot'

/** How often the browser asks the host for a fresh snapshot. */
export const PANEL_POLL_MS = 3_000
