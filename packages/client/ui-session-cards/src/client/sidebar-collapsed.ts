/**
 * The frame's collapsed-left-Sidebar fact, read from the attribute the frame
 * publishes on its root.
 *
 * The layout exposes actions, not its collapsed state, so the fact is read
 * where the frame already states it: `data-sidebar-collapsed` is present on the
 * frame root exactly while the left column is hidden. Reading the attribute
 * keeps this plugin out of the layout's internals and adds no service.
 */

import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

/** Attribute the app frame sets on its root while the left Sidebar is hidden. */
const COLLAPSED_ATTRIBUTE = 'data-sidebar-collapsed'

/**
 * Observe whether the left Sidebar is collapsed.
 *
 * The snapshot is a boolean, so it stays reference-stable between changes.
 * @returns the observable the slot runtime binds to a selector hook.
 */
export function createSidebarCollapsedSource(): HostObservable<boolean> {
  return {
    getSnapshot: () => document.querySelector(`[${COLLAPSED_ATTRIBUTE}]`) !== null,
    subscribe: (listener) => {
      const observer = new MutationObserver(listener)
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [COLLAPSED_ATTRIBUTE],
      })
      return () => { observer.disconnect() }
    },
  }
}
