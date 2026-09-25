/**
 * The Team view lifecycle one surface owns: load, reload, and the failure line.
 *
 * Both Team surfaces read the same view, publish the same failure, and hand the
 * same three operations to the shared task board, so the state machine lives
 * here once. Each surface still decides when to read: the dialog on open, the
 * stack on mount and on its own interval.
 */

import { useCallback, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { failureText } from './team-view.ts'
import type { TeamActionResult } from './team-remote.ts'

/** Live Team view state one surface renders, and the operations it shares. */
export interface TeamViewState {
  readonly view: TeamView | null
  readonly loading: boolean
  readonly failure: string | null
  /** Publish one failure line, or clear it with null. */
  readonly fail: (message: string | null) => void
  /** Cancel an in-flight reload, leaving the view on screen. */
  readonly invalidate: () => void
  /** Drop what the previous Session showed and cancel its reloads. */
  readonly reset: () => void
  /** Re-read the view; `true` when a new view was published. */
  readonly refresh: () => Promise<boolean>
}

/**
 * Own one surface's Team view.
 * @param sessionId - Session whose Team view this surface shows.
 * @param load - injected loader for one Session.
 * @returns the view state and the operations a surface and its board share.
 */
export function useTeamView(
  sessionId: SessionId,
  load: (sessionId: SessionId) => Promise<TeamActionResult<TeamView>>,
): TeamViewState {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<TeamView | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const sessionRef = useRef(sessionId)
  const refreshGeneration = useRef(0)
  sessionRef.current = sessionId

  const invalidate = useCallback((): void => {
    refreshGeneration.current += 1
    setLoading(false)
  }, [])

  const reset = useCallback((): void => {
    invalidate()
    setView(null)
    setFailure(null)
  }, [invalidate])

  const refresh = useCallback(async (): Promise<boolean> => {
    const requestedSession = sessionId
    const generation = ++refreshGeneration.current
    setLoading(true)
    const result = await load(requestedSession)
    if (sessionRef.current !== requestedSession || refreshGeneration.current !== generation) return false
    setLoading(false)
    if (result.ok) {
      setView(result.value)
      setFailure(null)
      return true
    }
    // A refused read is a display state: the last good view stays on screen.
    setFailure(failureText(result.error))
    return false
  }, [load, sessionId])

  return { view, loading, failure, fail: setFailure, invalidate, reset, refresh }
}
