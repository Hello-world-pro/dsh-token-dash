/**
 * 生成 README 截图：临时 DSH_HOME + web profile + 假数据注入，不读真实账本。
 *
 * 用法：npm run shots [-- --keep]
 * 产物：docs/pic/panel-dashboard.png（用量）、docs/pic/settings.png（设置）
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import { prefs, summary, summarySubOnly, usageFor } from './fixtures.mjs'

const root = resolve('.')
const keep = process.argv.includes('--keep')
const tmpRoot = join(root, '.tmp')
const home = join(tmpRoot, `shots-home-${Date.now()}`)
const outDir = join(root, 'docs', 'pic')
const appRoot = process.env.DSH_APP_ROOT ?? join(process.env.LOCALAPPDATA ?? '', 'Programs', 'DeepSeek Harness')
const exe = join(appRoot, 'DeepSeek Harness.exe')
const cliJs = join(appRoot, 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js')
mkdirSync(home, { recursive: true })
mkdirSync(outDir, { recursive: true })
if (!existsSync(exe)) throw new Error(`DSH executable not found: ${exe} (set DSH_APP_ROOT)`)

const env = { ...process.env, DSH_HOME: home, ELECTRON_RUN_AS_NODE: '1' }

function resolveChromium() {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  if (typeof fromEnv === 'string' && fromEnv !== '' && existsSync(fromEnv)) return fromEnv
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
}

function startWeb() {
  const child = spawn(exe, ['--expose-internals', cliJs, '--profile', 'web', '--port', '0', '--no-open'], { env, windowsHide: true })
  let log = ''
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`web start timeout:\n${log}`)), 30000)
    const onData = (chunk) => {
      log += chunk.toString()
      const match = log.match(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=([^\s]+)/)
      if (match) { clearTimeout(timer); resolveReady({ base: `http://127.0.0.1:${match[1]}`, token: match[2] }) }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => { if (!log.includes('http://127.0.0.1')) reject(new Error(`web exited ${code}:\n${log}`)) })
  })
  return { child, ready }
}

function stopTree(child) {
  if (child?.pid === undefined) return
  try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { child.kill() }
}

let server
let browser
try {
  execFileSync(exe, ['--expose-internals', cliJs, 'plugin', '--profile', 'web', 'add', `link:${root}`], { env, encoding: 'utf8' })
  server = startWeb()
  const { base, token } = await server.ready
  console.log(`[shots] web ${base}`)

  const seeded = await fetch(`${base}/token-dash/api/prefs`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  if (seeded.status !== 200) throw new Error(`prefs seed failed: ${seeded.status}`)

  const executablePath = resolveChromium()
  browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) })
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2 })

  let activeSummary = summary
  await page.route('**/token-dash/api/summary*', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: activeSummary }),
  }))
  await page.route('**/token-dash/api/usage*', (route) => {
    const range = new URL(route.request().url()).searchParams.get('range') ?? 'today'
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: usageFor(range) }) })
  })
  await page.route('**/token-dash/api/update', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { published: true, hasUpdate: false, latest: '1.1.0', current: '1.1.0' } }),
  }))
  await page.route('**/open-in-app/open', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))

  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  // 关掉宿主首次引导遮罩
  for (let round = 0; round < 4; round += 1) {
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('[role=presentation] button')]
      const next = buttons.find((button) => /继续|跳过|稍后|关闭/.test(button.textContent ?? ''))
      if (next !== undefined) next.click()
    })
    await page.waitForTimeout(200)
  }
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[role=presentation]')) node.remove()
  })
  // 与 P1 截图一致：深色主题
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', '1'))
  await page.waitForTimeout(300)

  const pill = page.locator('[data-testid=token-dash-pill]')
  await pill.waitFor({ timeout: 20000 })
  const jsClick = (locator) => locator.evaluate((node) => node.click())
  await jsClick(pill)

  const panel = page.locator('[data-testid=token-dash-panel]')
  await panel.waitFor({ timeout: 8000 })
  // 宿主可能弹出登录/引导浮层，截图前清掉非看板自身的弹层
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[role=dialog],[role=presentation]')) {
      if (node.matches('[data-testid=token-dash-panel]')) continue
      if (node.querySelector('[data-testid=token-dash-panel]') !== null) continue
      node.remove()
    }
  })
  // 截图需要完整内容：解除 70vh 限高并临时固定到左上角，否则面板会超出视口导致空白
  await page.addStyleTag({
    content: '[data-testid=token-dash-panel]{position:fixed !important;top:8px !important;left:8px !important;bottom:auto !important;max-height:none !important;overflow:visible !important}',
  })
  await page.waitForTimeout(300)

  // 用量：切到近 30 天，让两格卡有完整数字
  await jsClick(panel.getByRole('tab', { name: '近30天' }))
  await page.waitForTimeout(600)
  await panel.screenshot({ path: join(outDir, 'panel-dashboard.png') })
  console.log('[shots] panel-dashboard.png')

  // 设置：五分区
  await jsClick(panel.getByRole('tab', { name: '设置' }))
  await page.locator('[data-testid=token-dash-settings]').waitFor({ timeout: 8000 })
  await page.waitForTimeout(400)
  await panel.screenshot({ path: join(outDir, 'settings.png') })
  console.log('[shots] settings.png')

  // P1 Pill（按量形态）：面板固定在左上角，pill 仍在底栏可见
  const shotPill = async (file) => {
    // 面板固定在左上角且高于底栏，截图 pill 前先藏起来；同时清掉宿主弹层并强制深色
    await page.evaluate(() => {
      document.body.setAttribute('data-ds-dark-theme', '1')
      const panel = document.querySelector('[data-testid=token-dash-panel]')
      if (panel !== null) panel.style.display = 'none'
      for (const node of document.querySelectorAll('[role=dialog],[role=presentation],[aria-modal=true]')) {
        if (node.matches('[data-testid=token-dash-panel]')) continue
        if (node.querySelector('[data-testid=token-dash-panel]') !== null) continue
        node.remove()
      }
    })
    const target = page.locator('[data-testid=token-dash-pill]')
    await target.waitFor({ timeout: 10000 })
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    if (box === null) throw new Error(`pill box missing for ${file}`)
    // 按 pill 实际宽度加 20px 内边距裁切，避免裁到相邻的宿主控件
    await page.screenshot({
      path: join(outDir, file),
      clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 },
    })
    console.log(`[shots] ${file}`)
  }
  await shotPill('pill-api.png')

  // P1 Pill（订阅形态）：切换到只含订阅 provider 的假数据
  activeSummary = summarySubOnly
  await page.reload({ waitUntil: 'domcontentloaded' })
  for (let round = 0; round < 4; round += 1) {
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('[role=presentation] button,[role=dialog] button')]
      const next = buttons.find((button) => /继续|跳过|稍后|关闭/.test(button.textContent ?? ''))
      if (next !== undefined) next.click()
    })
    await page.waitForTimeout(200)
  }
  await page.waitForTimeout(700)
  await shotPill('pill-sub.png')
} finally {
  await browser?.close().catch(() => {})
  stopTree(server?.child)
  if (!keep) rmSync(home, { recursive: true, force: true })
}
