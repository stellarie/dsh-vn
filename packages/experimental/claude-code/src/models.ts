/**
 * Claude model catalog for the dsh picker. Rows come from the Claude Code
 * runtime once per catalog instance; a failed lookup serves a fixed fallback
 * list and reports a diagnostic instead of hiding the provider.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/models
 */

import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk'

/** Reasoning effort names the Claude Code runtime accepts. */
export const CLAUDE_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/** One reasoning effort accepted by the runtime. */
export type ClaudeEffort = typeof CLAUDE_EFFORTS[number]

/**
 * Test whether a string names a reasoning effort the runtime accepts.
 * @param value - candidate effort name.
 * @returns true when the runtime accepts the effort.
 */
export function isClaudeEffort(value: string): value is ClaudeEffort {
  return (CLAUDE_EFFORTS as readonly string[]).includes(value)
}

/** One selectable Claude model with the efforts the runtime reports for it. */
export interface ClaudeModel {
  /** Value passed as the SDK `model` option. */
  readonly id: string
  /** Picker name. */
  readonly name: string
  /** Runtime description, when reported. */
  readonly description?: string
  /** Supported efforts in runtime order; empty when the model has none. */
  readonly efforts: readonly ClaudeEffort[]
}

/** Models served when runtime discovery fails. */
export const FALLBACK_MODELS: readonly ClaudeModel[] = [
  { id: 'opus', name: 'Opus', efforts: CLAUDE_EFFORTS },
  { id: 'sonnet', name: 'Sonnet', efforts: CLAUDE_EFFORTS },
  { id: 'haiku', name: 'Haiku', efforts: [] },
  { id: 'claude-fable-5-1[1m]', name: 'Fable 5.1 (1M context)', efforts: CLAUDE_EFFORTS },
]

/**
 * Convert runtime rows to catalog entries.
 * @param rows - rows from `Query.supportedModels()`.
 * @returns one entry per distinct `value`, in runtime order.
 */
export function modelsFromRows(rows: readonly ModelInfo[]): ClaudeModel[] {
  const seen = new Set<string>()
  const models: ClaudeModel[] = []
  for (const row of rows) {
    if (row.value.length === 0 || seen.has(row.value)) continue
    seen.add(row.value)
    models.push({
      id: row.value,
      name: row.displayName.length > 0 ? row.displayName : row.value,
      ...row.description.length === 0 ? {} : { description: row.description },
      efforts: (row.supportedEffortLevels ?? []).filter(isClaudeEffort),
    })
  }
  return models
}

/** Catalog contents plus the discovery diagnostic, when discovery failed. */
export interface CatalogSnapshot {
  readonly models: readonly ClaudeModel[]
  readonly diagnostic?: string
}

/**
 * Lazy, memoized model catalog. The first call runs discovery; later calls
 * reuse its outcome for the life of this instance, including a failure.
 */
export class ClaudeModelCatalog {
  private pending: Promise<CatalogSnapshot> | undefined

  /**
   * @param discover - reads model rows from the Claude Code runtime.
   * @param onSettled - receives each outcome once, right after discovery ends.
   */
  constructor(
    private readonly discover: () => Promise<readonly ModelInfo[]>,
    private readonly onSettled?: (snapshot: CatalogSnapshot) => void,
  ) {}

  /**
   * Load the catalog.
   * @returns the discovered models, or the fallback list with a diagnostic.
   */
  load(): Promise<CatalogSnapshot> {
    this.pending ??= this.discoverOnce()
    return this.pending
  }

  private async discoverOnce(): Promise<CatalogSnapshot> {
    let snapshot: CatalogSnapshot
    try {
      const models = modelsFromRows(await this.discover())
      snapshot = models.length > 0
        ? { models }
        : { models: FALLBACK_MODELS, diagnostic: 'Claude Code reported no models; serving the fallback list.' }
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error)
      snapshot = {
        models: FALLBACK_MODELS,
        diagnostic: `Claude Code model discovery failed (${reason}); serving the fallback list.`,
      }
    }
    try {
      this.onSettled?.(snapshot)
    } catch (_observerFailure) {
      // The diagnostic sink cannot change the catalog outcome.
    }
    return snapshot
  }
}
