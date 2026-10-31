import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGlmQuota, parseKimiQuota, parseOpenRouterCredits, readProviders, readSubscriptions } from '../../src/adapters.js'

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

function ctxWith(keys = {}) {
  return {
    get(name) {
      if (name === 'credentials') {
        return { resolve: async (keyName) => (keys[keyName] !== undefined ? { value: keys[keyName] } : undefined) }
      }
      return undefined
    },
  }
}

function mockFetch(handler) {
  const original = globalThis.fetch
  globalThis.fetch = async (url, init) => handler(String(url), init)
  return () => {
    globalThis.fetch = original
  }
}

test('手动订阅模式：GLM quota 401 保留订阅卡（套餐查询失败）', async () => {
  const restore = mockFetch(async () => ({ ok: false, status: 401, json: async () => null }))
  try {
    const providers = await readProviders(ctxWith({ ZHIPU_API_KEY: 'sk-test' }), { billingModes: { zhipu: 'subscription' } })
    const zhipu = providers.find((item) => item.id === 'zhipu')
    assert.equal(zhipu.kind, 'subscription')
    assert.equal(zhipu.name, 'GLM Coding')
    assert.deepEqual(zhipu.plans, [])
  } finally {
    restore()
  }
})

test('手动订阅模式：Kimi coding quota 失败保留订阅卡', async () => {
  const restore = mockFetch(async () => ({ ok: false, status: 500, json: async () => null }))
  try {
    const providers = await readProviders(ctxWith({ KIMI_API_KEY: 'sk-test' }), { billingModes: { moonshot: 'subscription' } })
    const moonshot = providers.find((item) => item.id === 'moonshot')
    assert.equal(moonshot.kind, 'subscription')
    assert.equal(moonshot.name, 'Kimi Coding')
    assert.deepEqual(moonshot.plans, [])
  } finally {
    restore()
  }
})

test('hide 模式过滤；showBalance=false 仍请求余额（#31：开关只控制 P1）', async () => {
  const fetched = []
  const restore = mockFetch(async (url) => {
    fetched.push(url)
    return { ok: false, status: 404, json: async () => null }
  })
  try {
    const providers = await readProviders(ctxWith({ DEEPSEEK_API_KEY: 'sk-test', ZHIPU_API_KEY: 'sk-test' }), {
      showBalance: false,
      billingModes: { zhipu: 'hide' },
    })
    assert.equal(providers.find((item) => item.id === 'zhipu'), undefined)
    const deepseek = providers.find((item) => item.id === 'deepseek-official')
    assert.notEqual(deepseek.balance, undefined)
    assert.equal(fetched.some((url) => url.includes('user/balance')), true)
  } finally {
    restore()
  }
})

test('Qwen 国际站 Key 按 USD，国内站按 CNY', async () => {
  const intl = await readProviders(ctxWith({ DASHSCOPE_INTL_API_KEY: 'sk-test' }), {})
  assert.equal(intl.find((item) => item.id === 'qwen').currency, 'USD')
  const domestic = await readProviders(ctxWith({ DASHSCOPE_API_KEY: 'sk-test' }), {})
  assert.equal(domestic.find((item) => item.id === 'qwen').currency, 'CNY')
})

test('readSubscriptions 只重查订阅配额，不请求余额', async () => {
  const fetched = []
  const restore = mockFetch(async (url) => {
    fetched.push(url)
    return { ok: false, status: 500, json: async () => null }
  })
  try {
    const subs = await readSubscriptions(ctxWith({ ZHIPU_API_KEY: 'sk-test', KIMI_API_KEY: 'sk-test', MOONSHOT_API_KEY: 'sk-test' }), {})
    assert.deepEqual(subs.map((item) => item.id), ['zhipu', 'moonshot'])
    // Kimi 自动模式下 quota 失败：回落按量条目，但不查 moonshot 余额
    assert.equal(subs.find((item) => item.id === 'moonshot').kind, 'api')
    assert.equal(fetched.some((url) => url.includes('users/me/balance')), false)
  } finally {
    restore()
  }
})
