import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../client.js', import.meta.url), 'utf8')

test('P1 mounts in input.right without taking host agentPreset', () => {
  assert.ok(source.includes("slots.inject('conversation.input.right'"))
  assert.ok(source.includes("name: 'conversation.input.right'"))
  assert.ok(!source.includes('conversation.hero.agentPreset'))
  assert.ok(!source.includes('conversation.composer.dock'))
})
