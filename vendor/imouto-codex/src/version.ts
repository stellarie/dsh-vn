import { createRequire } from 'node:module'

/** This package's own manifest, the single owner of the published version. */
const manifest = createRequire(import.meta.url)('../package.json') as { version: string }

/** Version of the installed `dsh-imouto-codex` package. */
export const CODEX_CONNECT_VERSION = manifest.version
