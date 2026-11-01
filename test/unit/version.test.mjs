import test from 'node:test'
import assert from 'node:assert/strict'
import { compareVersions, isNewer } from '../../src/version.js'

test('版本比较：base 优先，local 是同 base 的预发布', () => {
  assert.equal(compareVersions('1.0.7', '1.0.7-local.1'), 1)
  assert.equal(compareVersions('1.0.7-local.1', '1.0.7'), -1)
  assert.equal(compareVersions('1.0.7-local.1', '1.0.7-local.1'), 0)
  assert.equal(compareVersions('1.0.7-local.2', '1.0.7-local.1'), 1)
  assert.equal(compareVersions('1.0.7-local.10', '1.0.7-local.2'), 1)
  assert.equal(compareVersions('1.0.8-local.1', '1.0.7'), 1)
  assert.equal(compareVersions('1.0.6', '1.0.7-local.1'), -1)
})

test('isNewer：local 可升级到同 base 正式版', () => {
  assert.equal(isNewer('1.0.7', '1.0.7-local.1'), true)
  assert.equal(isNewer('1.0.7', '1.0.7-local.9'), true)
  assert.equal(isNewer('1.0.7-local.2', '1.0.7-local.1'), true)
  assert.equal(isNewer('1.0.6', '1.0.7-local.1'), false)
  assert.equal(isNewer('1.0.7', '1.0.7'), false)
  assert.equal(isNewer('1.0.7', '1.0.8-local.1'), false)
})
