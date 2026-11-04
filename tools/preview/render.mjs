/**
 * 预览渲染器：模板 + spec → HTML → Playwright 截图。
 *
 * 用法：
 *   node tools/preview/render.mjs [template] [--publish] [--out <dir>] [--scale <n>]
 *   npm run preview gauge
 *   npm run preview:publish gauge     # 仅 README / 设计文档定稿图才用
 *
 * 默认输出 .tmp/preview/<template>.html|png（不入库）；
 * --publish 时 PNG 写 docs/pic/<template>.png，HTML 仍留在 .tmp。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { SPEC, cardWidth, columnCount } from './spec.mjs'

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const value = (name, fallback) => {
  const index = argv.indexOf(name)
  return index === -1 ? fallback : argv[index + 1]
}
let template = 'gauge'
for (let index = 0; index < argv.length; index += 1) {
  const item = argv[index]
  if (item === '--scale') { index += 1; continue }
  if (!item.startsWith('--')) { template = item; break }
}
const publish = flag('--publish')
const scale = Number(value('--scale', '2')) || 2
const columns = columnCount()
const card = cardWidth(SPEC.layout.contentWidth, columns, SPEC.layout.gap)

const css = [
  `--content-width: ${SPEC.layout.contentWidth}px;`,
  `--layout-gap: ${SPEC.layout.gap}px;`,
  `--card-width: ${card}px;`,
  `--card-radius: ${SPEC.card.radius}px;`,
  `--card-padding: ${SPEC.card.padding}px;`,
  `--card-header-font: ${SPEC.card.headerFont}px;`,
  `--card-chip-font: ${SPEC.card.chipFont}px;`,
  `--gauge-ring: ${SPEC.gauge.ring}px;`,
  `--gauge-stroke: ${SPEC.gauge.stroke}px;`,
  `--gauge-label: ${SPEC.gauge.label}px;`,
  `--gauge-percent: ${SPEC.gauge.percent}px;`,
  `--gauge-meta: ${SPEC.gauge.meta}px;`,
  `--gauge-gap: ${SPEC.gauge.gap}px;`,
  `--gauge-percent-offset: ${SPEC.gauge.percentOffset}px;`,
  `--api-ring: ${SPEC.apiGauge.ring}px;`,
  `--api-stroke: ${SPEC.apiGauge.stroke}px;`,
].join('\n    ')

const templatePath = resolve('tools/preview/templates', `${template}.html`)
if (!existsSync(templatePath)) throw new Error(`template not found: ${templatePath}`)

const html = readFileSync(templatePath, 'utf8')
  .replace('/*__SPEC_CSS__*/', css)
  .replace('/*__SPEC_JSON__*/', JSON.stringify({ ...SPEC, resolvedCardWidth: card, columns }))

const tmpDir = resolve('.tmp/preview')
mkdirSync(tmpDir, { recursive: true })
const htmlPath = join(tmpDir, `${template}.html`)
writeFileSync(htmlPath, html)

const executablePath = (() => {
  try {
    const bundled = chromium.executablePath()
    if (existsSync(bundled)) return bundled
  } catch { /* fall through */ }
  const base = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  if (!existsSync(base)) return undefined
  return readdirSync(base)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((left, right) => Number(right.split('-')[1]) - Number(left.split('-')[1]))
    .map((name) => join(base, name, 'chrome-win64', 'chrome.exe'))
    .find((candidate) => existsSync(candidate))
})()

const browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: scale })
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
await page.waitForTimeout(300)
const pngPath = join(tmpDir, `${template}.png`)
await page.screenshot({ path: pngPath, fullPage: true })
await browser.close()

console.log(`[preview] ${template} → ${pngPath} (${card}px × ${columns} 列, ${scale}x)`)

if (publish) {
  const target = resolve('docs/pic', `${template}.png`)
  mkdirSync(resolve('docs/pic'), { recursive: true })
  copyFileSync(pngPath, target)
  console.log(`[preview] published → ${target}`)
}
