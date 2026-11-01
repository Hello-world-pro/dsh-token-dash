import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version

test('release notes 提取当前版本完整块', () => {
  const output = execFileSync(process.execPath, ['scripts/release-notes.mjs', version], { encoding: 'utf8' })
  assert.match(output, /### 新增/)
  assert.match(output, /### 修改/)
  assert.ok(!output.includes('## ['), 'body 不应包含版本标题')
})

test('release notes 缺少版本块时失败', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/release-notes.mjs', '0.0.0-missing'], { stdio: 'pipe' }))
})
