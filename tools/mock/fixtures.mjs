/**
 * README 截图用的假数据。全部为虚构数字，只用于渲染演示，不读取任何真实账本。
 * 结构与 SummaryVM / usage VM 保持一致，由 scripts 里的截屏脚本注入到 /summary、/usage。
 */

import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const now = Date.now()

const budget = (amount, currency, used) => ({
  amount,
  used,
  remaining: Math.max(0, amount - used),
  percent: amount > 0 ? used / amount : 0,
  state: used >= amount ? 'over' : used / amount >= 0.8 ? 'warn' : 'ok',
  currency,
})

const provider = (id, name, kind, currency, extra = {}) => ({
  id,
  name,
  kind,
  currency,
  canSubscribe: id === 'zhipu' || id === 'moonshot',
  usage: { todayTokens: 128_400, monthTokens: 3_960_000, todayCost: 0.16, monthCost: 115.1, requests: 148 },
  ...extra,
})

/** SummaryVM：3 个按量 provider + 2 个订阅 provider。 */
export const summary = {
  providers: [
    provider('deepseek-official', 'DeepSeek', 'api', 'CNY', {
      budget: budget(100, 'CNY', 91.9),
      balance: { amount: 87.66, status: 'ok', currency: 'CNY', updatedAt: now },
    }),
    provider('openrouter', 'OpenRouter', 'api', 'USD', {
      budget: budget(60, 'USD', 22.8),
      balance: { amount: 7.66, status: 'ok', currency: 'USD', updatedAt: now },
    }),
    provider('qwen', '通义千问', 'api', 'CNY', {
      budget: budget(5, 'CNY', 0.4),
      balance: { amount: null, status: 'unsupported', currency: 'CNY', updatedAt: now },
    }),
    provider('zhipu', 'GLM Coding', 'subscription', 'CNY', {
      canSubscribe: false,
      windows: [
        { key: '5h', usedPercent: 42.5, resetAt: now + 3 * 3600_000 },
        { key: 'week', usedPercent: 18.2, resetAt: now + 26 * 3600_000 },
      ],
    }),
    provider('moonshot', 'Kimi Coding', 'subscription', 'CNY', {
      canSubscribe: false,
      windows: [
        { key: '5h', usedPercent: 30, resetAt: now + 3 * 3600_000 },
        { key: 'week', usedPercent: 12, resetAt: now + 26 * 3600_000 },
      ],
    }),
  ],
  pricingLinks: [
    { id: 'deepseek-official', label: 'DeepSeek', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
    { id: 'zhipu', label: '智谱 AI', url: 'https://docs.bigmodel.cn/cn/guide/start/pricing' },
    { id: 'moonshot', label: 'Kimi', url: 'https://platform.moonshot.cn/docs/pricing/chat' },
    { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/models' },
    { id: 'qwen', label: '通义千问', url: 'https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio' },
  ],
  catalog: { version: 1, updatedAt: '1793591115', source: 'community-gitee', url: 'https://gitee.com/oyw125/model-price-table' },
  showBalance: true,
  version: pkg.version,
  refreshMs: 60000,
  providersDegraded: false,
  currentProviderId: 'deepseek-official',
  updatedAt: now,
  stale: false,
}

/** 只有订阅 provider 的视图：用于截「[订阅]」形态的 Pill。 */
export const summarySubOnly = {
  ...summary,
  providers: summary.providers.filter((item) => item.kind === 'subscription'),
  currentProviderId: null,
}

const row = (providerId, providerName, modelId, displayName, kind, currency, cost, buckets, requests, approximate = false) => {
  const total = buckets.input + buckets.cacheRead + buckets.cacheWrite + buckets.output
  const denominator = buckets.input + buckets.cacheRead + buckets.cacheWrite
  return {
    providerId,
    providerName,
    modelId,
    displayName,
    kind,
    currency,
    billable: kind === 'api',
    requests,
    input: buckets.input,
    cacheRead: buckets.cacheRead,
    cacheWrite: buckets.cacheWrite,
    output: buckets.output,
    cost,
    priced: true,
    approximate,
    hitRate: denominator > 0 ? buckets.cacheRead / denominator : null,
    tokens: { ...buckets, cache: buckets.cacheRead + buckets.cacheWrite, total },
  }
}

const monthModels = [
  row('deepseek-official', 'DeepSeek', 'deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'api', 'CNY', 91.9, { input: 110_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000 }, 48),
  row('openrouter', 'OpenRouter', 'deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'api', 'USD', 22.8, { input: 20_000, cacheRead: 10_000, cacheWrite: 0, output: 10_000 }, 12, true),
  row('qwen', '通义千问', 'qwen3.8-max', 'Qwen3.8-Max', 'api', 'CNY', 0.4, { input: 50_000, cacheRead: 20_000, cacheWrite: 0, output: 10_000 }, 24),
  row('zhipu', 'GLM Coding', 'glm-5.3', 'GLM-5.3', 'subscription', 'CNY', 0, { input: 300_000, cacheRead: 520_000, cacheWrite: 0, output: 40_000 }, 64),
]

const todayModels = [
  row('deepseek-official', 'DeepSeek', 'deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'api', 'CNY', 0.04, { input: 8_000, cacheRead: 12_000, cacheWrite: 0, output: 1_200 }, 4),
  row('openrouter', 'OpenRouter', 'deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'api', 'USD', 0.12, { input: 3_000, cacheRead: 2_000, cacheWrite: 0, output: 800 }, 2, true),
]

function aggregate(models) {
  const totals = {
    CNY: { cost: 0, requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, hitRate: null },
    USD: { cost: 0, requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, hitRate: null },
  }
  const total = { tokens: 0, input: 0, cacheRead: 0, cacheWrite: 0, cache: 0, output: 0, requests: 0 }
  for (const model of models) {
    total.tokens += model.tokens.total
    total.input += model.input
    total.cacheRead += model.cacheRead
    total.cacheWrite += model.cacheWrite
    total.cache += model.tokens.cache
    total.output += model.output
    total.requests += model.requests
    if (model.billable !== true) continue
    const bucket = totals[model.currency]
    bucket.cost = Math.round((bucket.cost + model.cost) * 100) / 100
    bucket.requests += model.requests
    bucket.input += model.input
    bucket.cacheRead += model.cacheRead
    bucket.cacheWrite += model.cacheWrite
    bucket.output += model.output
  }
  for (const bucket of Object.values(totals)) {
    const denominator = bucket.input + bucket.cacheRead + bucket.cacheWrite
    bucket.hitRate = denominator > 0 ? bucket.cacheRead / denominator : null
  }
  const denominator = total.input + total.cacheRead + total.cacheWrite
  total.hitRate = denominator > 0 ? total.cacheRead / denominator : null
  return { totals, total }
}

/** 每个时间范围给出不同量级，模拟"切范围数字变化"。 */
export function usageFor(range) {
  const models = range === 'today' ? todayModels : monthModels
  const { totals, total } = aggregate(models)
  return {
    range,
    startAt: now - 30 * 86400_000,
    endAt: now,
    startKey: '2026-11-02',
    endKey: '2026-11-02',
    totals,
    total,
    models,
  }
}

/** 预置到临时 DSH_HOME 的 prefs，让 P3 显示预算行。 */
export const prefs = {
  budgets: {
    'deepseek-official': { amount: 100, currency: 'CNY' },
    openrouter: { amount: 60, currency: 'USD' },
    qwen: { amount: 5, currency: 'CNY' },
  },
  billingModes: { zhipu: 'subscription', moonshot: 'subscription' },
  refreshMs: 60000,
  showBalance: true,
}
