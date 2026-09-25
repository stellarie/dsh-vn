/**
 * Resolve the driver state directory from a driver root.
 *
 * The rule is the driver's own (`imouto-driver/src/runtime/state-dir.ts`): a
 * state directory is `<stateHome>/<basename>-<sha256(normalizedRoot)[0..12]>`.
 * A reader reproduces it forward from the configured root; it never reverse
 * maps a directory name, because the hash is the identity and the basename is
 * only a label.
 * @module @deepseek-ai/dsh-experimental-imouto-driver-panel/state-dir
 */

import { createHash } from 'node:crypto'
import { basename, posix, win32 } from 'node:path'

/** Inputs of a state directory resolution. */
export interface StateDirOptions {
  /** Directory whose `.imouto/projects` holds per-project state. */
  readonly home: string
  readonly platform: NodeJS.Platform
  /** Driver environment; defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>
}

/**
 * Normalize a driver root the way the driver hashes it.
 * @param root - the driver root as configured.
 * @param platform - platform whose separator and case rules apply.
 * @returns the normalized root.
 */
export function normalizeRoot(root: string, platform: NodeJS.Platform): string {
  const normalized = platform === 'win32' ? root.replaceAll('\\', '/').toLowerCase() : root
  if (normalized === '/' || /^[a-z]:\/$/i.test(normalized)) return normalized
  return normalized.replace(/\/+$/, '')
}

/**
 * Derive one project's state directory name.
 * @param root - the driver root as configured.
 * @param platform - platform whose separator and case rules apply.
 * @returns the directory name, `<label>-<hash>`.
 */
export function projectKey(root: string, platform: NodeJS.Platform): string {
  const normalized = normalizeRoot(root, platform)
  const last = basename(normalized.replaceAll('\\', '/'))
  const segment = last !== '' && !/^[a-z]:$/i.test(last) ? last : normalized.replace(/:\/$/, ':')
  const base = segment.replace(/[^A-Za-z0-9._-]/g, '_')
  const hash = createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 12)
  return `${base}-${hash}`
}

/**
 * The base directory holding every project's driver state.
 *
 * Joining follows the requested platform rather than the reading host, so a
 * caller asking for another platform's answer gets a coherent path.
 * @param env - driver environment.
 * @param home - the user's home directory.
 * @param platform - platform whose separator rules apply.
 * @returns `IMOUTO_STATE_HOME`, else `<home>/.imouto/projects`.
 */
export function defaultStateHome(
  env: Readonly<Record<string, string | undefined>>,
  home: string,
  platform: NodeJS.Platform,
): string {
  const override = env.IMOUTO_STATE_HOME
  if (override !== undefined && override !== '') return override
  return joinerFor(platform).join(home, '.imouto', 'projects')
}

/**
 * The path namespace whose separator and join rules one platform uses.
 * @param platform - platform to select for.
 * @returns the `node:path` namespace for that platform.
 */
function joinerFor(platform: NodeJS.Platform): typeof posix {
  return platform === 'win32' ? win32 : posix
}

/**
 * The state directory one driver root owns.
 * @param root - the driver root, from validated configuration.
 * @param options - home directory, platform, and driver environment.
 * @returns the absolute state directory path.
 */
export function driverStateDirFor(root: string, options: StateDirOptions): string {
  const home = defaultStateHome(options.env ?? {}, options.home, options.platform)
  return joinerFor(options.platform).join(home, projectKey(root, options.platform))
}
