import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../client.js', import.meta.url), 'utf8')

test('P1 stays in composer.dock, right aligned, without touching host agentPreset', () => {
  assert.ok(source.includes("slots.inject('conversation.composer.dock'"))
  assert.ok(source.includes("name: 'conversation.composer.dock'"))
  assert.ok(source.includes("id: 'token-dash-input', order: 10"))
  assert.ok(source.includes("order: 10, marginLeft: 8"))
  assert.ok(!source.includes('conversation.hero.agentPreset'))
  assert.ok(!source.includes('conversation.input.right'))
  assert.ok(!source.includes('conversation.input.dock'))
})
