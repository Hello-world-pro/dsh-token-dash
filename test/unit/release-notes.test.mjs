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

test('local 版本不能用于 Release notes', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/release-notes.mjs', '1.0.6-local.1'], { stdio: 'pipe' }))
})

test('CHANGELOG 保留完整正式历史且无 local 草稿', () => {
  const text = readFileSync('CHANGELOG.md', 'utf8')
  assert.match(text, /## \[1\.0\.0\]/)
  assert.match(text, /## \[1\.0\.2\]/)
  assert.ok(!/^## \[[^\]]*-local\./m.test(text), '正式历史中不应残留 local 版本块')
})
