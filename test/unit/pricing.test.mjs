import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCommunityPricing, priceFor, resetPricingForTests, setCatalogForTests } from '../../src/pricing.js'

test('exact, alias and currency', () => {
  resetPricingForTests()
  const exact = priceFor('zhipu', 'glm-5.3', Date.now())
  assert.equal(exact.input, 8)
  assert.equal(exact.currency, 'CNY')
  assert.equal(exact.approximate, false)
  const alias = priceFor('deepseek-account', 'deepseek-v4.1-flash', Date.UTC(2026, 9, 30, 2))
  assert.equal(alias.input, 2)
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
  assert.equal(peak.input, 2)
  assert.equal(peak.output, 8)
  assert.equal(off.input, 1)
  assert.equal(off.output, 4)
  // 周末全天闲时
  const weekend = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 31, 2))
  assert.equal(weekend.input, 1)
})

test('社区日间峰谷窗口映射为 peak/offPeak', async () => {
  resetPricingForTests()
  const realFetch = globalThis.fetch
  const payload = {
    updatedAt: '1793236514',
    models: [{
      modelId: 'deepseek-v4.1-flash',
      inputCostPerMillion: 1,
      outputCostPerMillion: 4,
      cacheReadCostPerMillion: 0.02,
      aliases: ['deepseek-flash'],
      family: 'deepseek',
      dailySlots: [{
        windows: [{ startMinute: 540, endMinute: 720 }, { startMinute: 840, endMinute: 1080 }],
        daysOfWeek: [1, 2, 3, 4, 5],
        inputCostPerMillion: 2,
        outputCostPerMillion: 8,
        cacheReadCostPerMillion: 0.04,
      }],
    }],
  }
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => payload })
  try {
    await loadCommunityPricing({ force: true })
    const peak = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 30, 2))
    assert.equal(peak.input, 2)
    assert.equal(peak.output, 8)
    const off = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 30, 13))
    assert.equal(off.input, 1)
    const weekend = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 9, 31, 2))
    assert.equal(weekend.input, 1)
  } finally {
    globalThis.fetch = realFetch
    resetPricingForTests()
  }
})

test('社区价格表二次归一化后仍保留平坦价目', async () => {
  resetPricingForTests()
  const realFetch = globalThis.fetch
  const payload = {
    updatedAt: '1793236514',
    models: [
      { modelId: 'deepseek-v4.1-flash', inputCostPerMillion: 1, outputCostPerMillion: 4, cacheReadCostPerMillion: 0.02, aliases: ['deepseek-flash'], family: 'deepseek' },
      { modelId: 'qwen3.8-max', inputCostPerMillion: 12, outputCostPerMillion: 36, cacheReadCostPerMillion: 1.5, family: 'qwen' },
    ],
  }
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => payload })
  try {
    const info = await loadCommunityPricing({ force: true })
    assert.equal(info.source, 'community-gitee')
    assert.equal(info.url, 'https://gitee.com/oyw125/model-price-table')
    const price = priceFor('deepseek-official', 'deepseek-flash', Date.UTC(2026, 10, 2, 0))
    assert.equal(price.input, 1)
    assert.equal(price.output, 4)
    assert.equal(price.cacheRead, 0.02)
    const qwen = priceFor('qwen', 'qwen3.8-max', Date.UTC(2026, 10, 2, 0))
    assert.equal(qwen.input, 12)
    assert.equal(qwen.output, 36)
  } finally {
    globalThis.fetch = realFetch
    resetPricingForTests()
  }
})

test('半套峰谷价目回退到平坦价', () => {
  setCatalogForTests([
    {
      provider: 'zhipu',
      model: 'glm-5.3',
      family: 'glm-5',
      currency: 'CNY',
      input: 8,
      cacheRead: 2,
      output: 28,
      peak: { input: 9 },
      offPeak: { input: 5, output: 14 },
    },
  ])
  const price = priceFor('zhipu', 'glm-5.3', Date.now())
  assert.equal(price.input, 8)
  assert.equal(price.output, 28)
  assert.equal(price.approximate, false)
})
