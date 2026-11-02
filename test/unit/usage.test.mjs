import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUsage } from '../../src/core.js'

const now = new Date(2026, 10, 2, 12, 0, 0).getTime()
const providers = [
  { id: 'deepseek-official', name: 'DeepSeek', kind: 'api', currency: 'CNY' },
  { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', currency: 'CNY' },
]
const row = (input, output, cost, requests = 1) => ({
  input, cacheRead: 0, cacheWrite: 0, output, requests, cost, priced: true,
})
const state = {
  days: {
    '2026-11-02': {
      providers: {
        'deepseek-official': { models: { 'deepseek-flash': row(1000, 100, 3) } },
        zhipu: { models: { 'glm-5.3': row(200, 20, 0) } },
      },
    },
    '2026-11-01': {
      providers: {
        'deepseek-official': { models: { 'deepseek-flash': row(2000, 200, 5) } },
      },
    },
    '2026-10-20': {
      providers: {
        'deepseek-official': { models: { 'deepseek-flash': row(4000, 400, 7) } },
      },
    },
  },
}

test('buildUsage: today only and no default rows', () => {
  const usage = buildUsage(state, { billingModes: {} }, 'today', now, providers)
  assert.equal(usage.range, 'today')
  assert.equal(usage.models.length, 2)
  assert.equal(usage.models.find((item) => item.providerId === 'deepseek-official').cost, 3)
  assert.equal(usage.models.find((item) => item.providerId === 'zhipu').cost, 0)
  assert.equal(usage.totals.CNY.cost, 3)
  assert.equal(usage.totals.CNY.requests, 1)
})

test('buildUsage: 7d is local calendar window and excludes old days', () => {
  const usage = buildUsage(state, { billingModes: {} }, '7d', now, providers)
  assert.equal(usage.startKey, '2026-10-27')
  assert.equal(usage.models.length, 2)
  assert.equal(usage.totals.CNY.cost, 8)
  assert.equal(usage.totals.CNY.requests, 2)
})

test('buildUsage: all starts at earliest day', () => {
  const usage = buildUsage(state, { billingModes: {} }, 'all', now, providers)
  assert.equal(usage.startKey, '2026-10-20')
  assert.equal(usage.totals.CNY.cost, 15)
  assert.equal(usage.totals.CNY.requests, 3)
})

test('buildUsage: subscription cost is excluded from totals but row remains', () => {
  const usage = buildUsage(state, { billingModes: {} }, 'today', now, providers)
  const subscription = usage.models.find((item) => item.providerId === 'zhipu')
  assert.equal(subscription.kind, 'subscription')
  assert.equal(usage.totals.CNY.cost, 3)
})

test('buildUsage: hidden providers are excluded but keep a zero bucket', () => {
  const usage = buildUsage(state, { billingModes: { 'deepseek-official': 'hide' } }, 'all', now, providers)
  assert.equal(usage.models.some((item) => item.providerId === 'deepseek-official'), false)
  // 0 桶是两格卡渲染前提：没有它总费用 tile 会空白
  assert.equal(usage.totals.CNY.cost, 0)
  assert.equal(usage.totals.CNY.requests, 0)
})

test('buildUsage: invalid range falls back to today', () => {
  const usage = buildUsage(state, { billingModes: {} }, 'bad', now, providers)
  assert.equal(usage.range, 'today')
})
