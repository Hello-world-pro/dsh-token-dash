import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => JSON.parse(readFileSync(new URL(`../../locale/${name}.json`, import.meta.url), 'utf8'))
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

test('locale dictionaries cover the same keys', () => {
  const zh = read('zh')
  const en = read('en')
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  assert.ok(Object.keys(en).length >= 90)
})

test('locale dictionaries keep placeholders in sync', () => {
  const zh = read('zh')
  const en = read('en')
  for (const key of Object.keys(zh)) {
    assert.equal(typeof en[key], 'string')
    assert.ok(en[key].length > 0)
    assert.deepEqual(placeholders(zh[key]), placeholders(en[key]), `placeholder mismatch: ${key}`)
  }
})
