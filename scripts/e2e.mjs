/**
 * L2 + L3 E2E: temporary DSH_HOME + web profile, API assertions and Playwright UI.
 * Usage: node scripts/e2e.mjs [--keep]
 */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve('.')
const keep = process.argv.includes('--keep')
const tmpRoot = join(root, '.tmp')
const home = join(tmpRoot, `e2e-home-${Date.now()}`)
const appRoot = process.env.DSH_APP_ROOT ?? join(process.env.LOCALAPPDATA ?? '', 'Programs', 'DeepSeek Harness')
const exe = join(appRoot, 'DeepSeek Harness.exe')
const cliJs = join(appRoot, 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js')
mkdirSync(home, { recursive: true })
assert.ok(existsSync(exe), `DSH executable not found: ${exe} (set DSH_APP_ROOT)`)

const nodeEnv = (env) => ({ ...env, ELECTRON_RUN_AS_NODE: '1' })
function run(args, env) {
  return execFileSync(exe, ['--expose-internals', cliJs, ...args], { env: nodeEnv(env), encoding: 'utf8' })
}
function startWeb(env) {
  const child = spawn(exe, ['--expose-internals', cliJs, '--profile', 'web', '--port', '0', '--no-open'], { env: nodeEnv(env), windowsHide: true })
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
  return { child, ready, log: () => log }
}
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
function stopTree(child) {
  if (child?.pid === undefined) return
  try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { child.kill() }
}
const now = Date.now()
const budget = (amount, currency, used, percent) => ({ amount, used, remaining: Math.max(0, amount - used), percent, state: percent >= 1 ? 'over' : percent >= 0.8 ? 'warn' : 'ok', currency })
const provider = (id, name, kind, currency, extra = {}) => ({
  id, name, kind, currency, canSubscribe: id === 'zhipu' || id === 'moonshot',
  usage: { todayTokens: 12_000, monthTokens: 1_280_000, todayCost: 0.04, monthCost: 12.34, requests: 12 },
  ...extra,
})
const apiProviders = [
  provider('deepseek-official', 'DeepSeek', 'api', 'CNY', { budget: budget(100, 'CNY', 12.34, 0.1234), balance: { amount: 49.86, status: 'ok', currency: 'CNY', updatedAt: now } }),
  provider('openrouter', 'OpenRouter', 'api', 'USD', { budget: budget(50, 'USD', 19, 0.38), balance: { amount: 7.66, status: 'ok', currency: 'USD', updatedAt: now } }),
]
const subProviders = [
  provider('zhipu', 'GLM Coding', 'subscription', 'CNY', { windows: [{ key: '5h', usedPercent: 42.5, resetAt: now + 3600_000 }, { key: 'week', usedPercent: 18.2, resetAt: now + 3600_000 }] }),
  provider('moonshot', 'Kimi Coding', 'subscription', 'CNY', { windows: [{ key: '5h', usedPercent: 30, resetAt: now + 3600_000 }, { key: 'week', usedPercent: 12, resetAt: now + 3600_000 }] }),
]
const pricingLinks = [
  { id: 'deepseek-official', label: 'DeepSeek', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
  { id: 'zhipu', label: '智谱 AI', url: 'https://docs.bigmodel.cn/cn/guide/start/pricing' },
  { id: 'moonshot', label: 'Kimi', url: 'https://platform.moonshot.cn/docs/pricing/chat' },
  { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/models' },
  { id: 'qwen', label: '通义千问', url: 'https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio' },
]
const model = (providerId, providerName, modelId, displayName, kind, currency, cost) => ({
  providerId, providerName, modelId, displayName, kind, currency, cost, priced: true,
  requests: 12, input: 100_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000,
  tokens: { input: 100_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000, total: 320_000 },
  hitRate: 200 / 300,
})
const models = [
  model('deepseek-official', 'DeepSeek', 'deepseek-flash', 'DeepSeek-V4.1-Flash', 'api', 'CNY', 12.34),
  model('openrouter', 'OpenRouter', 'deepseek-flash', 'DeepSeek-V4.1-Flash', 'api', 'USD', 4.68),
  model('zhipu', 'GLM Coding', 'glm-5.3', 'GLM-5.3', 'subscription', 'CNY', 0),
  model('moonshot', 'Kimi Coding', 'kimi-k3', 'Kimi K3', 'subscription', 'CNY', 0),
]
let currentSummary = {
  providers: [...apiProviders, ...subProviders],
  breakdown: { models },
  pricingLinks,
  catalog: { version: 1, updatedAt: '2026-11-02', source: 'community-gitee' },
  showBalance: true,
  version: '1.0.7',
  refreshMs: 60000,
  currentProviderId: 'deepseek-official',
  updatedAt: now,
  stale: false,
}
const usageFor = (range) => ({
  range,
  startAt: now - 86400000,
  endAt: now,
  totals: {
    CNY: { cost: 12.34, requests: 12, input: 100_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000, hitRate: 200 / 300 },
    USD: { cost: 4.68, requests: 12, input: 100_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000, hitRate: 200 / 300 },
  },
  models,
})
let failSummary = false
let failUsage = false
const env = { ...process.env, DSH_HOME: home }
let server
let browser
try {
  run(['plugin', '--profile', 'web', 'add', `link:${root}`], env)
  mkdirSync(join(tmpRoot, 'e2e'), { recursive: true })
  const dataDir = join(home, 'dsh-token-dash')
  mkdirSync(dataDir, { recursive: true })
  server = startWeb(env)
  const { base, token } = await server.ready
  console.log(`[e2e] web ${base}`)

  // L2: real /usage contract with empty state.
  const usageResponse = await fetch(`${base}/token-dash/api/usage?range=7d`)
  assert.equal(usageResponse.status, 200)
  const usageData = (await usageResponse.json()).data
  assert.equal(usageData.range, '7d')
  assert.ok(usageData.totals !== undefined)
  assert.ok(Array.isArray(usageData.models))
  assert.equal((await fetch(`${base}/token-dash/api/usage?range=bad`)).status, 400)

  // Seed prefs used by P3.
  const prefsResponse = await fetch(`${base}/token-dash/api/prefs`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ budgets: { 'deepseek-official': { amount: 100, currency: 'CNY' }, openrouter: { amount: 50, currency: 'USD' } }, billingModes: { zhipu: 'subscription', moonshot: 'subscription' } }),
  })
  assert.equal(prefsResponse.status, 200)

  const executablePath = resolveChromium()
  browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.route('**/token-dash/api/summary*', async (route) => {
    if (failSummary) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'mock-summary' }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: currentSummary }) })
  })
  await page.route('**/token-dash/api/usage*', async (route) => {
    const range = new URL(route.request().url()).searchParams.get('range') ?? 'today'
    if (failUsage) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'mock-usage' }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: usageFor(range) }) })
  })
  await page.route('**/token-dash/api/update', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { published: true, hasUpdate: false, latest: '1.0.7', current: '1.0.7' } }) }))
  await page.route('**/open-in-app/open', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))
  await page.route('**/token-dash/api/logs/export*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { content: '{"type":"header"}\n' } }) }))

  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    for (let round = 0; round < 4; round += 1) {
      const buttons = [...document.querySelectorAll('[role=presentation] button')]
      const next = buttons.find((button) => /继续|跳过|稍后|关闭/.test(button.textContent ?? ''))
      if (next === undefined) break
      next.click()
    }
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[role=presentation]')) node.remove()
  })
  await page.waitForTimeout(200)

  const pill = page.locator('[data-testid=token-dash-pill]')
  await pill.waitFor({ timeout: 20000 })
  assert.ok(await pill.isVisible())
  assert.match(await pill.innerText(), /\[API\]/)
  assert.match(await pill.innerText(), /¥49\.86/)

  const jsClick = (locator) => locator.evaluate((node) => node.click())
  const openPanel = async () => {
    if (await page.locator('[data-testid=token-dash-panel]').count() === 0) await jsClick(pill)
    await page.locator('[data-testid=token-dash-panel]').waitFor({ timeout: 8000 })
    await page.waitForTimeout(200)
  }
  const panel = page.locator('[data-testid=token-dash-panel]')
  await openPanel()
  await page.screenshot({ path: join(tmpRoot, 'e2e', 'p2-fresh.png'), fullPage: true })
  assert.match(await panel.innerText(), /本月预算（已检测 2）/)
  assert.match(await panel.innerText(), /订阅套餐（账户级，已检测 2）/)
  assert.match(await panel.innerText(), /¥12\.34\/¥100\.00/)
  assert.match(await panel.innerText(), /余额 ¥49\.86/)
  assert.match(await panel.innerText(), /DeepSeek-V4\.1-Flash/)
  assert.match(await panel.innerText(), /Tokens 320k/)
  assert.match(await panel.innerText(), /请求 12/)
  assert.match(await panel.innerText(), /命中 /)

  // P2 info tooltip and segment capsules.
  const info = panel.getByRole('button', { name: '查看支持的 API Key 范围' })
  await jsClick(info)
  await page.waitForTimeout(100)
  await page.waitForTimeout(100)
  assert.match(await panel.innerText(), /目前支持 DeepSeek \/ Kimi \/ GLM \/ OpenRouter \/ Qwen API Key/)
  assert.equal(await panel.getByRole('tab').count(), 6) // 2 tabs + 4 range items

  // P2 range and detail.
  await jsClick(panel.getByRole('tab', { name: '近7天' }))
  await page.waitForTimeout(200)
  assert.match(await panel.innerText(), /真实 Tokens/)
  assert.match(await panel.innerText(), /近7天/)
  assert.equal(await page.locator('[data-testid=token-dash-api-row-deepseek-official]').count(), 1)
  assert.equal(await page.locator('[data-testid=token-dash-sub-row-zhipu]').count(), 1)

  // P3 structure and no legacy controls.
  await jsClick(panel.getByRole('tab', { name: '设置' }))
  await page.waitForTimeout(300)
  const settings = page.locator('[data-testid=token-dash-settings]')
  await settings.waitFor({ timeout: 8000 })
  assert.match(await settings.innerText(), /API 计费（已检测 2）/)
  assert.match(await settings.innerText(), /订阅（已检测 2）/)
  assert.match(await settings.innerText(), /显示/)
  assert.match(await settings.innerText(), /日志/)
  assert.match(await settings.innerText(), /价格与版本/)
  assert.ok(!(await settings.innerText()).includes('诊断'))
  assert.ok(!(await settings.innerText()).includes('清空日志'))
  assert.ok(!(await settings.innerText()).includes('本月 Token'))
  assert.equal(await settings.locator('select').count(), 0)
  assert.equal(await panel.getByRole('button', { name: '查看支持的 API Key 范围' }).count(), 0)
  await page.screenshot({ path: join(tmpRoot, 'e2e', 'p3-v2.png'), fullPage: true })
  assert.equal(await settings.getByRole('link').count(), 5)

  // Price links share a row.
  const linkBoxes = await settings.getByRole('link').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top))
  assert.ok(Math.max(...linkBoxes) - Math.min(...linkBoxes) < 2, 'price links should share one row')

  // Budget valid/invalid.
  const budgetInput = settings.getByTestId('token-dash-budget-input-deepseek-official')
  const setBudget = (value) => budgetInput.evaluate((node, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(node, next)
    node.dispatchEvent(new Event('input', { bubbles: true }))
    node.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  }, value)
  await setBudget('200.50')
  await page.waitForTimeout(500)
  const savedPrefs = (await (await fetch(`${base}/token-dash/api/prefs`)).json()).data
  assert.equal(savedPrefs.budgets['deepseek-official'].amount, 200.5)
  await setBudget('-1')
  await page.waitForTimeout(300)
  assert.match(await settings.innerText(), /请输入 0 或正数/)
  const invalidPrefs = (await (await fetch(`${base}/token-dash/api/prefs`)).json()).data
  assert.equal(invalidPrefs.budgets['deepseek-official'].amount, 200.5)

  // Logs and update icon.
  await jsClick(settings.getByTestId('token-dash-log-open'))
  await page.waitForTimeout(200)
  assert.match(await settings.innerText(), /已打开日志文件夹|无法打开，已复制路径/)
  await jsClick(settings.getByTestId('token-dash-log-export'))
  await page.waitForTimeout(200)
  assert.equal(await settings.getByTestId('token-dash-update').count(), 1)

  // Back to usage, range is retained.
  await jsClick(panel.getByRole('tab', { name: '用量' }))
  await page.waitForTimeout(200)
  assert.match(await panel.innerText(), /近7天/)

  // Error states and empty provider.
  failSummary = true
  await jsClick(panel.getByTestId('token-dash-refresh'))
  await page.waitForTimeout(300)
  assert.match(await panel.innerText(), /刷新失败，保留上次数据/)
  failSummary = false
  await jsClick(panel.getByTestId('token-dash-refresh'))
  await page.waitForTimeout(300)
  failUsage = true
  await jsClick(panel.getByRole('tab', { name: '当天' }))
  await page.waitForTimeout(300)
  assert.match(await panel.innerText(), /范围数据加载失败/)
  failUsage = false
  currentSummary = { ...currentSummary, providers: [], updatedAt: now - 300000 }
  await jsClick(panel.getByTestId('token-dash-refresh'))
  await page.waitForTimeout(300)
  assert.match(await panel.innerText(), /未检测到已配置供应商/)
  assert.match(await pill.innerText(), /--/)
  assert.equal(await page.locator('[data-testid=token-dash-refresh] span').count(), 1)

  // Dark theme token check.
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', '1'))
  await page.waitForTimeout(80)
  const darkTabBg = await panel.getByRole('tab', { name: '用量' }).evaluate((node) => getComputedStyle(node).backgroundColor)
  assert.notEqual(darkTabBg, 'rgb(255, 255, 255)')
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))

  // Responsive viewport.
  await page.setViewportSize({ width: 360, height: 800 })
  await page.waitForTimeout(200)
  const box = await panel.boundingBox()
  assert.ok(box.width <= 344, `panel width ${box.width} should clamp to viewport`)
  assert.ok(box.x >= 0 && box.x + box.width <= 360, `panel bounds ${box.x}+${box.width} should fit viewport`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.equal(overflow, 0)

  await page.screenshot({ path: join(tmpRoot, 'e2e', 'ui-v2.png'), fullPage: true })
  console.log('[e2e] UI assertions passed')
} finally {
  await browser?.close().catch(() => {})
  stopTree(server?.child)
  if (!keep) rmSync(home, { recursive: true, force: true })
}
