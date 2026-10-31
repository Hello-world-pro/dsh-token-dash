import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGlmQuota, parseKimiQuota, parseOpenRouterCredits } from '../../src/adapters.js'

test('GLM parses TOKENS_LIMIT unit 3/6 and ignores TIME_LIMIT', () => {
  const windows = parseGlmQuota({
    success: true,
    data: {
      limits: [
        { type: 'TOKENS_LIMIT', unit: 3, percentage: 42.5, nextResetTime: 100 },
        { type: 'TOKENS_LIMIT', unit: 6, percentage: 18.2, nextResetTime: 200 },
        { type: 'TIME_LIMIT', percentage: 99 },
      ],
    },
  })
  assert.deepEqual(windows.map((item) => [item.key, item.usedPercent]), [['5h', 42.5], ['week', 18.2]])
})

test('GLM empty/malformed returns no windows', () => {
  assert.deepEqual(parseGlmQuota({ data: { limits: [] } }), [])
  assert.deepEqual(parseGlmQuota({ data: { limits: [{ type: 'TOKENS_LIMIT', unit: 3 }] } }), [])
})

test('Kimi current usages and legacy limits', () => {
  const current = parseKimiQuota({ data: { usages: { limit_5h: { used_ratio: 30, reset_time: 1 }, limit_month_code: { used_ratio: 12, reset_time: 2 } }, usage: { used_ratio: 18, reset_time: 3 } } })
  assert.deepEqual(current.map((item) => [item.key, item.usedPercent]), [['5h', 30], ['month', 12], ['week', 18]])
  const legacy = parseKimiQuota({ limits: [{ detail: { limit: 100, remaining: 70, resetTime: 10 } }, { detail: { limit: 100, remaining: 60, resetTime: 20 } }], usage: { limit: 100, used: 18, resetTime: 30 } })
  assert.equal(legacy.find((item) => item.key === '5h').usedPercent, 40)
  assert.equal(legacy.find((item) => item.key === 'week').usedPercent, 18)
})

test('OpenRouter credits', () => {
  const parsed = parseOpenRouterCredits({ data: { total_credits: 50, total_usage: 12.5 } })
  assert.equal(parsed.amount, 37.5)
  assert.equal(parsed.currency, 'USD')
  assert.equal(parsed.status, 'ok')
  assert.equal(parseOpenRouterCredits({ data: { total_credits: 50 } }), null)
})
