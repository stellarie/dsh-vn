import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale namespace for VN presentation copy. */
export const NS = 'ui.vn'

/** English VN presentation copy. */
export const en = {
  title: 'Visual novel', enabled: 'Enabled', panel: 'Panel opacity', blur: 'Background blur', remove: 'Remove',
  fit: 'Background fit', cover: 'Cover', contain: 'Contain', stretch: 'Stretch',
  zoom: 'Background zoom', focusX: 'Horizontal focus', focusY: 'Vertical focus',
  inputOpacity: 'Chat input box opacity', userOpacity: 'User message opacity',
  fileOpacity: 'File card opacity', headerOpacity: 'File card header opacity',
  transcript: 'Chat log font', input: 'Chat input font', code: 'File and code font', fontDefault: 'Shipped',
  operationFailed: 'The visual novel image operation failed.',
  idle: 'Idle', thinking: 'Thinking', responding: 'Responding', decision: 'Decision', tool: 'Tool', error: 'Error',
}

/** Chinese VN presentation copy. */
export const zh = {
  title: '视觉小说', enabled: '启用', panel: '面板透明度', blur: '背景模糊', remove: '移除',
  fit: '背景适配', cover: '填充', contain: '完整显示', stretch: '拉伸',
  zoom: '背景缩放', focusX: '水平焦点', focusY: '垂直焦点',
  inputOpacity: '输入框不透明度', userOpacity: '用户消息不透明度',
  fileOpacity: '文件卡片不透明度', headerOpacity: '文件卡片标题不透明度',
  transcript: '聊天记录字体', input: '输入框字体', code: '文件与代码字体', fontDefault: '默认',
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
