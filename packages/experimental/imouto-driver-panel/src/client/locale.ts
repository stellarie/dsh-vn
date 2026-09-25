import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale namespace for the driver worker panel. */
export const NS = 'experimental.imoutoDriverPanel'

/** English driver panel copy. */
export const en = {
  title: 'Driver workers',
  open: 'Driver workers',
  description: 'Show the live imouto-driver workers and their current activity.',
  empty: 'No imouto-driver workers are running.',
  unavailable: 'The imouto-driver state is unavailable right now.',
  running: 'Running',
  idle: 'Idle',
  tucked: 'Tucked',
  unknown: 'Unknown',
}

/** Chinese driver panel copy. */
export const zh = {
  title: '驱动工作进程',
  open: '驱动工作进程',
  description: '显示正在运行的 imouto-driver 工作进程及其当前活动。',
  empty: '当前没有运行中的 imouto-driver 工作进程。',
  unavailable: '暂时无法获取 imouto-driver 状态。',
  running: '运行中',
  idle: '空闲',
  tucked: '已收起',
  unknown: '未知',
}

/** Keys shared by both driver panel dictionaries. */
export type DriverPanelLocaleKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'experimental.imoutoDriverPanel': DriverPanelLocaleKey
  }
}
