#!/usr/bin/env node
/**
 * dsh-token-dash 日志查看工具（常驻，非临时脚本）。
 *
 * 用法：
 *   node tools/logs.mjs                          # 全部日志，格式化输出
 *   node tools/logs.mjs --tail 50                # 最近 50 条
 *   node tools/logs.mjs --module slot,adapter.*  # 按模块过滤（逗号分隔，* 通配）
 *   node tools/logs.mjs --event mount            # 按事件名过滤（子串匹配）
 *   node tools/logs.mjs --home D:\path           # 指定 DSH_HOME（默认 ~/.dsh）
 *   node tools/logs.mjs --json                   # 原始 JSONL 输出
 *
 * 日志文件为 JSONL：{ ts, level, module, event, ...meta 顶层平铺 }。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}
const home = flag('home') ?? join(homedir(), '.dsh')
const tail = Number(flag('tail') ?? 0)
const modules = (flag('module') ?? '').split(',').map((m) => m.trim()).filter(Boolean)
const eventNeedle = flag('event')
const rawJson = args.includes('--json')

const dir = join(home, 'logs', 'dsh-token-dash')
let events = []
try {
  events = readdirSync(dir)
    .filter((name) => name.endsWith('.log'))
    .sort()
    .flatMap((name) => readFileSync(join(dir, name), 'utf8').split('\n').filter(Boolean))
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
} catch (error) {
  console.error(`无法读取日志目录 ${dir}: ${error.message}`)
  process.exit(1)
}

if (modules.length > 0) {
  const patterns = modules.map((m) => new RegExp(`^${m.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`))
  events = events.filter((e) => patterns.some((p) => p.test(String(e.module ?? ''))))
}
if (eventNeedle !== undefined) {
  events = events.filter((e) => String(e.event ?? '').includes(eventNeedle))
}
if (tail > 0) events = events.slice(-tail)

if (rawJson) {
  for (const e of events) console.log(JSON.stringify(e))
} else {
  for (const e of events) {
    const meta = { ...e }
    for (const key of ['ts', 'level', 'module', 'event']) delete meta[key]
    const extra = Object.keys(meta).length > 0
      ? ` ${Object.entries(meta).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ')}`
      : ''
    console.log(`${e.ts ?? ''} [${e.level ?? 'info'}] ${e.module ?? '?'} ${e.event ?? '?'}${extra}`)
  }
}
console.error(`\n(${events.length} 条，目录 ${dir})`)
