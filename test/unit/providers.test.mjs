import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MODELS,
  canBeSubscription,
  defaultModelFor,
  modelLabel,
  normalizeProvider,
  pricingLinks,
  providerCurrency,
  providerDescriptor,
  providerFromModel,
  providerLabel,
} from '../../src/providers.js'

test('registry descriptors keep the five-provider contract', () => {
  assert.deepEqual(pricingLinks().map((item) => item.id), ['deepseek-official', 'zhipu', 'moonshot', 'openrouter', 'qwen'])
  assert.deepEqual(pricingLinks().map((item) => item.label), ['DeepSeek 官方', '智谱 AI', 'Kimi', 'OpenRouter', '通义千问'])
  assert.equal(pricingLinks().length, 5)
  assert.equal(providerLabel('deepseek-account'), 'DeepSeek 官方')
  assert.equal(providerLabel('zai-coding'), '智谱 AI')
  assert.equal(providerCurrency('openrouter'), 'USD')
  assert.equal(providerCurrency('qwen'), 'CNY')
  assert.equal(canBeSubscription('zhipu'), true)
  assert.equal(canBeSubscription('moonshot'), true)
  assert.equal(canBeSubscription('openrouter'), false)
  assert.equal(providerDescriptor('unknown'), null)
})

test('default models and compat table stay unchanged', () => {
  assert.deepEqual(DEFAULT_MODELS, {
    'deepseek-official': 'deepseek-v4.1-flash',
    zhipu: 'glm-5.3',
    moonshot: 'kimi-k3',
    openrouter: '-',
    qwen: 'qwen3.8-max',
  })
  for (const [id, model] of Object.entries(DEFAULT_MODELS)) {
    assert.equal(defaultModelFor(id), model)
  }
})

test('model ownership and labels come from descriptors', () => {
  assert.equal(providerFromModel('deepseek-v4.1-flash'), 'deepseek-official')
  assert.equal(providerFromModel('glm-5.3'), 'zhipu')
  assert.equal(providerFromModel('kimi-k3'), 'moonshot')
  assert.equal(providerFromModel('qwen3.8-max'), 'qwen')
  assert.equal(providerFromModel('unknown-model'), null)
  assert.equal(modelLabel('deepseek-flash'), 'DeepSeek-V4.1-Flash')
  assert.equal(modelLabel('glm-5.3'), 'GLM-5.3')
  assert.equal(modelLabel('kimi-k3.1-pro'), 'Kimi K3.1 Pro')
  assert.equal(modelLabel('qwen3.8-flash'), 'Qwen3.8-Flash')
  assert.equal(modelLabel('openrouter/auto'), 'auto')
  assert.equal(normalizeProvider('DEEPSEEK'), 'deepseek-official')
})
