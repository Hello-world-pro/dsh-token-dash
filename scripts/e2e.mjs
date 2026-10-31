/**
 * L2 + L3 E2E: temporary DSH_HOME + web profile, API assertions and Playwright UI.
 * Usage: node scripts/e2e.mjs [--keep]
 */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve('.')
const keep = process.argv.includes('--keep')
const tmpRoot = join(root, '.tmp')
const home = join(tmpRoot, `e2e-home-${Date.now()}`)
const appRoot = 'C:\\Users\\Admin\\AppData\\Local\\Programs\\DeepSeek Harness'
const exe = `${appRoot}\\DeepSeek Harness.exe`
const cliJs = `${appRoot}\\resources\\app.asar\\dsh\\node_modules\\@deepseek-ai\\dsh-desktop-host\\lib\\cli.js`
mkdirSync(home, { recursive: true })

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
function stopTree(child) {
  if (child?.pid === undefined) return
  try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { child.kill() }
}

const now = Date.now()
const provider = (id, name, kind, currency, budget, plans = [], balance = null) => ({
  id, name, kind, currency,
  usage: { todayTokens: 12_000, monthTokens: 1_280_000, todayCost: id === 'openrouter' ? 0.12 : 0.04, monthCost: id === 'openrouter' ? 4.68 : 12.34, requests: 12 },
  ...(budget === null ? {} : { budget }),
  ...(balance === null ? {} : { balance }),
  ...(plans.length === 0 ? {} : { plans }),
})
const apiBudget = (amount, currency, used, percent) => ({ amount, used, remaining: Math.max(0, amount - used), percent, state: percent >= 1 ? 'over' : percent >= 0.8 ? 'warn' : 'ok', currency })
const model = (providerId, providerName, modelId, displayName, kind, currency, cost, priced = true) => ({
  name: modelId, modelId, providerId, providerName, displayName, kind, currency, priced,
  requests: 12, input: 100_000, cacheRead: 200_000, cacheWrite: 0, output: 20_000,
  tokens: { input: 100_000, cacheRead: 200_000, output: 20_000, total: 320_000 },
  hitRate: 200 / 300, cost, share: 0,
})
const baseProviders = [
  provider('deepseek-official', 'DeepSeek 官方', 'api', 'CNY', apiBudget(100, 'CNY', 12.34, 0.1234), [], { amount: 49.86, status: 'ok', currency: 'CNY', updatedAt: now }),
  provider('openrouter', 'OpenRouter', 'api', 'USD', apiBudget(50, 'USD', 19, 0.38), [], { amount: 7.66, status: 'ok', currency: 'USD', updatedAt: now }),
  provider('zhipu', '智谱 AI', 'subscription', 'CNY', null, [{ key: '5h', usedPercent: 42.5, resetAt: now }, { key: 'week', usedPercent: 18.2, resetAt: now }]),
  provider('moonshot', 'Kimi', 'subscription', 'CNY', null, [{ key: '5h', usedPercent: 30, resetAt: now }, { key: 'week', usedPercent: 12, resetAt: now }]),
]
const baseModels = [
  model('deepseek-official', 'DeepSeek 官方', 'deepseek-flash', 'DeepSeek-V4.1-Flash', 'api', 'CNY', 12.34),
  model('openrouter', 'OpenRouter', 'deepseek-flash', 'DeepSeek-V4.1-Flash', 'api', 'USD', 4.68),
  model('zhipu', '智谱 AI', 'glm-5.3', 'GLM-5.3', 'subscription', 'CNY', 0),
  model('moonshot', 'Kimi', 'kimi-k3', 'Kimi K3', 'subscription', 'CNY', 0),
]
const baseSummary = { providers: baseProviders, breakdown: { models: baseModels }, showBalance: true, showMonthTokens: true, currentProviderId: 'deepseek-official', updatedAt: now, stale: false }

const env = { ...process.env, DSH_HOME: home }
let server
let browser

function summaryOf(providers, models = baseModels, currentProviderId = providers[0]?.id ?? null) {
  return { ...baseSummary, providers, breakdown: { models }, currentProviderId }
}

try {
  run(['plugin', '--profile', 'web', 'add', `link:${root}`], env)
  server = startWeb(env)
  const { base, token } = await server.ready
  console.log(`[e2e] web ${base}`)

  // L2: host contract
  let response = await fetch(`${base}/token-dash/api/summary`)
  assert.equal(response.status, 200)
  const initial = (await response.json()).data
  assert.ok(Array.isArray(initial.providers))
  assert.ok(Array.isArray(initial.breakdown.models))
  assert.equal(typeof initial.cost.currency, 'string')

  const prefs = (await (await fetch(`${base}/token-dash/api/prefs`)).json()).data
  assert.ok(prefs.budgets !== undefined)
  assert.equal(prefs.budget.amount, 3500)

  const budgets = { 'deepseek-official': { amount: 100, currency: 'CNY' }, openrouter: { amount: 50, currency: 'USD' } }
  response = await fetch(`${base}/token-dash/api/prefs`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ budgets, billingModes: { zhipu: 'subscription', moonshot: 'subscription' } }),
  })
  assert.equal(response.status, 200)
  const saved = (await response.json()).data
  assert.equal(saved.budgets.openrouter.currency, 'USD')
  assert.equal(saved.billingModes.zhipu, 'subscription')

  const menu = await fetch(`${base}/token-dash/api/logs/meta`)
  assert.equal(menu.status, 200)
  assert.ok((await menu.json()).data.dir.includes('dsh-token-dash'))

  const cachedChromium = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe')
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync(cachedChromium) ? cachedChromium : undefined)
  browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    for (let round = 0; round < 4; round += 1) {
      const buttons = [...document.querySelectorAll('[role=presentation] button')]
      const next = buttons.find((button) => /继续|跳过|稍后|关闭/.test(button.textContent ?? ''))
      if (next === undefined) break
      next.click()
    }
  })
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[role=presentation]')) node.remove()
  })
  await page.waitForTimeout(200)

  const pill = page.locator('[data-testid=token-dash-pill]')
  await pill.waitFor({ timeout: 20000 })
  assert.ok(await pill.isVisible(), 'home pill visible')
  assert.match(await pill.innerText(), /\[API\]/)

  const summaryPattern = '**/token-dash/api/summary*'
  let currentSummary = baseSummary
  await page.route(summaryPattern, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: currentSummary }) })
  })

  const jsClick = (locator) => locator.evaluate((node) => node.click())
  const refresh = async () => {
    if (await page.locator('[data-testid=token-dash-panel]').count() === 0) await jsClick(pill)
    await jsClick(page.locator('[data-testid=token-dash-panel]').getByRole('button', { name: '刷新' }))
    await page.waitForFunction(() => document.querySelector('[data-testid=token-dash-panel]') !== null, null, { timeout: 5000 })
    await page.waitForTimeout(150)
  }

  await refresh()
  const panel = page.locator('[data-testid=token-dash-panel]')
  assert.match(await panel.innerText(), /API 按量（已检测 2）/)
  assert.match(await panel.innerText(), /订阅套餐（已检测 2）/)
  assert.match(await panel.innerText(), /DeepSeek 官方/)
  assert.match(await panel.innerText(), /OpenRouter/)
  assert.match(await panel.innerText(), /GLM/)
  assert.match(await panel.innerText(), /Kimi/)
  assert.match(await panel.innerText(), /API 费用明细/)
  assert.match(await panel.innerText(), /CNY 合计/)
  assert.match(await panel.innerText(), /USD 合计/)
  assert.ok(!(await panel.innerText()).includes('套餐内'))
  assert.match(await panel.innerText(), /模型用量明细/)
  assert.equal(await page.locator('[data-testid^=token-dash-api-card-]').count(), 2)
  assert.equal(await page.locator('[data-testid^=token-dash-sub-card-]').count(), 2)

  currentSummary = summaryOf(baseProviders, baseModels, 'openrouter')
  await refresh()
  assert.match(await pill.innerText(), /OpenRouter/)
  assert.match(await pill.innerText(), /\$/)

  currentSummary = summaryOf(baseProviders, baseModels, 'zhipu')
  await refresh()
  assert.match(await pill.innerText(), /\[订阅\]/)
  assert.match(await pill.innerText(), /5h 42\.5%/)
  assert.ok(!(await pill.innerText()).includes('预算'))

  currentSummary = summaryOf([baseProviders[0]], [baseModels[0]], 'deepseek-official')
  await refresh()
  assert.equal(await page.locator('[data-testid^=token-dash-api-card-]').count(), 1)
  assert.equal(await page.locator('[data-testid^=token-dash-sub-card-]').count(), 0)

  currentSummary = summaryOf([], [], null)
  await refresh()
  assert.match(await panel.innerText(), /未检测到已配置供应商/)
  assert.match(await pill.innerText(), /\[API\]/)

  currentSummary = baseSummary
  await refresh()
  await jsClick(panel.getByRole('button', { name: '设置' }))
  const settings = page.locator('[data-testid=token-dash-settings]')
  await settings.waitFor({ timeout: 8000 })
  assert.match(await settings.innerText(), /API 计费/)
  assert.match(await settings.innerText(), /订阅计费/)
  assert.match(await settings.innerText(), /查看日志/)
  assert.equal(await settings.locator('input[type=text]').count(), 2)
  assert.equal(await settings.getByRole('link').count(), 5)

  const deepseekInput = settings.locator('input[type=text]').first()
  await deepseekInput.evaluate((node) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(node, '500.50')
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await deepseekInput.evaluate((node) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(node, '500.50')
    node.dispatchEvent(new Event('input', { bubbles: true }))
    node.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
  await page.waitForTimeout(800)
  await settings.getByText('已保存').waitFor({ timeout: 8000 })
  currentSummary = summaryOf([
    { ...baseProviders[0], budget: apiBudget(500.5, 'CNY', 12.34, 0.0247) },
    baseProviders[1], baseProviders[2], baseProviders[3],
  ], baseModels, 'deepseek-official')
  await jsClick(settings.getByRole('button', { name: '← 返回' }))
  await panel.waitFor({ timeout: 8000 })
  await page.waitForFunction(() => document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('¥500.50'), null, { timeout: 8000 })
  assert.match(await panel.innerText(), /¥500\.50/)

  await jsClick(panel.getByRole('button', { name: '设置' }))
  await settings.waitFor({ timeout: 8000 })
  await page.route('**/token-dash/api/logs/export*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { file: 'x.log', content: '[TD:boot] event=start\n' } }) })
  })
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 })
  await jsClick(settings.getByTestId('token-dash-log-export'))
  await downloadPromise
  assert.match(await settings.innerText(), /日志已导出/)

  let opened = null
  await page.route('**/open-in-app/open', async (route) => {
    opened = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await jsClick(settings.getByTestId('token-dash-log-open'))
  await page.waitForTimeout(200)
  assert.equal(opened.app, 'explorer')
  assert.ok(String(opened.path).includes('dsh-token-dash'))

  await page.unroute('**/token-dash/api/summary*')
  await page.route(summaryPattern, (route) => route.fulfill({ status: 500, body: '{}' }))
  await jsClick(settings.getByRole('button', { name: '← 返回' }))
  await panel.waitFor({ timeout: 8000 })
  await jsClick(panel.getByRole('button', { name: '刷新' }))
  await page.waitForFunction(() => document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('Token 数据不可用'), null, { timeout: 5000 })

  mkdirSync(join(tmpRoot, 'e2e'), { recursive: true })
  await page.screenshot({ path: join(tmpRoot, 'e2e', 'ui.png'), fullPage: true })
  await browser.close()
  browser = undefined
  stopTree(server.child)
  server = undefined
  console.log('[e2e] pass')
} finally {
  if (browser !== undefined) await browser.close().catch(() => {})
  if (server !== undefined) stopTree(server.child)
  if (!keep) rmSync(home, { recursive: true, force: true })
}
