import test from 'node:test'
import assert from 'node:assert/strict'
import { headerFromEvent, ingest, recordFromEvent } from '../../src/collect.js'
import { emptyState } from '../../src/core.js'

test('从 message.source 取 provider 与 model', () => {
  const record = recordFromEvent({
    type: 'assistant/message',
    time: 1_700_000_000_000,
    data: {
      usage: { inputTokens: 10, cacheReadTokens: 2, cacheWriteTokens: 0, outputTokens: 3 },
      message: { source: { kind: 'model', provider: 'zhipu', model: 'glm-5.3' } },
    },
  })
  assert.equal(record.provider, 'zhipu')
  assert.equal(record.model, 'glm-5.3')
  assert.equal(record.input, 10)
  assert.equal(record.cacheRead, 2)
  assert.equal(record.output, 3)
})

test('缺 provider 时归为 unknown', () => {
  const record = recordFromEvent({
    type: 'assistant/message',
    time: 1,
    data: {
      usage: { inputTokens: 1, outputTokens: 1 },
      message: { source: { model: 'glm-5.3' } },
    },
  })
  assert.equal(record.provider, 'unknown')
})

test('#43 request/header 解析 data.header.config', () => {
  assert.deepEqual(
    headerFromEvent({ type: 'request/header', data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4.1-flash' } } } }),
    { provider: 'deepseek-official', model: 'deepseek-v4.1-flash' },
  )
  assert.equal(headerFromEvent({ type: 'request/header', data: {} }), undefined)
  assert.equal(headerFromEvent({ type: 'assistant/message', data: {} }), undefined)
})

test('#43 usage 无 source 时回退最近 request/header 归属', () => {
  const state = emptyState()
  const usageEvent = { type: 'assistant/message', seq: 2, time: 1, data: { usage: { inputTokens: 5, outputTokens: 1 }, message: { role: 'assistant', content: [] } } }
  // 无 header：保持 unknown
  let record = ingest(state, 's1', usageEvent)
  assert.equal(record.provider, 'unknown')
  // header 后的 usage：回退归属
  ingest(state, 's1', { type: 'request/header', seq: 3, time: 2, data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4.1-flash' } } } })
  record = ingest(state, 's1', { ...usageEvent, seq: 4, time: 3 })
  assert.equal(record.provider, 'deepseek-official')
  assert.equal(record.model, 'deepseek-v4.1-flash')
})

test('#43 message.source 优先于 header 回退', () => {
  const state = emptyState()
  ingest(state, 's1', { type: 'request/header', seq: 1, time: 1, data: { header: { config: { provider: 'zhipu', model: 'glm-5.3' } } } })
  const record = ingest(state, 's1', {
    type: 'assistant/message', seq: 2, time: 2,
    data: { usage: { inputTokens: 1, outputTokens: 1 }, message: { source: { provider: 'deepseek-official', model: 'deepseek-flash' } } },
  })
  assert.equal(record.provider, 'deepseek-official')
  assert.equal(record.model, 'deepseek-flash')
})
