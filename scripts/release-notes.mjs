#!/usr/bin/env node
/**
 * 从 CHANGELOG.md 提取指定版本的完整区块，供 GitHub Release body 使用。
 * 用法：node scripts/release-notes.mjs [version] [--out <file>]
 * 不带 version 时读取 package.json。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const version = args[0] !== undefined && !args[0].startsWith('-') ? args[0] : pkg.version
if (version.includes('-local.')) {
  console.error(`本地构建版本 ${version} 不能用于 Release notes`)
  process.exit(2)
}
const outIndex = args.indexOf('--out')
const out = outIndex === -1 ? null : args[outIndex + 1]
if (outIndex !== -1 && (out === undefined || out === '')) {
  console.error('--out 需要文件路径')
  process.exit(2)
}

const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/)
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`))
if (start === -1) {
  console.error(`CHANGELOG.md 缺少版本块 ## [${version}]`)
  process.exit(1)
}
let end = lines.findIndex((line, index) => index > start && line.startsWith('## ['))
if (end === -1) end = lines.length
const body = lines.slice(start + 1, end).join('\n').trim()
if (body === '' || !body.includes('### ')) {
  console.error(`CHANGELOG.md 的 ${version} 版本块没有可发布内容`)
  process.exit(1)
}

if (out === null) {
  process.stdout.write(`${body}\n`)
} else {
  const target = resolve(out)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${body}\n`, 'utf8')
  console.log(`wrote ${target}`)
}
