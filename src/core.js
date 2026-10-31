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

const PRICES = {
  flash: {
    peak: { input: 3, cacheRead: 0.1, output: 9 },
    off: { input: 1.5, cacheRead: 0.05, output: 4.5 },
  },
  pro: {
    peak: { input: 9, cacheRead: 0.3, output: 27 },
    off: { input: 4.5, cacheRead: 0.15, output: 13.5 },
  },
}

export function priceFor(model, ts) {
  const tier = model.includes('pro') ? 'pro' : 'flash'
  return PRICES[tier][isPeak(ts) ? 'peak' : 'off']
}

/** 每条记录：未命中输入 + 命中输入 + 输出；缓存写入按 0。 */
export function costOf(record) {
  const p = priceFor(normalizeModel(record.model), record.ts)
  return (
    (num(record.input) * p.input +
      num(record.cacheRead) * p.cacheRead +
      num(record.output) * p.output) /
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

export function addRecord(state, record) {
  const day = localDayKey(record.ts)
  const bucket = dayBucket(state, day)
  const model = normalizeModel(record.model)
  bucket.models[model] ??= { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, requests: 0, cost: 0 }
  const row = bucket.models[model]
  row.input += num(record.input)
  row.cacheRead += num(record.cacheRead)
  row.cacheWrite += num(record.cacheWrite)
  row.output += num(record.output)
  row.requests += 1
  row.cost += costOf(record)
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
    for (const [model, row] of Object.entries(bucket.models ?? {})) {
      const entry = models.get(model) ?? {
        name: model,
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
      models.set(model, entry)
      if (dayKey === todayKey) {
        today.tokens += num(row.input) + num(row.cacheRead) + num(row.cacheWrite) + num(row.output)
        today.requests += num(row.requests)
        today.cost += num(row.cost)
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
    cost: { estimated: totalCost, currency: 'CNY', unpricedModels: [] },
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
    updatedAt: now,
    stale: false,
  }
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}
