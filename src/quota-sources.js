/**
 * Declarative quota/balance sources. Endpoints and credential refs only;
 * request execution lives in adapters.js so this file stays pure data + parsing.
 */

const TIMEOUT = 6000

export const OPENCODE_USAGE = 'https://opencode.ai/zen/go/v1/usage'
export const OPENCODE_USAGE_FALLBACK = 'https://opencode.ai/api/v1/usage'
export const COMMAND_CODE_CREDITS = 'https://api.commandcode.ai/alpha/billing/credits'

function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

function pickNumber(...values) {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 容错解析单个窗口：usedPercent / used_ratio / percentage / used+limit。 */
export function parseWindow(raw, key) {
  if (raw === null || raw === undefined || typeof raw !== 'object') return null
  const direct = pickNumber(raw.usedPercent, raw.used_percent, raw.percentage, raw.percent)
  let percent = direct
  if (percent === null && raw.used_ratio !== undefined) percent = Number(raw.used_ratio) * 100
  if (percent === null) {
    const used = pickNumber(raw.used, raw.current, raw.consumed)
    const limit = pickNumber(raw.limit, raw.total, raw.max)
    if (used !== null && limit !== null && limit > 0) percent = (used / limit) * 100
  }
  if (percent === null) return null
  const resetAt = pickNumber(raw.resetAt, raw.reset_at, raw.resetTime, raw.reset_time, raw.nextResetTime, raw.next_reset_time)
  const usedPercent = clampPercent(percent)
  return { key, usedPercent: usedPercent === null ? null : Math.round(usedPercent * 100) / 100, resetAt: resetAt ?? undefined, source: 'official' }
}

function collectFromMap(source, map) {
  const windows = []
  for (const [key, names] of Object.entries(map)) {
    for (const name of names) {
      const parsed = parseWindow(source?.[name], key)
      if (parsed !== null) { windows.push(parsed); break }
    }
  }
  return windows
}

/**
 * OpenCode Go：兼容 `usage` / `data` 下的 fiveHour / weekly / monthly，
 * 以及数组形式的 windows / limits。无法识别的窗口不补占位。
 */
export function parseOpenCodeUsage(body) {
  const data = body?.data ?? body
  const usage = data?.usage ?? data
  const windows = collectFromMap(usage, {
    '5h': ['fiveHour', 'five_hour', 'fiveHourWindow', '5h'],
    week: ['weekly', 'week', 'weekWindow'],
    month: ['monthly', 'month', 'monthWindow'],
  })
  const rows = Array.isArray(usage?.windows) ? usage.windows : Array.isArray(usage?.limits) ? usage.limits : []
  for (const row of rows) {
    const name = String(row?.key ?? row?.type ?? row?.name ?? '').toLowerCase()
    const key = name.includes('5') || name.includes('five') ? '5h'
      : name.includes('week') ? 'week'
        : name.includes('month') ? 'month' : null
    if (key === null || windows.some((item) => item.key === key)) continue
    const parsed = parseWindow(row, key)
    if (parsed !== null) windows.push(parsed)
  }
  return windows
}

/** Command Code：credits（数字或对象）+ windowLimits.fiveHour / weekly。 */
export function parseCommandCodeCredits(body) {
  const data = body?.data ?? body
  const rawCredits = data?.credits ?? data?.credit ?? data?.balance
  const amount = pickNumber(
    typeof rawCredits === 'object' && rawCredits !== null ? rawCredits.amount : rawCredits,
    typeof rawCredits === 'object' && rawCredits !== null ? rawCredits.balance : undefined,
    typeof rawCredits === 'object' && rawCredits !== null ? rawCredits.value : undefined,
  )
  const limits = data?.windowLimits ?? data?.window_limits ?? data?.limits ?? data
  const windows = []
  const five = parseWindow(limits?.fiveHour ?? limits?.five_hour, '5h')
  const week = parseWindow(limits?.weekly ?? limits?.week, 'week')
  if (five !== null) windows.push(five)
  if (week !== null) windows.push(week)
  const balance = amount === null
    ? null
    : { amount, status: 'ok', currency: 'CNY', updatedAt: Date.now() }
  return { windows, balance }
}

export const PROVIDER_SOURCES = [
  { id: 'deepseek-official', kind: 'api', currency: 'CNY', legacy: 'deepseek' },
  { id: 'zhipu', kind: 'subscription', currency: 'CNY', legacy: 'glm' },
  { id: 'moonshot', kind: 'subscription', currency: 'CNY', legacy: 'kimi' },
  { id: 'openrouter', kind: 'api', currency: 'USD', legacy: 'openrouter' },
  { id: 'qwen', kind: 'api', currency: 'CNY', legacy: 'qwen' },
  {
    id: 'opencode-go',
    kind: 'subscription',
    currency: 'USD',
    credential: { type: 'bearer', refs: ['OPENCODE_GO_API_KEY'] },
    quota: { url: OPENCODE_USAGE, fallbackUrl: OPENCODE_USAGE_FALLBACK, parse: parseOpenCodeUsage },
  },
  {
    id: 'command-code',
    kind: 'subscription',
    currency: 'CNY',
    credential: { type: 'bearer', refs: ['COMMAND_CODE_API_KEY'] },
    preflight: { refs: ['COMMAND_CODE_ORG_ID'], param: 'orgId' },
    quota: { url: COMMAND_CODE_CREDITS, parse: parseCommandCodeCredits },
  },
]

export { TIMEOUT }
