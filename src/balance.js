/**
 * 余额适配：DeepSeek 账号 / Key、Kimi、GLM 配额或现金。
 * 只访问官方接口；凭据经宿主 ctx.credentials 解析，不落盘。
 */

const TIMEOUT = 5000
const CLIENT = { version: '0.1.0', locale: 'zh-CN' }

function result(provider, status, amount = null) {
  return { provider, amount, currency: 'CNY', status, updatedAt: Date.now() }
}

async function resolveKey(ctx, name) {
  const credentials = ctx.get?.('credentials')
  if (credentials === undefined || typeof credentials.resolve !== 'function') return undefined
  try {
    const hit = await credentials.resolve(name)
    const value = hit?.value
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
  } catch {
    return undefined
  }
}

async function getJson(url, key) {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) throw new Error(`http-${res.status}`)
  return res.json()
}

async function deepseekAccount(ctx, prefs) {
  const account = ctx.get?.('deepseekAccount')
  if (account === undefined || typeof account.getBalance !== 'function') return undefined
  try {
    const data = await account.getBalance({
      ...CLIENT,
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    })
    if (data === null || data === undefined) return result('deepseek', 'unconfigured')
    if (data.status !== 'ready') return result('deepseek', 'error')
    const normal = Array.isArray(data.value) ? data.value : Object.values(data.value ?? {})
    const bonus = Array.isArray(data.bonusWallets) ? data.bonusWallets : []
    let amount = 0
    for (const wallet of [...normal, ...bonus]) {
      if (wallet?.currency !== undefined && wallet.currency !== 'CNY') continue
      const value = Number(wallet?.balance ?? wallet?.amount ?? 0)
      if (Number.isFinite(value)) amount += value
    }
    return result('deepseek', 'ok', amount)
  } catch {
    return undefined
  }
}

async function deepseekKey(ctx) {
  const key = await resolveKey(ctx, 'DEEPSEEK_API_KEY')
  if (key === undefined) return undefined
  try {
    const data = await getJson('https://api.deepseek.com/user/balance', key)
    const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : []
    let amount = 0
    for (const info of infos) {
      const value = Number(info?.total_balance ?? 0)
      if (Number.isFinite(value)) amount += value
    }
    return result('deepseek', 'ok', amount)
  } catch {
    return result('deepseek', 'error')
  }
}

async function kimi(ctx) {
  const key = await resolveKey(ctx, 'MOONSHOT_API_KEY')
  if (key === undefined) return undefined
  try {
    const data = await getJson('https://api.moonshot.cn/v1/users/me/balance', key)
    const amount = Number(data?.data?.available_balance)
    return result('kimi', Number.isFinite(amount) ? 'ok' : 'error', Number.isFinite(amount) ? amount : null)
  } catch {
    return result('kimi', 'error')
  }
}

async function glm(ctx) {
  const key = await resolveKey(ctx, 'ZHIPU_API_KEY')
  if (key === undefined) return undefined
  try {
    const res = await fetch('https://open.bigmodel.cn/api/monitor/usage/quota/limit', {
      headers: { authorization: key, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) throw new Error(`http-${res.status}`)
    return result('glm', 'ok', null)
  } catch {
    return result('glm', 'error')
  }
}

export async function readBalance(ctx, prefs) {
  if (prefs.showBalance === false) return result('unknown', 'hidden')
  return (
    (await deepseekAccount(ctx, prefs)) ??
    (await deepseekKey(ctx)) ??
    (await kimi(ctx)) ??
    (await glm(ctx)) ??
    result('unknown', 'unsupported')
  )
}
