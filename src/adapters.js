/**
 * External provider adapters. Endpoints and response semantics are copied from
 * the reference plugins; do not invent fields or percentages.
 */
import { normalizeProvider, providerCurrency } from './providers.js'

const TIMEOUT = 6000
const GLM_QUOTA = 'https://bigmodel.cn/api/monitor/usage/quota/limit'
const KIMI_USAGES = 'https://api.kimi.com/coding/v1/usages'
const KIMI_BALANCE = 'https://api.moonshot.cn/v1/users/me/balance'
const OPENROUTER_CREDITS = 'https://openrouter.ai/api/v1/credits'

export function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

export function parseGlmQuota(body) {
  const data = body?.data ?? body
  const rows = Array.isArray(data?.limits) ? data.limits : []
  const windows = []
  for (const row of rows) {
    if (String(row?.type ?? '').toUpperCase() !== 'TOKENS_LIMIT') continue
    const unit = Number(row.unit)
    const key = unit === 3 ? '5h' : unit === 6 ? 'week' : null
    if (key === null) continue
    const percent = clampPercent(row.percentage)
    if (percent === null) continue
    windows.push({ key, usedPercent: percent, resetAt: Number(row.nextResetTime) || undefined, source: 'official' })
  }
  return windows
}

function ratioWindow(key, raw) {
  const used = clampPercent(raw?.used_ratio)
  if (used === null) return undefined
  return { key, usedPercent: used, resetAt: Number(raw?.reset_time) || undefined, source: 'official' }
}

export function parseKimiQuota(body) {
  const record = body?.data ?? body
  const windows = []
  const usages = record?.usages
  if (usages !== null && typeof usages === 'object') {
    const five = ratioWindow('5h', usages.limit_5h)
    const month = ratioWindow('month', usages.limit_month_code) ?? ratioWindow('month', usages.limit_month_total)
    if (five) windows.push(five)
    if (month) windows.push(month)
  }
  const weekly = ratioWindow('week', record?.usage)
  if (weekly) windows.push(weekly)
  if (windows.length === 0) {
    const limits = Array.isArray(record?.limits) ? record.limits : []
    const five = limits
      .map((item) => {
        const detail = item?.detail ?? item
        const limit = Number(detail?.limit)
        const used = detail?.used !== undefined ? Number(detail.used) : (limit - Number(detail?.remaining))
        const percent = limit > 0 && Number.isFinite(used) ? clampPercent((used / limit) * 100) : null
        return percent === null ? null : { key: '5h', usedPercent: percent, resetAt: Number(detail?.resetTime) || undefined, source: 'official' }
      })
      .filter(Boolean)
      .sort((left, right) => (right.resetAt ?? 0) - (left.resetAt ?? 0))
    if (five[0]) windows.push(five[0])
    const usage = record?.usage
    const limit = Number(usage?.limit)
    const used = Number(usage?.used)
    if (limit > 0 && Number.isFinite(used)) windows.push({ key: 'week', usedPercent: clampPercent((used / limit) * 100), resetAt: Number(usage.resetTime) || undefined, source: 'official' })
  }
  return windows
}

export function parseOpenRouterCredits(body) {
  const data = body?.data ?? body
  const total = Number(data?.total_credits)
  const usage = Number(data?.total_usage)
  if (!Number.isFinite(total) || !Number.isFinite(usage)) return null
  return { amount: Math.max(0, total - usage), currency: 'USD', status: 'ok', updatedAt: Date.now() }
}

async function resolveKey(ctx, names) {
  const credentials = ctx.get?.('credentials')
  if (credentials === undefined || typeof credentials.resolve !== 'function') return undefined
  for (const name of names) {
    try {
      const hit = await credentials.resolve(name)
      const value = hit?.value
      if (typeof value === 'string' && value.trim() !== '') return { value: value.trim(), name }
    } catch {
      // try next name
    }
  }
  return undefined
}

async function requestJson(url, headers) {
  const response = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(TIMEOUT) })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(`http-${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

async function deepseek(ctx) {
  const account = ctx.get?.('deepseekAccount')
  if (account !== undefined && typeof account.getBalance === 'function') {
    try {
      const data = await account.getBalance({ version: '0.2.0', locale: 'zh-CN', timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60 })
      if (data?.status === 'ready') {
        const wallets = [...(Array.isArray(data.value) ? data.value : Object.values(data.value ?? {})), ...(data.bonusWallets ?? [])]
        const amount = wallets.filter((wallet) => wallet?.currency === undefined || wallet.currency === 'CNY')
          .reduce((sum, wallet) => sum + (Number(wallet?.balance ?? wallet?.amount) || 0), 0)
        return { id: 'deepseek-official', kind: 'api', currency: 'CNY', balance: { amount, status: 'ok', currency: 'CNY', updatedAt: Date.now() } }
      }
    } catch {
      // fall through to key
    }
  }
  const key = await resolveKey(ctx, ['DEEPSEEK_API_KEY'])
  if (key === undefined) return null
  try {
    const body = await requestJson('https://api.deepseek.com/user/balance', { authorization: `Bearer ${key.value}` })
    const amount = (body?.balance_infos ?? []).reduce((sum, item) => sum + (Number(item?.total_balance) || 0), 0)
    return { id: 'deepseek-official', kind: 'api', currency: 'CNY', balance: { amount, status: 'ok', currency: 'CNY', updatedAt: Date.now() } }
  } catch (error) {
    return { id: 'deepseek-official', kind: 'api', currency: 'CNY', balance: { amount: null, status: error.status === 401 ? 'unconfigured' : 'error', currency: 'CNY', updatedAt: Date.now() } }
  }
}

async function glm(ctx, prefs) {
  const key = await resolveKey(ctx, ['ZHIPU_API_KEY', 'GLM_API_KEY', 'ZAI_API_KEY'])
  if (key === undefined) return null
  const mode = prefs?.billingModes?.zhipu
  if (mode === 'api') return { id: 'zhipu', kind: 'api', currency: 'CNY' }
  // 手动覆盖为订阅时，quota 失败/无窗口仍保留订阅卡（显示“套餐查询失败”），不回落 api。
  const subscriptionFallback = mode === 'subscription' ? { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', currency: 'CNY', plans: [] } : null
  try {
    const body = await requestJson(GLM_QUOTA, { authorization: key.value })
    const windows = parseGlmQuota(body)
    if (windows.length > 0) return { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', currency: 'CNY', plans: windows }
    return subscriptionFallback ?? { id: 'zhipu', kind: 'api', currency: 'CNY' }
  } catch {
    return subscriptionFallback ?? { id: 'zhipu', kind: 'api', currency: 'CNY' }
  }
}

/**
 * Kimi Coding 配额查询。
 * 返回 { state }：'no-key'（无 Coding Key 或显式 api 模式）、'ok'（含 entry）、'fallback'（自动模式下配额失败，走按量路径）。
 */
async function kimiCodingQuota(ctx, prefs) {
  const coding = await resolveKey(ctx, ['KIMI_API_KEY', 'KIMI_CODING_API_KEY'])
  if (coding === undefined) return { state: 'no-key' }
  const mode = prefs?.billingModes?.moonshot
  if (mode === 'api') return { state: 'no-key' }
  try {
    const body = await requestJson(KIMI_USAGES, { authorization: `Bearer ${coding.value}` })
    const windows = parseKimiQuota(body)
    if (windows.length > 0) return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', currency: 'CNY', plans: windows } }
  } catch {
    // fall through
  }
  if (mode === 'subscription') return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', currency: 'CNY', plans: [] } }
  return { state: 'fallback' }
}

async function kimi(ctx, prefs) {
  const quota = await kimiCodingQuota(ctx, prefs)
  if (quota.state === 'ok') return quota.entry
  const normal = await resolveKey(ctx, ['MOONSHOT_API_KEY'])
  if (normal === undefined) return quota.state === 'no-key' ? null : { id: 'moonshot', kind: 'api', currency: 'CNY' }
  try {
    const body = await requestJson(KIMI_BALANCE, { authorization: `Bearer ${normal.value}` })
    const amount = Number(body?.data?.available_balance)
    return { id: 'moonshot', kind: 'api', currency: 'CNY', balance: { amount: Number.isFinite(amount) ? amount : null, status: Number.isFinite(amount) ? 'ok' : 'error', currency: 'CNY', updatedAt: Date.now() } }
  } catch {
    return { id: 'moonshot', kind: 'api', currency: 'CNY', balance: { amount: null, status: 'error', currency: 'CNY', updatedAt: Date.now() } }
  }
}

async function openrouter(ctx) {
  const key = await resolveKey(ctx, ['OPENROUTER_API_KEY'])
  if (key === undefined) return null
  try {
    const body = await requestJson(OPENROUTER_CREDITS, { authorization: `Bearer ${key.value}` })
    const balance = parseOpenRouterCredits(body)
    return { id: 'openrouter', kind: 'api', currency: 'USD', balance: balance ?? { amount: null, status: 'error', currency: 'USD', updatedAt: Date.now() } }
  } catch {
    return { id: 'openrouter', kind: 'api', currency: 'USD', balance: { amount: null, status: 'error', currency: 'USD', updatedAt: Date.now() } }
  }
}

/** Qwen 仅按量；国际站 Key（DASHSCOPE_INTL_API_KEY）按 USD，其余 CNY。无 quota 请求。 */
async function qwen(ctx) {
  const key = await resolveKey(ctx, ['DASHSCOPE_INTL_API_KEY', 'DASHSCOPE_API_KEY', 'QWEN_API_KEY'])
  if (key === undefined) return null
  const intl = key.name === 'DASHSCOPE_INTL_API_KEY'
  const currency = intl ? 'USD' : 'CNY'
  return { id: 'qwen', kind: 'api', currency, balance: { amount: null, status: 'unsupported', currency, updatedAt: Date.now() } }
}

function visibleEntry(entry, prefs) {
  return entry !== null && prefs?.billingModes?.[entry.id] !== 'hide'
}

/** Query configured providers; each failure is isolated. Balance/credits are always requested (P2 shows them regardless of the P1-only toggle, #31). */
export async function readProviders(ctx, prefs) {
  const results = await Promise.allSettled([deepseek(ctx), glm(ctx, prefs), kimi(ctx, prefs), openrouter(ctx), qwen(ctx)])
  const out = []
  for (const result of results) {
    if (result.status === 'fulfilled' && visibleEntry(result.value, prefs)) {
      const value = result.value
      value.currency = value.currency ?? providerCurrency(normalizeProvider(value.id))
      out.push(value)
    }
  }
  return out
}

/**
 * P3「重新检测」专用：只重查订阅 provider（GLM / Kimi Coding）的配额，不请求任何余额接口。
 * 返回订阅侦测条目；自动模式下配额失败的 Kimi 返回按量条目，无 Key 的 provider 不返回（由调用方从缓存移除）。
 */
export async function readSubscriptions(ctx, prefs) {
  const [glmEntry, kimiQuota] = await Promise.all([
    glm(ctx, prefs).catch(() => null),
    kimiCodingQuota(ctx, prefs).catch(() => ({ state: 'no-key' })),
  ])
  const kimiEntry = kimiQuota.state === 'ok' ? kimiQuota.entry : kimiQuota.state === 'fallback' ? { id: 'moonshot', kind: 'api', currency: 'CNY' } : null
  const out = []
  if (visibleEntry(glmEntry, prefs)) out.push(glmEntry)
  if (visibleEntry(kimiEntry, prefs)) out.push(kimiEntry)
  return out
}

export { KIMI_USAGES, GLM_QUOTA, KIMI_BALANCE, OPENROUTER_CREDITS }
