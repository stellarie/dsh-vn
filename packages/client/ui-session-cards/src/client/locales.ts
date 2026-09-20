/** Collapsed-Sidebar session-card dictionaries. */

/** Locale namespace owned by the collapsed-Sidebar session cards. */
export const NS = 'sessionCards'

/** Simplified Chinese dictionary and key source. */
export const zh = {
  stack: '需要关注的会话',
  'state.running': '运行中',
  'state.decision': '等待你的决定',
  'state.done': '已完成，尚未打开',
} satisfies Record<string, string>

/** Session-card locale key union. */
export type SessionCardKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  stack: 'Sessions needing attention',
  'state.running': 'Running',
  'state.decision': 'Waiting on you',
  'state.done': 'Finished, not opened',
} satisfies Record<SessionCardKey, string>
