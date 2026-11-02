import test from 'node:test'
import assert from 'node:assert/strict'
import { BACKUP_SCHEMA, buildExport, mergeImportDays, validateBundle } from '../../src/backup.js'
import { emptyState } from '../../src/core.js'

const now = new Date(2026, 10, 2, 12, 0, 0).getTime()

function row(input, output, cost) {
  return { input, cacheRead: 0, cacheWrite: 0, output, requests: 1, cost, priced: true }
}

function stateWithTwoMonths() {
  const state = emptyState()
  state.days['2026-11-02'] = { providers: { 'deepseek-official': { models: { 'deepseek-flash': row(1000, 100, 3) } } } }
  state.days['2026-10-31'] = { providers: { 'deepseek-official': { models: { 'deepseek-flash': row(2000, 200, 5) } } } }
  state.providerKinds = { 'deepseek-official': 'api' }
  return state
}

const providers = [{ id: 'deepseek-official', kind: 'api', currency: 'CNY' }]
const prefs = { budgets: { 'deepseek-official': { amount: 100, currency: 'CNY' } }, billingModes: {}, refreshMs: 60000, showBalance: true, version: 1 }

test('buildExport 只带当月 days，并给出四范围派生视图', () => {
  const bundle = buildExport(stateWithTwoMonths(), prefs, now, providers)
  assert.equal(bundle.schema, BACKUP_SCHEMA)
  assert.equal(bundle.month, '2026-11')
  assert.deepEqual(Object.keys(bundle.days), ['2026-11-02'])
  assert.deepEqual(Object.keys(bundle.usage).sort(), ['30d', '7d', 'all', 'today'])
  assert.equal(bundle.usage.all.total.tokens, 1100)
  assert.equal(bundle.usage.all.totals.CNY.cost, 3)
  assert.deepEqual(bundle.providerKinds, { 'deepseek-official': 'api' })
  assert.equal(JSON.stringify(bundle).includes('windows'), false)
  assert.equal(JSON.stringify(bundle).includes('balance'), false)
})

test('validateBundle 拒绝非法包', () => {
  const good = buildExport(stateWithTwoMonths(), prefs, now, providers)
  assert.equal(validateBundle(good).ok, true)
  assert.equal(validateBundle(null).reason, 'invalid-bundle')
  assert.equal(validateBundle({ ...good, schema: 2 }).reason, 'unsupported-schema')
  assert.equal(validateBundle({ ...good, month: '2026-1' }).reason, 'invalid-month')
  assert.equal(validateBundle({ ...good, days: { '2026-10-31': good.days['2026-11-02'] } }).reason, 'month-mismatch')
  assert.equal(validateBundle({ ...good, days: { '2026-11-01': {} } }).reason, 'invalid-day')
  assert.equal(validateBundle({ ...good, prefs: null }).reason, 'invalid-prefs')
})

test('mergeImportDays 覆盖当月且可重复导入', () => {
  const current = {
    '2026-10-31': { providers: {} },
    '2026-11-01': { providers: {} },
    '2026-11-02': { providers: {} },
  }
  const incoming = { '2026-11-02': { providers: { 'deepseek-official': { models: { 'deepseek-flash': row(10, 1, 0) } } } } }
  const merged = mergeImportDays(current, '2026-11', incoming)
  assert.deepEqual(Object.keys(merged).sort(), ['2026-10-31', '2026-11-02'])
  const again = mergeImportDays(merged, '2026-11', incoming)
  assert.deepEqual(again, merged)
})
