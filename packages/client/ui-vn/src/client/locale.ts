import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale namespace for VN presentation copy. */
export const NS = 'ui.vn'

/** English VN presentation copy. */
export const en = {
  title: 'Visual novel', enabled: 'Enabled', panel: 'Panel opacity', blur: 'Background blur',
  font: 'Visual novel font', system: 'System', serif: 'Serif', rounded: 'Rounded', remove: 'Remove',
  operationFailed: 'The visual novel image operation failed.',
  idle: 'Idle', thinking: 'Thinking', responding: 'Responding', decision: 'Decision', tool: 'Tool', error: 'Error',
}

/** Chinese VN presentation copy. */
export const zh = {
  title: '视觉小说', enabled: '启用', panel: '面板透明度', blur: '背景模糊',
  font: '视觉小说字体', system: '系统', serif: '衬线', rounded: '圆体', remove: '移除',
  operationFailed: '视觉小说图片操作失败。',
  idle: '空闲', thinking: '思考', responding: '回复', decision: '决策', tool: '工具', error: '错误',
}

/** Keys shared by both VN locale dictionaries. */
export type VnLocaleKey = keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ui.vn': VnLocaleKey
  }
}
