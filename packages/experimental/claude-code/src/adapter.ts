/**
 * LLM adapter for the `claude-code` provider route. It advertises the models
 * and reasoning efforts the Claude Code runtime reports and streams each
 * request through {@link streamClaudeCode}.
 *
 * @module @deepseek-ai/dsh-experimental-claude-code/adapter
 */

import { LlmAdapter, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type {
  GenerateOptions,
  LlmModelInfo,
  LlmProviderInfo,
  LlmResolvedModelInfo,
  StreamChunk,
} from '@deepseek-ai/dsh-llm'
import type { ClaudeModel, ClaudeModelCatalog } from './models.ts'

const INPUT_MODALITIES = ['text', 'image'] as const

function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** Options for {@link ClaudeCodeAdapter}. */
export interface ClaudeCodeAdapterOptions {
  /** Model catalog read for the picker and for exact-model lookups. */
  readonly catalog: ClaudeModelCatalog
  /** Streams one request; called once per `stream()`. */
  readonly stream: (options: GenerateOptions) => AsyncIterable<StreamChunk>
}

/** Adapter for one Claude Code provider route. */
export class ClaudeCodeAdapter extends LlmAdapter {
  constructor(private readonly options: ClaudeCodeAdapterOptions) {
    super()
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Claude Code' }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const { models } = await this.options.catalog.load()
    return models.map(model => ({
      provider,
      id: model.id,
      name: model.name,
      ...model.description === undefined ? {} : { description: model.description },
      inputModalities: INPUT_MODALITIES,
    }))
  }

  override async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    const { models } = await this.options.catalog.load()
    const row: ClaudeModel | undefined = models.find(candidate => candidate.id === model)
    return {
      provider,
      id: model,
      name: row?.name ?? model,
      ...row?.description === undefined ? {} : { description: row.description },
      inputModalities: INPUT_MODALITIES,
      ...row === undefined || row.efforts.length === 0
        ? {}
        : {
          reasoning: {
            efforts: row.efforts.map(effort => ({ id: ReasoningEffortId(effort), name: capitalized(effort) })),
          },
        },
    }
  }

  stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    return this.options.stream(options)
  }
}
