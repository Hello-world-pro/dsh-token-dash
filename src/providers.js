/**
 * Provider identity, billing mode and currency.
 * Pure functions only; no I/O.
 */

const ALIASES = {
  'deepseek-account': 'deepseek-official',
  'deepseek-official': 'deepseek-official',
  deepseek: 'deepseek-official',
  glm: 'zhipu',
  zhipu: 'zhipu',
  'z.ai': 'zhipu',
  'zai-coding': 'zhipu',
  'zai-coding-cn': 'zhipu',
  kimi: 'moonshot',
  moonshot: 'moonshot',
  'kimi-coding': 'moonshot',
  qwen: 'qwen',
  dashscope: 'qwen',
  aliyun: 'qwen',
  tongyi: 'qwen',
  openrouter: 'openrouter',
}

const NAMES = {
  'deepseek-official': 'DeepSeek 官方',
  zhipu: '智谱 AI',
  moonshot: 'Kimi',
  qwen: '通义千问',
  openrouter: 'OpenRouter',
  unknown: '未知来源',
}

const SUBSCRIPTION = new Set(['zhipu', 'moonshot'])
const CURRENCY = {
  'deepseek-official': 'CNY',
  zhipu: 'CNY',
  moonshot: 'CNY',
  qwen: 'CNY',
  openrouter: 'USD',
}

export function normalizeProvider(raw) {
  const id = String(raw ?? '').trim().toLowerCase()
  if (id === '') return 'unknown'
  return ALIASES[id] ?? id
}

export function providerLabel(raw) {
  const id = normalizeProvider(raw)
  return NAMES[id] ?? id
}

export function isSupportedProvider(raw) {
  return Object.prototype.hasOwnProperty.call(NAMES, normalizeProvider(raw)) && normalizeProvider(raw) !== 'unknown'
}

export function providerCurrency(raw) {
  return CURRENCY[normalizeProvider(raw)] ?? 'CNY'
}

export function canBeSubscription(raw) {
  return SUBSCRIPTION.has(normalizeProvider(raw))
}

export function providerKind(raw, mode) {
  const id = normalizeProvider(raw)
  if (mode === 'api' || mode === 'subscription') return mode
  return canBeSubscription(id) ? 'subscription' : 'api'
}

/** #41：模型名前缀 → provider 归因（DSH 会话事件无 provider 标注时，unknown 行按此兜底归属）。 */
const MODEL_OWNER_RULES = [
  [/^deepseek/, 'deepseek-official'],
  [/^glm/, 'zhipu'],
  [/^kimi|^moonshot/, 'moonshot'],
  [/^qwen/, 'qwen'],
]

export function providerFromModel(modelId) {
  const id = normalizeModel(modelId)
  if (id === 'unknown') return null
  for (const [pattern, owner] of MODEL_OWNER_RULES) {
    if (pattern.test(id)) return owner
  }
  return null
}

/** #44：已配置 provider 的默认模型——明细表在本月无真实消耗行时补一行（数值 0），保证"配置即可见"。OpenRouter 为中转无默认模型。 */
export const DEFAULT_MODELS = {
  'deepseek-official': 'deepseek-v4.1-flash',
  zhipu: 'glm-5.3',
  moonshot: 'kimi-k3',
  qwen: 'qwen3.8-max',
}

export function modelLabel(raw) {
  const id = normalizeModel(raw)
  const labels = {
    'deepseek-flash': 'DeepSeek-V4.1-Flash',
    'deepseek-v4.1-flash': 'DeepSeek-V4.1-Flash',
    'deepseek-v4-flash': 'DeepSeek-V4.1-Flash',
    'deepseek-pro': 'DeepSeek-V4.1-Pro',
    'deepseek-v4-pro': 'DeepSeek-V4.1-Pro',
    'glm-5.3': 'GLM-5.3',
    'glm-5.3-flash': 'GLM-5.3-Flash',
    'kimi-k3': 'Kimi K3',
    'kimi-k3.1-pro': 'Kimi K3.1 Pro',
    'kimi-k2.7-code': 'Kimi K2.7 Code',
    'qwen3.8-max': 'Qwen3.8-Max',
    'qwen3.8-flash': 'Qwen3.8-Flash',
  }
  return labels[id] ?? id
}

/** Only folds casing/provider prefix/date suffixes; never merges generations. */
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
