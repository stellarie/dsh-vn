import type { UserConfig } from 'tsdown'

export default { entry: ['src/index.ts'], outDir: 'lib', format: ['esm'], fixedExtension: false, dts: false } satisfies UserConfig
