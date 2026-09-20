import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale namespace for the balance readout. */
export const NS = 'ui.balance'

/** English balance copy. */
export const en = {
  show: 'Show topped-up balance',
  hide: 'Hide topped-up balance',
  toppedUp: 'Topped up',
  unconfigured: 'No DeepSeek credential is configured.',
  unavailable: 'The balance is unavailable right now.',
}

/** Chinese balance copy. */
export const zh = {
  show: '显示充值余额',
  hide: '隐藏充值余额',
  toppedUp: '充值余额',
  unconfigured: '尚未配置 DeepSeek 凭据。',
  unavailable: '暂时无法获取余额。',
}

/** Keys shared by both balance dictionaries. */
export type BalanceLocaleKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ui.balance': BalanceLocaleKey
  }
}
