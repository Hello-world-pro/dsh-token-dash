import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { COST_MODEL_VERSION, loadState, recoverState, saveJson, saveMonths } from '../../src/store.js'

function row(input, output, requests) {
  return { input, cacheRead: 0, cacheWrite: 0, output, requests, cost: 0, priced: true }
}

test('recoverState 合并 1.0.3 备份并标记已消费', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'td-store-'))
  try {
    await saveJson(dir, 'daily.json', {
      version: 1,
      costVersion: 2,
      days: {
        '2026-11-02': {
          providers: { 'deepseek-official': { models: { 'deepseek-flash': row(2000, 200, 9) } } },
        },
      },
      watermarks: { s1: 100 },
      headers: { s1: { provider: 'deepseek-account', model: 'deepseek-flash' } },
      currentProvider: 'deepseek-official',
    })
    const backupName = 'daily.json.pre-v2-1793552377294.bak'
    await saveJson(dir, backupName, {
      version: 1,
      days: {
        '2026-11-01': {
          providers: { 'deepseek-official': { models: { 'deepseek-flash': row(1000, 100, 150) } } },
        },
        '2026-11-02': {
          providers: { 'deepseek-official': { models: { 'deepseek-flash': row(5000, 500, 255) } } },
        },
      },
      watermarks: { s1: 90 },
    })
    const state = await loadState(dir)
    const result = await recoverState(dir, state)
    assert.equal(result.recovered, true)
    assert.equal(state.costVersion, 1)
    assert.equal(state.days['2026-11-01'] !== undefined, true)
    assert.equal(state.days['2026-11-02'].providers['deepseek-official'].models['deepseek-flash'].requests, 264)
    assert.equal(state.watermarks.s1, 100)
    assert.equal(existsSync(join(dir, backupName)), false)
    assert.equal(existsSync(join(dir, `${backupName}.merged`)), true)
    const again = await recoverState(dir, state)
    assert.equal(again.recovered, false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('月度账本可在 daily.json 缺失时恢复本月数据', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'td-store-'))
  try {
    await saveJson(dir, 'daily.json', { version: 1, costVersion: 2, days: {}, watermarks: {}, headers: {}, currentProvider: null })
    await saveMonths(dir, {
      costVersion: 1,
      days: {
        '2026-11-01': {
          providers: { 'deepseek-official': { models: { 'deepseek-flash': row(1000, 100, 1) } } },
        },
      },
    })
    assert.equal(existsSync(join(dir, 'months', '2026-11.json')), true)
    const state = await loadState(dir)
    assert.equal(state.days['2026-11-01'] !== undefined, true)
    // 账本为旧计价模型：触发一次重算
    assert.equal(state.costVersion, 1)
    assert.equal(state.costVersion < COST_MODEL_VERSION, true)
    const payload = JSON.parse(await readFile(join(dir, 'months', '2026-11.json'), 'utf8'))
    assert.equal(payload.month, '2026-11')
    assert.equal(payload.days['2026-11-01'] !== undefined, true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
