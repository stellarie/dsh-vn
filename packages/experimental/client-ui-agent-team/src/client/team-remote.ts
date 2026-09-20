/** Remote result and request vocabulary shared by both Team surfaces. */

import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type {
  TeamTaskAction, TeamTaskId, TeamTaskMutationResult,
} from '@deepseek-ai/dsh-experimental-agent-team/client'

/** Generated Remote result consumed directly by the Team UI. */
export type TeamActionResult<T> = RemoteResult<T>

/** Generated Remote result whose business value preserves Team task rejections. */
export type TeamTaskActionResult = RemoteResult<TeamTaskMutationResult>

/** Request that creates one shared task. */
export interface TeamTaskCreateInput {
  readonly subject: string
  readonly description: string
  readonly blockedBy: TeamTaskId[]
  readonly writeScopes: string[]
}

/** Request that applies one compare-and-set task mutation. */
export interface TeamTaskUpdateInput {
  readonly taskId: TeamTaskId
  readonly expectedRevision: number
  readonly action: TeamTaskAction
  readonly subject?: string
  readonly description?: string
  readonly blockedBy?: TeamTaskId[]
  readonly writeScopes?: string[]
  readonly owner?: string
}
