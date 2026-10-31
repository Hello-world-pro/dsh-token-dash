/**
 * 纯函数：日键、模型归一、峰谷价、费用与月汇总。
 * 不读文件、不读时钟；`now` 由调用方注入，便于单测。
 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

export function num(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

export function localDayKey(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function localMonthKey(ts) {
  return localDayKey(ts).slice(0, 7)
}

/** 官方峰谷按北京时间：9-12、14-18 为高峰。 */
export function isPeak(ts) {
  const hour = new Date(ts + BEIJING_OFFSET_MS).getUTCHours()
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

const PROVIDER_ALIASES = {
  'deepseek-account': 'deepseek-official',
  'deepseek-official': 'deepseek-official',
  glm: 'zhipu',
  zhipu: 'zhipu',
  'z.ai': 'zhipu',
  kimi: 'moonshot',
  moonshot: 'moonshot',
  qwen: 'qwen',
  dashscope: 'qwen',
  aliyun: 'qwen',
  doubao: 'doubao',
  volcengine: 'doubao',
  ark: 'doubao',
  openai: 'openai',
  openrouter: 'openrouter',
  anthropic: 'anthropic',
  google: 'google',
}

const PROVIDER_NAMES = {
  'deepseek-official': 'DeepSeek 官方',
  deepseek: 'DeepSeek',
  zhipu: '智谱 AI',
  moonshot: 'Kimi',
  qwen: '通义',
  doubao: '豆包',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  google: 'Google',
  unknown: '未知来源',
}

const OFFICIAL_PROVIDERS = new Set(['deepseek-official'])

export function normalizeProvider(raw) {
  const id = String(raw ?? '').trim().toLowerCase()
  if (id === '') return 'unknown'
  return PROVIDER_ALIASES[id] ?? id
}

export function providerLabel(raw) {
  const id = normalizeProvider(raw)
  return PROVIDER_NAMES[id] ?? id
}

/** 宿主展示名；raw model 仍用于计价。 */
const MODEL_LABELS = {
  'deepseek-flash': 'DeepSeek-V4.1-Flash',
  'deepseek-v4.1-flash': 'DeepSeek-V4.1-Flash',
  'deepseek-v4.1-flash-ioa': 'DeepSeek-V4.1-Flash',
  'deepseek-pro': 'DeepSeek-V4.1-Pro',
  'deepseek-v4-pro': 'DeepSeek-V4.1-Pro',
  'glm-5.3': 'GLM-5.3',
  'glm-5.3-flash': 'GLM-5.3-Flash',
  'kimi-k3': 'Kimi K3',
  'kimi-k2.7': 'Kimi K2.7',
}

export function displayModel(raw) {
  const id = normalizeModel(raw)
  return MODEL_LABELS[id] ?? id
}

/** 只归一同名变体，不跨代际合并。 */
export function normalizeModel(raw) {
  let name = String(raw ?? '').trim().toLowerCase()
  if (name === '') return 'unknown'
  name = name.replace(/^[^/]+\//, '')
  name = name.replace(/@/g, '-')
  name = name.replace(/-free\b/g, '')
  name = name.replace(/-\d{4}-\d{2}-\d{2}\b/g, '')
  name = name.replace(/-\d{8}\b/g, '')
  name = name.replace(/\s+/g, '-')
  return name === '' ? 'unknown' : name
}

const DEEPSEEK_PRICES = {
  flash: {
    peak: { input: 3, cacheRead: 0.1, output: 9 },
    off: { input: 1.5, cacheRead: 0.05, output: 4.5 },
  },
  pro: {
    peak: { input: 9, cacheRead: 0.3, output: 27 },
    off: { input: 4.5, cacheRead: 0.15, output: 13.5 },
  },
}

/** 第三方目录价（CNY / 1M tokens）；未收录返回 null，不套 DeepSeek 价。 */
const THIRD_PARTY_PRICES = {
  'zhipu:glm-5.3': { input: 8, cacheRead: 2, output: 28 },
  'zhipu:glm-5.3-flash': { input: 0.8, cacheRead: 0.23, output: 2.8 },
  'moonshot:kimi-k3': { input: 20, cacheRead: 2, output: 100 },
  'moonshot:kimi-k2.7': { input: 6.5, cacheRead: 1.3, output: 27 },
}

export function priceFor(provider, model, ts) {
  const providerId = normalizeProvider(provider)
  const modelId = normalizeModel(model)
  if (OFFICIAL_PROVIDERS.has(providerId)) {
    const tier = modelId.includes('pro') ? 'pro' : 'flash'
    return DEEPSEEK_PRICES[tier][isPeak(ts) ? 'peak' : 'off']
  }
  return THIRD_PARTY_PRICES[`${providerId}:${modelId}`] ?? null
}

/** 每条记录：未命中输入 + 命中输入 + 输出；无目录价返回 0。 */
export function costOf(record) {
  const provider = record.provider ?? (String(record.model ?? '').includes('deepseek') ? 'deepseek-official' : 'unknown')
  const price = priceFor(provider, record.model, record.ts)
  if (price === null) return 0
  return (
    (num(record.input) * price.input +
      num(record.cacheRead) * price.cacheRead +
      num(record.output) * price.output) /
    1e6
  )
}

export function emptyState() {
  return { version: 1, days: {}, watermarks: {} }
}

function dayBucket(state, dayKey) {
  state.days[dayKey] ??= { models: {} }
  return state.days[dayKey]
}

/** 仅当某模型在历史事件里只出现过唯一 provider 时，把旧 unknown 行归因过去。 */
export function reattributeUnknown(state, providerByModel) {
  for (const bucket of Object.values(state.days ?? {})) {
    const unknown = bucket?.providers?.unknown?.models
    if (unknown === undefined) continue
    for (const [model, row] of Object.entries(unknown)) {
      const providers = providerByModel.get(model)
      if (providers === undefined || providers.size !== 1) continue
      const provider = normalizeProvider([...providers][0])
      if (provider === 'unknown') continue
      const targetBucket = (bucket.providers[provider] ??= { models: {} })
      const target = targetBucket.models[model]
      if (target === undefined) {
        targetBucket.models[model] = row
      } else {
        target.input += num(row.input)
        target.cacheRead += num(row.cacheRead)
        target.cacheWrite += num(row.cacheWrite)
        target.output += num(row.output)
        target.requests += num(row.requests)
        target.cost += num(row.cost)
        target.priced = target.priced !== false && row.priced !== false
      }
      delete unknown[model]
    }
    if (Object.keys(unknown).length === 0) delete bucket.providers.unknown
  }
}

export function addRecord(state, record) {
  const day = localDayKey(record.ts)
  const bucket = dayBucket(state, day)
  if (bucket.providers === undefined) {
    bucket.providers = { unknown: { models: bucket.models ?? {} } }
    delete bucket.models
  }
  const provider = normalizeProvider(record.provider)
  const providerBucket = (bucket.providers[provider] ??= { models: {} })
  const model = normalizeModel(record.model)
  const row = (providerBucket.models[model] ??= {
    input: 0,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
    requests: 0,
    cost: 0,
    priced: true,
  })
  row.input += num(record.input)
  row.cacheRead += num(record.cacheRead)
  row.cacheWrite += num(record.cacheWrite)
  row.output += num(record.output)
  row.requests += 1
  const price = priceFor(provider, model, record.ts)
  if (price === null) row.priced = false
  row.cost += costOf({ ...record, provider })
}

function sumRows(rows) {
  const out = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, requests: 0 }
  for (const row of rows) {
    out.input += num(row.input)
    out.cacheRead += num(row.cacheRead)
    out.cacheWrite += num(row.cacheWrite)
    out.output += num(row.output)
    out.requests += num(row.requests)
  }
  return out
}

export function buildSummary(state, prefs, now, balance) {
  const month = localMonthKey(now)
  const todayKey = localDayKey(now)
  const models = new Map()
  let today = { tokens: 0, cost: 0, requests: 0 }

  for (const [dayKey, bucket] of Object.entries(state.days ?? {})) {
    if (!dayKey.startsWith(`${month}-`)) continue
    const providers = bucket.providers ?? { unknown: { models: bucket.models ?? {} } }
    for (const [providerId, providerBucket] of Object.entries(providers)) {
      for (const [model, row] of Object.entries(providerBucket.models ?? {})) {
        const key = `${providerId}:${model}`
        const entry = models.get(key) ?? {
          name: model,
          modelId: model,
          providerId,
          providerName: providerLabel(providerId),
          displayName: displayModel(model),
          priced: true,
          requests: 0,
          input: 0,
          cacheRead: 0,
          cacheWrite: 0,
          output: 0,
          cost: 0,
        }
        entry.requests += num(row.requests)
        entry.input += num(row.input)
        entry.cacheRead += num(row.cacheRead)
        entry.cacheWrite += num(row.cacheWrite)
        entry.output += num(row.output)
        entry.cost += num(row.cost)
        if (row.priced === false) entry.priced = false
        models.set(key, entry)
        if (dayKey === todayKey) {
          today.tokens += num(row.input) + num(row.cacheRead) + num(row.cacheWrite) + num(row.output)
          today.requests += num(row.requests)
          today.cost += num(row.cost)
        }
      }
    }
  }

  let totalCost = 0
  const rows = [...models.values()].map((entry) => {
    const tokens = entry.input + entry.cacheRead + entry.cacheWrite + entry.output
    const cost = num(entry.cost)
    entry.tokens = { input: entry.input, cacheRead: entry.cacheRead, output: entry.output, total: tokens }
    entry.hitRate =
      entry.input + entry.cacheWrite + entry.cacheRead > 0
        ? entry.cacheRead / (entry.input + entry.cacheWrite + entry.cacheRead)
        : null
    entry.cost = round2(cost)
    entry.rawCost = cost
    entry.share = 0
    totalCost += cost
    return entry
  })
  rows.sort((a, b) => b.cost - a.cost)
  for (const row of rows) {
    row.share = totalCost > 0 ? Math.min(1, row.rawCost / totalCost) : 0
    delete row.rawCost
  }
  totalCost = round2(totalCost)

  const totals = sumRows([...models.values()])
  const unpricedModels = rows.filter((row) => row.priced === false).map((row) => `${row.providerId}:${row.modelId}`)
  const totalTokens = totals.input + totals.cacheRead + totals.cacheWrite + totals.output
  const hitRate =
    totals.input + totals.cacheWrite + totals.cacheRead > 0
      ? totals.cacheRead / (totals.input + totals.cacheWrite + totals.cacheRead)
      : null

  const amount = num(prefs?.budget?.amount)
  const percent = amount > 0 ? totalCost / amount : 0
  const budgetState = amount <= 0 ? 'unset' : percent >= 1 ? 'over' : percent >= 0.8 ? 'warn' : 'ok'

  return {
    month,
    tokens: {
      input: totals.input,
      cacheRead: totals.cacheRead,
      cacheWrite: totals.cacheWrite,
      output: totals.output,
      total: totalTokens,
      hitRate,
    },
    cost: { estimated: totalCost, currency: 'CNY', unpricedModels },
    today: { tokens: today.tokens, cost: round2(today.cost), requests: today.requests },
    requests: { month: totals.requests, today: today.requests },
    budget: {
      amount,
      used: totalCost,
      remaining: round2(amount - totalCost),
      percent: Math.min(percent, 9.99),
      state: budgetState,
    },
    breakdown: { models: rows },
    balance,
    showBalance: prefs?.showBalance !== false,
    showMonthTokens: prefs?.showMonthTokens !== false,
    updatedAt: now,
    stale: false,
  }
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}
