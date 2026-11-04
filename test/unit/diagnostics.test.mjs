import test from 'node:test'
import assert from 'node:assert/strict'
import { redact, hasSecret, createLogger, exportLog } from '../../src/diagnostics.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('redacts keys, bearer and secret fields', () => {
  const text = redact('Authorization: Bearer sk-1234567890\n"apiKey":"abcdefgh"\nCookie=session=1')
  assert.ok(!text.includes('sk-1234567890'))
  assert.ok(!text.includes('abcdefgh'))
  assert.ok(text.includes('[REDACTED]'))
  assert.equal(hasSecret('sk-1234567890'), true)
  assert.equal(hasSecret('normal message'), false)
})

test('logger writes module JSONL and export contains header', () => {
  const dir = mkdtempSync(join(tmpdir(), 'token-dash-log-'))
  try {
    const logger = createLogger({ dir, level: 'debug', version: '0.2.0' })
    logger.info('adapter.glm', 'quota.ok', { windows: 2 })
    const exported = exportLog(dir, logger)
    assert.ok(exported.content.includes('"module":"adapter.glm"'))
  assert.ok(exported.content.includes('"prefix":"[TD:adapter.glm]"'))
    assert.ok(exported.content.includes('"type":"header"'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
