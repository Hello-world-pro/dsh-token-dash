/**
 * Price catalog: bundled catalog.json, optional community feed and
 * OpenRouter /models overrides. Pure matching logic is separated from I/O.
 */
import { readFileSync } from 'node:fs'
import { normalizeModel, normalizeProvider, providerCurrency } from './providers.js'

const BUNDLED = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'))
const GITEE = 'https://gitee.com/oyw125/model-price-table/raw/master/model_pricing.json'
const GITHUB = 'https://raw.githubusercontent.com/LaoYueHanNi/model-price-table/master/model_pricing.json'
const GITEE_PAGE = 'https://gitee.com/oyw125/model-price-table'
const GITHUB_PAGE = 'https://github.com/LaoYueHanNi/model-price-table'
const ROUTER = 'https://openrouter.ai/api/v1/models'

let catalog = normalizeCatalog(BUNDLED)
let catalogUpdatedAt = BUNDLED.updatedAt ?? null
let catalogSource = 'bundled'
let catalogUrl = null
let routerPrices = null
let communityCache = { at: 0, value: null }

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function pricesOf(raw) {
  return {
    input: finite(raw?.input),
    cacheRead: finite(raw?.cacheRead) ?? 0,
    cacheWrite: finite(raw?.cacheWrite) ?? 0,
    output: finite(raw?.output),
  }
}

function normalizeEntry(raw) {
  const provider = normalizeProvider(raw?.provider)
  const model = normalizeModel(raw?.model)
  if (provider === 'unknown' || model === 'unknown') return null
  const currency = raw?.currency === 'USD' ? 'USD' : (raw?.currency === 'CNY' || raw?.currency === 'RMB' ? 'CNY' : providerCurrency(provider))
  const prices = raw?.prices !== undefined ? pricesOf(raw.prices) : pricesOf(raw)
  // 二次归一化会显式传 null：null 必须等同于"没有峰谷价目"
  const peakRaw = raw?.peak != null ? pricesOf(raw.peak) : null
  const offPeakRaw = raw?.offPeak != null ? pricesOf(raw.offPeak) : null
  const hasFlat = prices.input !== null && prices.output !== null
  const hasTiers = peakRaw !== null && offPeakRaw !== null && peakRaw.input !== null && peakRaw.output !== null && offPeakRaw.input !== null && offPeakRaw.output !== null
  if (!hasFlat && !hasTiers) return null
  const peak = hasTiers ? peakRaw : null
  const offPeak = hasTiers ? offPeakRaw : null
  return {
    provider,
    model,
    displayName: String(raw?.displayName ?? model),
    family: String(raw?.family ?? model),
    releasedAt: String(raw?.releasedAt ?? raw?.updatedAt ?? ''),
    currency,
    aliases: Array.isArray(raw?.aliases) ? raw.aliases.map((alias) => normalizeModel(alias)) : [],
    prices: hasTiers ? null : prices,
    peak,
    offPeak,
  }
}

function normalizeCatalog(raw) {
  const models = []
  for (const item of Array.isArray(raw?.models) ? raw.models : []) {
    const entry = normalizeEntry(item)
    if (entry !== null) models.push(entry)
  }
  return { models }
}

function allEntries() {
  return [...catalog.models, ...(routerPrices?.models ?? [])]
}

function exactEntry(provider, model) {
  return allEntries().find((entry) => entry.provider === provider && entry.model === model) ?? null
}

function aliasEntry(provider, model) {
  return allEntries().find((entry) => entry.provider === provider && entry.aliases.includes(model)) ?? null
}

function familyEntry(provider, model) {
  const candidates = allEntries().filter((entry) => entry.provider === provider && entry.family !== '' && model.startsWith(entry.family))
  if (candidates.length === 0) return null
  return candidates.sort((left, right) => String(right.releasedAt).localeCompare(String(left.releasedAt)))[0]
}

function effectivePrices(entry, ts) {
  if (entry.peak !== null && entry.offPeak !== null) {
    // 北京时间工作日 09:00-12:00 / 14:00-18:00 为高峰，周末全天闲时
    const date = new Date(ts + 8 * 60 * 60 * 1000)
    const hour = date.getUTCHours()
    const weekday = date.getUTCDay()
    const workday = weekday >= 1 && weekday <= 5
    const peak = workday && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18))
    return peak ? entry.peak : entry.offPeak
  }
  return entry.prices
}

function communityPrices(raw) {
  return {
    input: finite(raw?.inputCostPerMillion),
    cacheRead: finite(raw?.cacheReadCostPerMillion) ?? 0,
    cacheWrite: finite(raw?.cacheCreationCostPerMillion) ?? 0,
    output: finite(raw?.outputCostPerMillion),
  }
}

/** 社区表用 timeRules/dailySlots 表达峰谷；仅识别标准工作日两段窗口，其余保持平坦价。 */
function tieredPrices(raw) {
  const slots = Array.isArray(raw?.dailySlots) ? raw.dailySlots : []
  const slot = slots.find((item) => Array.isArray(item?.windows) && item.windows.length === 2)
  if (slot === undefined) return null
  const windows = slot.windows.map((item) => [Number(item?.startMinute), Number(item?.endMinute)])
  const standard = windows[0][0] === 540 && windows[0][1] === 720 && windows[1][0] === 840 && windows[1][1] === 1080
  const days = Array.isArray(slot.daysOfWeek) ? slot.daysOfWeek.map(Number) : [1, 2, 3, 4, 5]
  const weekdays = days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))
  if (!standard || !weekdays) return null
  const peak = communityPrices(slot)
  const offPeak = communityPrices(raw)
  if (peak.input === null || peak.output === null || offPeak.input === null || offPeak.output === null) return null
  return { peak, offPeak }
}

/**
 * Resolve one price. Returns null when no exact, alias or same-family entry.
 * `approximate` is true only for same-family fallback.
 */
export function priceFor(provider, model, ts = Date.now()) {
  const providerId = normalizeProvider(provider)
  const modelId = normalizeModel(model)
  const exact = exactEntry(providerId, modelId)
  if (exact !== null) {
    const prices = effectivePrices(exact, ts)
    return { ...prices, currency: exact.currency, approximate: false, source: catalogSource, catalogModel: exact.model }
  }
  const alias = aliasEntry(providerId, modelId)
  if (alias !== null) {
    const prices = effectivePrices(alias, ts)
    return { ...prices, currency: alias.currency, approximate: false, source: catalogSource, catalogModel: alias.model }
  }
  const family = familyEntry(providerId, modelId)
  if (family !== null) {
    const prices = effectivePrices(family, ts)
    return { ...prices, currency: family.currency, approximate: true, source: catalogSource, catalogModel: family.model }
  }
  return null
}

export function catalogInfo() {
  return { version: catalog.version ?? null, source: catalogSource, updatedAt: catalogUpdatedAt, url: catalogUrl, models: allEntries().length }
}

export function setCatalogForTests(models) {
  catalog = normalizeCatalog({ models })
  catalogSource = 'test'
  catalogUpdatedAt = null
  routerPrices = null
  communityCache = { at: 0, value: null }
}

function remoteEntry(raw) {
  const tier = tieredPrices(raw)
  return normalizeEntry({
    provider: raw.provider ?? raw.family ?? 'unknown',
    model: raw.modelId ?? raw.model,
    displayName: raw.displayName ?? raw.modelId ?? raw.model,
    family: raw.family ?? '',
    releasedAt: raw.releasedAt ?? raw.updatedAt ?? '',
    currency: raw.currency === 'RMB' ? 'CNY' : raw.currency,
    input: raw.input ?? raw.inputCostPerMillion,
    cacheRead: raw.cacheRead ?? raw.cacheReadCostPerMillion,
    cacheWrite: raw.cacheWrite ?? raw.cacheCreationCostPerMillion,
    output: raw.output ?? raw.outputCostPerMillion,
    aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    ...(tier === null ? {} : tier),
  })
}

async function fetchJson(url, timeoutMs = 6000) {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`http-${response.status}`)
  return response.json()
}

/** Load community catalog; Gitee first, GitHub second. Never throws. */
export async function loadCommunityPricing({ force = false } = {}) {
  if (!force && communityCache.value !== null && Date.now() - communityCache.at < 24 * 3600 * 1000) return communityCache.value
  for (const url of [GITEE, GITHUB]) {
    try {
      const raw = await fetchJson(url)
      const parsed = normalizeCatalog({
        models: (Array.isArray(raw?.models) ? raw.models : []).map((item) => {
          const normalized = remoteEntry({ ...item, provider: item.provider ?? inferProvider(item.modelId) })
          return normalized === null ? null : {
            provider: normalized.provider,
            model: normalized.model,
            displayName: normalized.displayName,
            family: normalized.family,
            releasedAt: normalized.releasedAt,
            currency: normalized.currency,
            aliases: normalized.aliases,
            prices: normalized.prices,
            peak: normalized.peak,
            offPeak: normalized.offPeak,
          }
        }).filter(Boolean),
      })
      if (parsed.models.length === 0) throw new Error('empty-catalog')
      catalog = parsed
      catalogSource = url === GITEE ? 'community-gitee' : 'community-github'
      catalogUrl = url === GITEE ? GITEE_PAGE : GITHUB_PAGE
      catalogUpdatedAt = raw?.updatedAt === undefined ? null : String(raw.updatedAt)
      communityCache = { at: Date.now(), value: catalogInfo() }
      return catalogInfo()
    } catch {
      // try next mirror, then bundled
    }
  }
  return catalogInfo()
}

function inferProvider(modelId) {
  const id = String(modelId ?? '').toLowerCase()
  if (id.includes('glm')) return 'zhipu'
  if (id.includes('kimi')) return 'moonshot'
  if (id.includes('qwen')) return 'qwen'
  if (id.includes('deepseek')) return 'deepseek-official'
  return 'unknown'
}

/** OpenRouter public model prices; used only for provider=openrouter. */
export async function loadRouterPricing() {
  try {
    const raw = await fetchJson(ROUTER)
    const models = []
    for (const item of Array.isArray(raw?.data) ? raw.data : []) {
      const prices = item?.pricing
      const input = Number(prices?.prompt)
      const output = Number(prices?.completion)
      if (!Number.isFinite(input) || !Number.isFinite(output)) continue
      models.push({
        provider: 'openrouter',
        model: normalizeModel(item.id),
        displayName: String(item.name ?? item.id),
        family: String(item.id).split('/')[0] ?? '',
        releasedAt: '',
        currency: 'USD',
        aliases: [],
        prices: {
          input: input * 1_000_000,
          cacheRead: Number(prices?.input_cache_read ?? 0) * 1_000_000,
          cacheWrite: Number(prices?.input_cache_write ?? 0) * 1_000_000,
          output: output * 1_000_000,
        },
        peak: null,
        offPeak: null,
      })
    }
    if (models.length > 0) {
      routerPrices = { models }
      return true
    }
  } catch {
    // keep bundled/community
  }
  return false
}

export function resetPricingForTests() {
  catalog = normalizeCatalog(BUNDLED)
  catalogUpdatedAt = BUNDLED.updatedAt ?? null
  catalogSource = 'bundled'
  routerPrices = null
  communityCache = { at: 0, value: null }
}
