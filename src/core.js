/**
 * Pure aggregation: day/month keys, provider/model buckets, budgets, currencies.
 * No file or clock reads; `now` is injected.
 */
import { priceFor } from './pricing.js'
import {
  canBeSubscription,
  modelLabel,
  normalizeModel,
  normalizeProvider,
  providerCurrency,
  providerLabel,
} from './providers.js'

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

/** Kept for compatibility; priceFor handles peak/off-peak internally. */
export function isPeak(ts) {
  const hour = new Date(ts + 8 * 60 * 60 * 1000).getUTCHours()
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

export { normalizeProvider, providerLabel, normalizeModel, priceFor }
export const displayModel = modelLabel

export function priceForRecord(provider, model, ts) {
  return priceFor(provider, model, ts)
}

/** Undefined price returns 0; the caller marks `priced=false`. */
export function costOf(record) {
  const price = priceFor(record.provider ?? 'unknown', record.model, record.ts)
  if (price === null) return 0
  return (
    (num(record.input) * price.input +
      num(record.cacheRead) * price.cacheRead +
      num(record.cacheWrite) * price.cacheWrite +
      num(record.output) * price.output) /
    1e6
  )
}

export function emptyState() {
  return { version: 1, days: {}, watermarks: {}, currentProvider: null }
}

function dayBucket(state, dayKey) {
  state.days[dayKey] ??= { models: {} }
  return state.days[dayKey]
}

/** Only attribute old unknown rows when a model appeared under exactly one provider. */
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
  state.currentProvider = provider
}

function budgetFor(prefs, providerId, currency) {
  const map = prefs?.budgets?.[providerId]
  let amount = num(map?.amount)
  let state = 'unset'
  if (map?.amount === 0) state = 'unset'
  if (amount <= 0 && providerId === 'deepseek-official' && num(prefs?.budget?.amount) > 0) {
    amount = num(prefs.budget.amount)
  }
  if (map?.amount === 0) amount = 0
  return {
    amount,
    used: 0,
    remaining: 0,
    percent: 0,
    state,
    currency: map?.currency === 'USD' ? 'USD' : (currency ?? 'CNY'),
  }
}

function providerEmpty(providerId) {
  return {
    id: providerId,
    name: providerLabel(providerId),
    kind: 'api',
    canSubscribe: canBeSubscription(providerId),
    currency: providerCurrency(providerId),
    usage: { todayTokens: 0, monthTokens: 0, todayCost: 0, monthCost: 0, requests: 0 },
    models: [],
  }
}

function normalizeProviderInfo(input) {
  if (Array.isArray(input)) return input
  if (input === null || typeof input !== 'object') return []
  return Object.entries(input).map(([id, value]) => ({ id, ...(value ?? {}) }))
}

export function buildSummary(state, prefs, now, providerInfoInput) {
  const month = localMonthKey(now)
  const todayKey = localDayKey(now)
  const providerMap = new Map()
  const modelsMap = new Map()
  const providerInfo = normalizeProviderInfo(providerInfoInput)
  // billingModes[id] === 'hide' 的 provider 整体不出现在 VM（卡片、费用表、用量表）。
  const hidden = new Set(
    Object.entries(prefs?.billingModes ?? {})
      .filter(([, mode]) => mode === 'hide')
      .map(([id]) => normalizeProvider(id)),
  )

  for (const info of providerInfo) {
    const id = normalizeProvider(info.id ?? info.provider)
    if (id === 'unknown' || hidden.has(id)) continue
    const base = providerMap.get(id) ?? providerEmpty(id)
    providerMap.set(id, {
      ...base,
      ...info,
      id,
      name: info.name ?? providerLabel(id),
      kind: info.kind === 'subscription' || (info.kind === undefined && Array.isArray(info.plans) && info.plans.length > 0)
        ? 'subscription'
        : 'api',
      canSubscribe: canBeSubscription(id),
      currency: info.currency === 'USD' ? 'USD' : (info.currency === 'CNY' ? 'CNY' : providerCurrency(id)),
      usage: { ...base.usage, ...(info.usage ?? {}) },
      balance: info.balance ?? base.balance,
      plans: info.plans ?? base.plans,
    })
  }

  for (const [dayKey, bucket] of Object.entries(state.days ?? {})) {
    if (!dayKey.startsWith(`${month}-`)) continue
    const providers = bucket.providers ?? { unknown: { models: bucket.models ?? {} } }
    for (const [rawProvider, providerBucket] of Object.entries(providers)) {
      const providerId = normalizeProvider(rawProvider)
      if (providerId === 'unknown' || hidden.has(providerId)) continue
      const provider = providerMap.get(providerId) ?? providerEmpty(providerId)
      providerMap.set(providerId, provider)
      for (const [rawModel, row] of Object.entries(providerBucket.models ?? {})) {
        const modelId = normalizeModel(rawModel)
        const key = `${providerId}:${modelId}`
        const entry = modelsMap.get(key) ?? {
          name: modelId,
          modelId,
          providerId,
          providerName: providerLabel(providerId),
          displayName: modelLabel(modelId),
          kind: provider.kind,
          currency: provider.currency,
          priced: true,
          approximate: false,
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
        const price = priceFor(providerId, modelId, now)
        if (price?.approximate === true) entry.approximate = true
        modelsMap.set(key, entry)
        const tokens = num(row.input) + num(row.cacheRead) + num(row.cacheWrite) + num(row.output)
        provider.usage.monthTokens += tokens
        provider.usage.monthCost += num(row.cost)
        provider.usage.requests += num(row.requests)
        if (dayKey === todayKey) {
          provider.usage.todayTokens += tokens
          provider.usage.todayCost += num(row.cost)
        }
        provider.models.push(entry.modelId)
      }
    }
  }

  const models = [...modelsMap.values()].map((entry) => {
    const tokens = entry.input + entry.cacheRead + entry.cacheWrite + entry.output
    entry.tokens = { input: entry.input, cacheRead: entry.cacheRead, output: entry.output, total: tokens }
    entry.hitRate = entry.input + entry.cacheWrite + entry.cacheRead > 0
      ? entry.cacheRead / (entry.input + entry.cacheWrite + entry.cacheRead)
      : null
    entry.cost = round2(entry.cost)
    entry.share = 0
    return entry
  })
  models.sort((a, b) => b.cost - a.cost)

  const providers = [...providerMap.values()].map((provider) => {
    const budget = provider.kind === 'api' ? budgetFor(prefs, provider.id, provider.currency) : undefined
    if (budget !== undefined) {
      budget.used = round2(provider.usage.monthCost)
      budget.remaining = round2(Math.max(0, budget.amount - budget.used))
      budget.percent = budget.amount > 0 ? Math.min(9.99, budget.used / budget.amount) : 0
      budget.state = budget.amount <= 0 ? 'unset' : budget.percent >= 1 ? 'over' : budget.percent >= 0.8 ? 'warn' : 'ok'
    }
    provider.usage.todayCost = round2(provider.usage.todayCost)
    provider.usage.monthCost = round2(provider.usage.monthCost)
    return { ...provider, budget }
  })
  providers.sort((a, b) => {
    if (a.id === state.currentProvider) return -1
    if (b.id === state.currentProvider) return 1
    return b.usage.todayCost - a.usage.todayCost
  })

  const modelsByCurrency = new Map()
  for (const row of models) {
    if (row.kind !== 'api') continue
    const bucket = modelsByCurrency.get(row.currency) ?? { total: 0 }
    bucket.total += row.cost
    modelsByCurrency.set(row.currency, bucket)
  }
  for (const row of models) {
    if (row.kind !== 'api') continue
    const total = modelsByCurrency.get(row.currency)?.total ?? 0
    row.share = total > 0 ? Math.min(1, row.cost / total) : 0
  }

  const apiTotals = {}
  for (const provider of providers) {
    if (provider.kind !== 'api') continue
    const currency = provider.currency
    const total = apiTotals[currency] ?? { today: 0, month: 0, budget: 0, remaining: 0 }
    total.today += provider.usage.todayCost
    total.month += provider.usage.monthCost
    total.budget += provider.budget?.amount ?? 0
    total.remaining += provider.budget?.remaining ?? 0
    apiTotals[currency] = total
  }
  for (const total of Object.values(apiTotals)) {
    total.today = round2(total.today)
    total.month = round2(total.month)
    total.budget = round2(total.budget)
    total.remaining = round2(total.remaining)
  }

  const totalCost = round2(models.reduce((sum, row) => sum + (row.kind === 'api' ? row.cost : 0), 0))
  const unpricedModels = models.filter((row) => row.priced === false).map((row) => `${row.providerId}:${row.modelId}`)
  const totals = models.reduce((out, row) => ({
    input: out.input + row.input,
    cacheRead: out.cacheRead + row.cacheRead,
    cacheWrite: out.cacheWrite + row.cacheWrite,
    output: out.output + row.output,
    requests: out.requests + row.requests,
  }), { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, requests: 0 })
  const totalTokens = totals.input + totals.cacheRead + totals.cacheWrite + totals.output
  const hitRate = totals.input + totals.cacheWrite + totals.cacheRead > 0
    ? totals.cacheRead / (totals.input + totals.cacheWrite + totals.cacheRead)
    : null
  const today = providers.reduce((sum, provider) => ({
    tokens: sum.tokens + provider.usage.todayTokens,
    cost: sum.cost + provider.usage.todayCost,
    requests: sum.requests + provider.usage.requests,
  }), { tokens: 0, cost: 0, requests: 0 })
  const current = state.currentProvider ?? providers[0]?.id ?? null

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
    providers,
    apiTotals,
    currentProviderId: current,
    breakdown: { models },
    showBalance: prefs?.showBalance !== false,
    showMonthTokens: prefs?.showMonthTokens !== false,
    updatedAt: now,
    stale: false,
  }
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}
