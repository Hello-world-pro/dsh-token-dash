import test from 'node:test'
import assert from 'node:assert/strict'
import { priceFor, resetPricingForTests, setCatalogForTests } from '../../src/pricing.js'

test('exact, alias and currency', () => {
  resetPricingForTests()
  const exact = priceFor('zhipu', 'glm-5.3', Date.now())
  assert.equal(exact.input, 8)
  assert.equal(exact.currency, 'CNY')
  assert.equal(exact.approximate, false)
  const alias = priceFor('deepseek-account', 'deepseek-v4.1-flash', Date.UTC(2026, 9, 30, 2))
  assert.equal(alias.input, 3)
  assert.equal(alias.currency, 'CNY')
})

test('family fallback is approximate and never crosses provider', () => {
  setCatalogForTests([
    { provider: 'zhipu', model: 'glm-5.3', family: 'glm-5', releasedAt: '2026-09-01', input: 8, output: 28, currency: 'CNY' },
    { provider: 'zhipu', model: 'glm-5.2', family: 'glm-5', releasedAt: '2026-08-01', input: 6, output: 24, currency: 'CNY' },
  ])
  const fallback = priceFor('zhipu', 'glm-5.4', Date.now())
  assert.equal(fallback.input, 8)
  assert.equal(fallback.approximate, true)
  assert.equal(priceFor('openrouter', 'glm-5.3', Date.now()), null)
  assert.equal(priceFor('zhipu', 'glm-6', Date.now()), null)
})

test('DeepSeek peak/off-peak tiers', () => {
  resetPricingForTests()
  const peak = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 30, 2))
  const off = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 30, 13))
  assert.equal(peak.input, 3)
  assert.equal(off.input, 1.5)
})
