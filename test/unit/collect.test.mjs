import test from 'node:test'
import assert from 'node:assert/strict'
import { recordFromEvent } from '../../src/collect.js'

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
