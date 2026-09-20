/**
 * Pure derivations over the generated Team values the Web UI renders.
 *
 * These read the roster, the task board, and the two failure carriers; nothing
 * here subscribes, fetches, or holds state.
 */

import type {
  TeamMemberView as TeamRosterMember,
  TeamTaskView as TeamTask,
  TeamView,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TeamKey } from './locales.ts'

/**
 * The current work of one roster member: the first `in_progress` task that
 * member owns, in task-board order.
 * @param view - the current roster and task board.
 * @param memberName - durable roster name matched against each task's `ownerName`.
 * @returns that member's in-progress task, or undefined when it owns none.
 */
export function currentTaskOf(view: TeamView, memberName: string): TeamTask | undefined {
  return view.tasks.find(candidate => candidate.status === 'in_progress' && candidate.ownerName === memberName)
}

/**
 * One failure line for either carrier: a Remote failure, or a Team business
 * rejection whose codes stay local to this seam and never ride the wire.
 * @param error - the failing carrier's code and message.
 * @returns the message with its code.
 */
export function failureText(error: { readonly code: string; readonly message: string }): string {
  return `${error.message} (${error.code})`
}

/**
 * Locale key for one task status.
 * @param status - durable task lifecycle value.
 * @returns the dictionary key naming it.
 */
export function statusKey(status: TeamTask['status']): TeamKey {
  switch (status) {
    case 'pending': return 'status.pending'
    case 'in_progress': return 'status.in_progress'
    case 'completed': return 'status.completed'
    /* v8 ignore next -- Team views omit deleted task tombstones. */
    case 'deleted': return 'status.completed'
  }
}

/**
 * Locale key for one roster status.
 * @param status - runtime-enriched member status.
 * @returns the dictionary key naming it.
 */
export function memberStatusKey(status: TeamRosterMember['status']): TeamKey {
  switch (status) {
    case 'running': return 'memberStatus.running'
    case 'idle': return 'memberStatus.idle'
    case 'inactive': return 'memberStatus.inactive'
    case 'provisioning': return 'memberStatus.provisioning'
    case 'failed': return 'memberStatus.failed'
  }
}
