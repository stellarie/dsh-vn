// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { BalanceToggle } from '../src/client/BalanceToggle.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const translate = (key: string): string => key

function renderToggle() {
  const props = { t: translate } as unknown as ComponentProps<typeof BalanceToggle>
  return render(<BalanceToggle {...props} />)
}

describe('balance toggle', () => {
  it('starts as the show label and reveals the reading while open', async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00' }),
    }))
    vi.stubGlobal('fetch', fetch)
    const view = renderToggle()
    expect(view.getByRole('button', { name: 'show' })).toBeTruthy()
    expect(view.queryByRole('status')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'show' }))
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('CNY 100.00') })
    expect(view.getByRole('button', { name: 'hide' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'hide' }))
    expect(view.queryByRole('status')).toBeNull()
    expect(view.getByRole('button', { name: 'show' })).toBeTruthy()
  })

  it('refreshes the reading every time it is shown', async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'ok', currency: 'CNY', total: '110.00', granted: '10.00', toppedUp: '100.00' }),
    }))
    vi.stubGlobal('fetch', fetch)
    const view = renderToggle()
    fireEvent.click(view.getByRole('button', { name: 'show' }))
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('CNY 100.00') })
    fireEvent.click(view.getByRole('button', { name: 'hide' }))
    fireEvent.click(view.getByRole('button', { name: 'show' }))
    await waitFor(() => { expect(fetch).toHaveBeenCalledTimes(2) })
    // A fresh read bypasses the Host cache, so a reopened readout is current.
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('fresh=1'), expect.objectContaining({ credentials: 'include' }))
  })

  it('shows the unavailable copy when the read fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    const view = renderToggle()
    fireEvent.click(view.getByRole('button', { name: 'show' }))
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('unavailable') })
  })

  it('shows the unconfigured copy when no credential is stored', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: 'unconfigured' }) })))
    const view = renderToggle()
    fireEvent.click(view.getByRole('button', { name: 'show' }))
    await waitFor(() => { expect(view.getByRole('status').textContent).toBe('unconfigured') })
  })
})
