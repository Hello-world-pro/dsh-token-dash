/**
 * 导出包构建与导入校验。纯函数、无 IO：写盘与备份由宿主负责。
 * 包内 usage 是给阅读用的派生视图，导入时忽略。
 */
import { buildUsage, localMonthKey } from './core.js'

export const BACKUP_SCHEMA = 1

const RANGES = ['today', '7d', '30d', 'all']

/** 设置 + 当月 days + 与 P2 时间选择同口径的四范围派生视图。 */
export function buildExport(state, prefs, now, providerInfoInput) {
  const month = localMonthKey(now)
  const days = Object.fromEntries(
    Object.entries(state.days ?? {}).filter(([dayKey]) => dayKey.startsWith(`${month}-`)),
  )
  const scoped = { ...state, days }
  const usage = {}
  for (const range of RANGES) {
    const view = buildUsage(scoped, prefs, range, now, providerInfoInput)
    usage[range] = { totals: view.totals, total: view.total, models: view.models }
  }
  return {
    schema: BACKUP_SCHEMA,
    exportedAt: now,
    month,
    prefs,
    providerKinds: { ...(state.providerKinds ?? {}) },
    days,
    usage,
  }
}

/** 整包校验：schema / month / days 形状任一不合法返回 reason，不做部分写入。 */
export function validateBundle(raw) {
  if (raw === null || typeof raw !== 'object') return { ok: false, reason: 'invalid-bundle' }
  if (raw.schema !== BACKUP_SCHEMA) return { ok: false, reason: 'unsupported-schema' }
  const month = String(raw.month ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, reason: 'invalid-month' }
  if (raw.days === null || typeof raw.days !== 'object' || Array.isArray(raw.days)) {
    return { ok: false, reason: 'invalid-days' }
  }
  for (const [dayKey, bucket] of Object.entries(raw.days)) {
    if (!dayKey.startsWith(`${month}-`)) return { ok: false, reason: 'month-mismatch' }
    if (bucket === null || typeof bucket !== 'object') return { ok: false, reason: 'invalid-day' }
    if (bucket.providers === undefined && bucket.models === undefined) return { ok: false, reason: 'invalid-day' }
  }
  if (raw.prefs !== undefined && (raw.prefs === null || typeof raw.prefs !== 'object')) {
    return { ok: false, reason: 'invalid-prefs' }
  }
  return { ok: true, bundle: raw }
}

/** 覆盖当月 days：先删同月旧数据再写入，保证重复导入不翻倍。 */
export function mergeImportDays(currentDays, month, incomingDays) {
  const next = { ...(currentDays ?? {}) }
  for (const dayKey of Object.keys(next)) {
    if (dayKey.startsWith(`${month}-`)) delete next[dayKey]
  }
  return Object.assign(next, incomingDays)
}
