import { useEffect, useState, type ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { PANEL_PATH, PANEL_POLL_MS } from '../wire.ts'
import type { DriverSnapshot, DriverWorker } from '../types.ts'
import type { DriverPanelLocaleKey } from './locale.ts'
import css from './DriverPanel.module.css'

/** Props of the driver worker pane body. */
export type DriverPanelProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & { readonly t: (key: DriverPanelLocaleKey) => string }

/** What one read produced: a snapshot, or the copy shown when the read failed. */
type PanelState =
  | { readonly kind: 'snapshot'; readonly snapshot: DriverSnapshot }
  | { readonly kind: 'unavailable' }

/** One-line activity summary; empty when the driver recorded no act yet. */
function activityText(worker: DriverWorker): string {
  if (worker.lastActivity === undefined) return ''
  return `${worker.lastActivity.type} ${worker.lastActivity.detail}`.trim()
}

/**
 * The driver worker pane body. It polls the host route and lists one row per
 * worker. A refused read and an empty roster are display states, never throws.
 * @param props.t - driver panel locale seat.
 * @returns the worker stack, or the empty or unavailable notice.
 */
export function DriverPanel({ t }: DriverPanelProps): ReactNode {
  const [state, setState] = useState<PanelState | null>(null)
  useEffect(() => {
    let cancelled = false
    const read = async (): Promise<void> => {
      try {
        const response = await fetch(PANEL_PATH, { credentials: 'include' })
        if (!response.ok) throw new Error(`driver panel read failed with HTTP ${String(response.status)}`)
        const snapshot = await response.json() as DriverSnapshot
        if (!cancelled) setState({ kind: 'snapshot', snapshot })
      } catch {
        // A refused read is a display state: the sidebar keeps working.
        if (!cancelled) setState({ kind: 'unavailable' })
      }
    }
    void read()
    const timer = setInterval(() => { void read() }, PANEL_POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])
  if (state === null) return <p className={css.empty} role="status">{t('empty')}</p>
  if (state.kind === 'unavailable') return <p className={css.empty} role="status">{t('unavailable')}</p>
  const workers = state.snapshot.workers
  if (workers.length === 0) return <p className={css.empty} role="status">{t('empty')}</p>
  return <ul className={css.root} data-driver-panel="">
    {workers.map(worker => <li key={worker.id} className={css.row} data-worker={worker.id}>
      <span className={css.head}>
        <span className={css.name}>{worker.name}</span>
        <span className={css.status} data-status={worker.status}>{t(worker.status)}</span>
      </span>
      <span className={css.goal}>{worker.goal}</span>
      <span className={css.activity}>{activityText(worker)}</span>
    </li>)}
  </ul>
}
