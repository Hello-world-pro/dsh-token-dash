import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addRecord,
  buildSummary,
  costOf,
  emptyState,
  localDayKey,
  normalizeModel,
  priceFor,
} from '../../src/core.js'

test('normalizeModel 去掉渠道前缀与后缀', () => {
  assert.equal(normalizeModel('deepseek/deepseek-v4.1-flash-free'), 'deepseek-v4.1-flash')
  assert.equal(normalizeModel('glm-5.3-ioa@2026-10-01'), 'glm-5.3-ioa')
})

test('峰谷价：Flash 高峰 1M 未命中 + 1M 输出 = 12', () => {
  const ts = Date.UTC(2026, 9, 30, 2, 0, 0) // 北京时间 10:00
  const price = priceFor('deepseek-v4-flash', ts)
  assert.equal(price.input, 3)
  assert.equal(price.output, 9)
  const cost = costOf({ ts, model: 'deepseek-v4-flash', input: 1_000_000, cacheRead: 0, cacheWrite: 0, output: 1_000_000 })
  assert.ok(Math.abs(cost - 12) < 1e-9)
})

test('闲时 Flash 1M + 1M = 6', () => {
  const ts = Date.UTC(2026, 9, 30, 13, 0, 0) // 北京时间 21:00
  const cost = costOf({ ts, model: 'deepseek-v4-flash', input: 1_000_000, cacheRead: 0, cacheWrite: 0, output: 1_000_000 })
  assert.ok(Math.abs(cost - 6) < 1e-9)
})

test('费用占比不超过 100%', () => {
  const state = emptyState()
  const now = Date.UTC(2026, 9, 30, 2, 0, 0) // 北京时间 10:00，高峰
  addRecord(state, { ts: now, model: 'deepseek-v4-flash', input: 10_000, cacheRead: 0, cacheWrite: 0, output: 1_000 })
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

test('月汇总：预算、剩余、按模型请求数', () => {
  const state = emptyState()
  const now = new Date(2026, 9, 31, 12, 0, 0).getTime()
  addRecord(state, { ts: now, model: 'glm-5.3-ioa', input: 300_000, cacheRead: 600_000, cacheWrite: 0, output: 44_000 })
  addRecord(state, { ts: now, model: 'deepseek-v4.1-flash', input: 108_000, cacheRead: 200_000, cacheWrite: 0, output: 16_000 })
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
  assert.equal(summary.budget.amount, 3500)
  assert.ok(summary.budget.used > 0)
  assert.ok(summary.budget.remaining < 3500)
  assert.equal(summary.tokens.total, 1_268_000)
  assert.equal(localDayKey(now), '2026-10-31')
})
