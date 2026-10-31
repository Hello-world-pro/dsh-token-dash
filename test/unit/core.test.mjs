import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addRecord,
  buildSummary,
  costOf,
  displayModel,
  emptyState,
  localDayKey,
  normalizeModel,
  normalizeProvider,
  priceFor,
  providerLabel,
  reattributeUnknown,
} from '../../src/core.js'

test('normalizeModel 去掉渠道前缀与后缀', () => {
  assert.equal(normalizeModel('deepseek/deepseek-v4.1-flash-free'), 'deepseek-v4.1-flash')
  assert.equal(normalizeModel('glm-5.3-ioa@2026-10-01'), 'glm-5.3-ioa')
})

test('峰谷价：Flash 高峰 1M 未命中 + 1M 输出 = 12', () => {
  const ts = Date.UTC(2026, 9, 30, 2, 0, 0) // 北京时间 10:00
  const price = priceFor('deepseek-account', 'deepseek-v4-flash', ts)
  assert.equal(price.input, 3)
  assert.equal(price.output, 9)
  const cost = costOf({ ts, provider: 'deepseek-account', model: 'deepseek-v4-flash', input: 1_000_000, cacheRead: 0, cacheWrite: 0, output: 1_000_000 })
  assert.ok(Math.abs(cost - 12) < 1e-9)
})

test('闲时 Flash 1M + 1M = 6', () => {
  const ts = Date.UTC(2026, 9, 30, 13, 0, 0) // 北京时间 21:00
  const cost = costOf({ ts, provider: 'deepseek-account', model: 'deepseek-v4-flash', input: 1_000_000, cacheRead: 0, cacheWrite: 0, output: 1_000_000 })
  assert.ok(Math.abs(cost - 6) < 1e-9)
})

test('第三方按自己的目录价，未知 provider 不套 DeepSeek 价', () => {
  const ts = Date.UTC(2026, 9, 30, 2, 0, 0)
  assert.equal(priceFor('zhipu', 'glm-5.3', ts).input, 8)
  assert.equal(priceFor('openrouter', 'deepseek-flash', ts), null)
  assert.equal(costOf({ ts, provider: 'openrouter', model: 'deepseek-flash', input: 1_000_000, output: 0 }), 0)
})

test('费用占比不超过 100%', () => {
  const state = emptyState()
  const now = Date.UTC(2026, 9, 30, 2, 0, 0) // 北京时间 10:00，高峰
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-v4-flash', input: 10_000, cacheRead: 0, cacheWrite: 0, output: 1_000 })
  const summary = buildSummary(state, { budget: { amount: 0 }, showBalance: false }, now, {
    provider: 'unknown',
    amount: null,
    currency: 'CNY',
    status: 'unsupported',
    updatedAt: now,
  })
  const row = summary.breakdown.models[0]
  assert.equal(row.cost, 0.04)
  assert.ok(row.share <= 1, `share=${row.share}`)
})

test('模型展示名映射到宿主标签', () => {
  const state = emptyState()
  const now = new Date(2026, 9, 31, 12, 0, 0).getTime()
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-flash', input: 10_000, cacheRead: 0, cacheWrite: 0, output: 1_000 })
  const summary = buildSummary(state, { budget: { amount: 0 }, showBalance: true }, now, {
    provider: 'unknown',
    amount: null,
    currency: 'CNY',
    status: 'unsupported',
    updatedAt: now,
  })
  assert.equal(summary.breakdown.models[0].name, 'deepseek-flash')
  assert.equal(summary.breakdown.models[0].displayName, 'DeepSeek-V4.1-Flash')
  assert.equal(summary.breakdown.models[0].providerId, 'deepseek-official')
  assert.equal(summary.breakdown.models[0].providerName, 'DeepSeek 官方')
  assert.equal(summary.showBalance, true)
  assert.equal(summary.showMonthTokens, true)
})

test('同模型不同 provider 分行，未定价不套官方价', () => {
  const state = emptyState()
  const now = Date.UTC(2026, 9, 30, 2, 0, 0)
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-flash', input: 10_000, output: 1_000 })
  addRecord(state, { ts: now, provider: 'openrouter', model: 'deepseek-flash', input: 10_000, output: 1_000 })
  const summary = buildSummary(state, { budget: { amount: 0 }, showBalance: false }, now, {
    provider: 'unknown',
    amount: null,
    currency: 'CNY',
    status: 'unsupported',
    updatedAt: now,
  })
  assert.equal(summary.breakdown.models.length, 2)
  const official = summary.breakdown.models.find((row) => row.providerId === 'deepseek-official')
  const relay = summary.breakdown.models.find((row) => row.providerId === 'openrouter')
  assert.equal(official.priced, true)
  assert.equal(relay.priced, false)
  assert.equal(relay.cost, 0)
  assert.deepEqual(summary.cost.unpricedModels, ['openrouter:deepseek-flash'])
})

test('旧 unknown 行在 provider 唯一时归因', () => {
  const state = emptyState()
  const now = Date.UTC(2026, 9, 30, 2, 0, 0)
  addRecord(state, { ts: now, provider: 'unknown', model: 'deepseek-flash', input: 10_000, output: 1_000 })
  const row = state.days['2026-10-30'].providers.unknown.models['deepseek-flash']
  row.cost = 0.04
  row.priced = true
  reattributeUnknown(
    state,
    new Map([['deepseek-flash', new Set(['deepseek-account'])]]),
  )
  assert.equal(state.days['2026-10-30'].providers.unknown, undefined)
  assert.equal(state.days['2026-10-30'].providers['deepseek-official'].models['deepseek-flash'].cost, 0.04)
})

test('provider 归一化与展示名', () => {
  assert.equal(normalizeProvider('deepseek-account'), 'deepseek-official')
  assert.equal(normalizeProvider('glm'), 'zhipu')
  assert.equal(providerLabel('zhipu'), '智谱 AI')
  assert.equal(displayModel('glm-5.3'), 'GLM-5.3')
})

test('月汇总：预算、剩余、按模型请求数', () => {
  const state = emptyState()
  const now = new Date(2026, 9, 31, 12, 0, 0).getTime()
  addRecord(state, { ts: now, provider: 'zhipu', model: 'glm-5.3', input: 300_000, cacheRead: 600_000, cacheWrite: 0, output: 44_000 })
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-v4.1-flash', input: 108_000, cacheRead: 200_000, cacheWrite: 0, output: 16_000 })
  const summary = buildSummary(state, { budget: { amount: 3500 }, showBalance: true }, now, {
    provider: 'unknown',
    amount: null,
    currency: 'CNY',
    status: 'unsupported',
    updatedAt: now,
  })
  assert.equal(summary.month, '2026-10')
  assert.equal(summary.requests.month, 2)
  assert.equal(summary.breakdown.models.length, 2)
  assert.equal(summary.breakdown.models[0].requests, 1)
  // REQ-08：无单 budget/balance 字段；legacy prefs.budget 迁移到 deepseek-official 的 provider 级预算
  assert.equal(summary.budget, undefined)
  assert.equal(summary.balance, undefined)
  const deepseek = summary.providers.find((item) => item.id === 'deepseek-official')
  assert.equal(deepseek.budget.amount, 3500)
  assert.ok(deepseek.budget.used > 0)
  assert.ok(deepseek.budget.remaining < 3500)
  const zhipu = summary.providers.find((item) => item.id === 'zhipu')
  // usage-only 的 zhipu（无订阅 info）按量处理：预算 unset 而非 undefined
  assert.equal(zhipu.budget.state, 'unset')
  assert.equal(zhipu.canSubscribe, true)
  assert.equal(deepseek.canSubscribe, false)
  assert.equal(summary.tokens.total, 1_268_000)
  assert.equal(localDayKey(now), '2026-10-31')
})

test('hide 模式：provider 与模型行整体不出现在 VM', () => {
  const state = emptyState()
  const now = new Date(2026, 9, 31, 12, 0, 0).getTime()
  addRecord(state, { ts: now, provider: 'zhipu', model: 'glm-5.3', input: 300_000, cacheRead: 0, cacheWrite: 0, output: 44_000 })
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-v4.1-flash', input: 108_000, cacheRead: 0, cacheWrite: 0, output: 16_000 })
  const providers = [
    { id: 'zhipu', kind: 'subscription', currency: 'CNY', plans: [{ key: '5h', usedPercent: 10 }] },
    { id: 'deepseek-official', kind: 'api', currency: 'CNY' },
  ]
  const summary = buildSummary(state, { billingModes: { zhipu: 'hide' } }, now, providers)
  assert.equal(summary.providers.some((item) => item.id === 'zhipu'), false)
  assert.equal(summary.breakdown.models.some((item) => item.providerId === 'zhipu'), false)
  assert.equal(summary.providers.length, 1)
})

test('provider 排序：当前 provider 置顶，其余按今日消耗降序', () => {
  const state = emptyState()
  const now = new Date(2026, 9, 31, 12, 0, 0).getTime()
  addRecord(state, { ts: now, provider: 'zhipu', model: 'glm-5.3', input: 900_000, cacheRead: 0, cacheWrite: 0, output: 44_000 })
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-v4.1-flash', input: 100_000, cacheRead: 0, cacheWrite: 0, output: 16_000 })
  const summary = buildSummary(state, { budgets: {} }, now, [
    { id: 'zhipu', kind: 'subscription', currency: 'CNY', plans: [] },
    { id: 'deepseek-official', kind: 'api', currency: 'CNY' },
  ])
  // 最后一条消息 provider 是 deepseek-account（当前 provider），置顶；zhipu 今日消耗更高排第二
  assert.equal(summary.providers[0].id, 'deepseek-official')
  assert.equal(summary.providers[1].id, 'zhipu')
})

test('#41 unknown 行按模型名前缀归因，且跨月累计进用量/费用明细', () => {
  const state = emptyState()
  // 上月（10 月）unknown 数据：老版本插件无 provider 标注
  const lastMonth = new Date(2026, 8, 30, 12, 0, 0).getTime()
  addRecord(state, { ts: lastMonth, provider: 'unknown', model: 'deepseek-flash', input: 500_000, cacheRead: 0, cacheWrite: 0, output: 10_000 })
  // 本月（11 月 1 日）正常记录
  const now = new Date(2026, 10, 1, 12, 0, 0).getTime()
  addRecord(state, { ts: now, provider: 'deepseek-account', model: 'deepseek-flash', input: 100_000, cacheRead: 0, cacheWrite: 0, output: 1_000 })
  const summary = buildSummary(state, { budgets: {} }, now, [])
  const rows = summary.breakdown.models.filter((item) => item.modelId === 'deepseek-flash')
  // 归因：unknown + deepseek-* → deepseek-official；跨月累计为一条
  assert.equal(rows.length, 1)
  assert.equal(rows[0].providerId, 'deepseek-official')
  assert.ok(rows[0].requests >= 2, `requests=${rows[0].requests}`)
  // provider.usage 保持当月口径（10 月消耗不计入 11 月的 today/month）
  const deepseek = summary.providers.find((item) => item.id === 'deepseek-official')
  assert.equal(deepseek.usage.todayTokens, 101_000)
  // 无前缀的 unknown 模型保持不可见
  addRecord(state, { ts: now, provider: 'unknown', model: 'mystery-model', input: 1000, cacheRead: 0, cacheWrite: 0, output: 1 })
  const summary2 = buildSummary(state, { budgets: {} }, now, [])
  assert.equal(summary2.breakdown.models.some((item) => item.modelId === 'mystery-model'), false)
})
