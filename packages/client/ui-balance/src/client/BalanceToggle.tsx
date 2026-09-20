import { useEffect, useState, type ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BALANCE_PATH, type BalanceSnapshot } from '../balance.ts'
import type { BalanceLocaleKey } from './locale.ts'
import css from './BalanceToggle.module.css'

/** Props of the composer-footer balance toggle. */
export type BalanceToggleProps =
  PropsRuntime<'conversation.composer.footer'>
  & { readonly t: (key: BalanceLocaleKey) => string }

/**
 * The composer-footer balance readout. It starts as the show label and reveals
 * the account's topped-up balance while it is open.
 * @param props.t - balance locale seat.
 * @returns the toggle and, while open, the reading.
 */
export function BalanceToggle({ t }: BalanceToggleProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<BalanceSnapshot | null>(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const read = async (): Promise<void> => {
      try {
        // Every showing asks for a fresh read, so a reopened readout is current.
        const response = await fetch(`${BALANCE_PATH}?fresh=1`, { credentials: 'include' })
        if (!response.ok) throw new Error(`balance read failed with HTTP ${String(response.status)}`)
        const payload = await response.json() as BalanceSnapshot
        if (!cancelled) setSnapshot(payload)
      } catch {
        // A refused read shows the unavailable copy; the composer is unaffected.
        if (!cancelled) setSnapshot({ status: 'unavailable' })
      }
    }
    void read()
    return () => { cancelled = true }
  }, [open])
  const reading = snapshot === null
    ? t('toppedUp')
    : snapshot.status === 'ok'
      ? `${snapshot.currency ?? ''} ${snapshot.toppedUp ?? ''}`.trim()
      : t(snapshot.status)
  return <div className={css.root} data-balance-toggle="">
    <button type="button" className={css.trigger} aria-expanded={open} onClick={() => { setOpen(!open) }}>
      {open ? t('hide') : t('show')}
    </button>
    {open ? <span className={css.reading} role="status">{reading}</span> : null}
  </div>
}
