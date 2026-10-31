/**
 * L2 + L3 E2E：临时 DSH_HOME + web profile，起 dsh web，验证路由与页面。
 * 用法：node scripts/e2e.mjs [--keep]
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
  return execFileSync(exe, ['--expose-internals', cliJs, ...args], {
    env: nodeEnv(env),
    encoding: 'utf8',
  })
}

function startWeb(env) {
  const child = spawn(exe, ['--expose-internals', cliJs, '--profile', 'web', '--port', '0', '--no-open'], {
    env: nodeEnv(env),
    windowsHide: true,
  })
  let log = ''
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`web start timeout:\n${log}`)), 30000)
    const onData = (chunk) => {
      log += chunk.toString()
      const match = log.match(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=([^\s]+)/)
      if (match) {
        clearTimeout(timer)
        resolveReady({ base: `http://127.0.0.1:${match[1]}`, token: match[2] })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => {
      if (!log.includes('http://127.0.0.1')) reject(new Error(`web exited ${code}:\n${log}`))
    })
  })
  return { child, ready, log: () => log }
}

function stopTree(child) {
  if (child?.pid === undefined) return
  try {
    execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    child.kill()
  }
}

const env = { ...process.env, DSH_HOME: home }
let server

try {
  run(['plugin', '--profile', 'web', 'add', `link:${root}`], env)
  server = startWeb(env)
  const { base, token } = await server.ready
  console.log(`[e2e] web ${base}`)

  const summaryRes = await fetch(`${base}/token-dash/api/summary`)
  assert.equal(summaryRes.status, 200)
  const summary = await summaryRes.json()
  assert.equal(summary.ok, true)
  assert.equal(summary.data.cost.currency, 'CNY')
  assert.equal(typeof summary.data.budget.amount, 'number')
  assert.ok(Array.isArray(summary.data.breakdown.models))

  const prefsRes = await fetch(`${base}/token-dash/api/prefs`)
  assert.equal(prefsRes.status, 200)
  const prefs = (await prefsRes.json()).data
  assert.equal(prefs.budget.amount, 3500)

  const putRes = await fetch(`${base}/token-dash/api/prefs`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...prefs, budget: { amount: 1234.56 } }),
  })
  assert.equal(putRes.status, 200)
  assert.equal((await putRes.json()).data.budget.amount, 1234.56)

  const cachedChromium = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe')
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync(cachedChromium) ? cachedChromium : undefined)
  const browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '继续' }).click({ timeout: 5000 }).catch(() => {})
  const input = page.locator('[contenteditable=true]')
  await input.waitFor({ timeout: 15000 })
  await input.pressSequentially('e2e', { delay: 10 })
  await input.press('Enter')

  const pill = page.locator('[data-testid=token-dash-pill]')
  await pill.waitFor({ timeout: 20000 })
  const pillText = await pill.innerText()
  assert.match(pillText, /预算/)
  assert.match(pillText, /今日/)
  assert.match(pillText, /本月/)
  await pill.click()
  const panel = page.locator('[data-testid=token-dash-panel]')
  await panel.waitFor({ timeout: 8000 })
  assert.match(await panel.innerText(), /本月费用与额度/)
  assert.equal(await panel.getByRole('link').count(), 0)

  const now = Date.now()
  const tokens = { input: 1_000_000, cacheRead: 0, output: 1_000_000, total: 2_000_000 }
  const summaryFixture = {
    month: '2026-10',
    tokens: { ...tokens, cacheWrite: 0, hitRate: 0 },
    cost: { estimated: 24, currency: 'CNY', unpricedModels: ['openrouter:deepseek-flash'] },
    today: { tokens: 0, cost: 0, requests: 0 },
    requests: { month: 2, today: 0 },
    budget: { amount: 3500, used: 24, remaining: 3476, percent: 24 / 3500, state: 'ok' },
    breakdown: {
      models: [
        {
          name: 'deepseek-flash',
          modelId: 'deepseek-flash',
          providerId: 'deepseek-official',
          providerName: 'DeepSeek 官方',
          displayName: 'DeepSeek-V4.1-Flash',
          priced: true,
          requests: 1,
          tokens,
          hitRate: 0,
          cost: 24,
          share: 1,
        },
        {
          name: 'deepseek-flash',
          modelId: 'deepseek-flash',
          providerId: 'openrouter',
          providerName: 'OpenRouter',
          displayName: 'DeepSeek-V4.1-Flash',
          priced: false,
          requests: 1,
          tokens,
          hitRate: 0,
          cost: 0,
          share: 0,
        },
      ],
    },
    balance: { provider: 'deepseek', amount: 49.86, currency: 'CNY', status: 'ok', updatedAt: now },
    showBalance: true,
    updatedAt: now,
    stale: false,
  }

  const summaryPattern = '**/token-dash/api/summary*'
  await page.route(summaryPattern, async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 800))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: summaryFixture }),
    })
  })

  await panel.getByRole('button', { name: '刷新' }).click()
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid=token-dash-panel] button')].some((button) => button.textContent.includes('刷新中')),
    null,
    { timeout: 2000 },
  )
  await page.waitForFunction(
    () => document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('DeepSeek 官方'),
    null,
    { timeout: 8000 },
  )
  const panelWithProviders = await panel.innerText()
  assert.match(panelWithProviders, /DeepSeek 官方 \/ DeepSeek-V4\.1-Flash/)
  assert.match(panelWithProviders, /OpenRouter \/ DeepSeek-V4\.1-Flash/)
  assert.match(panelWithProviders, /未定价/)
  assert.ok(await panel.isVisible(), '刷新后浮层应保持打开')
  await page.unroute(summaryPattern)

  await page.route(summaryPattern, (route) => route.fulfill({ status: 500, body: '{}' }))
  await panel.getByRole('button', { name: '刷新' }).click()
  await page.waitForFunction(
    () => document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('Token 数据不可用'),
    null,
    { timeout: 5000 },
  )
  await page.unroute(summaryPattern)
  await panel.getByRole('button', { name: '刷新' }).click()
  await page.waitForFunction(
    () => !document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('Token 数据不可用'),
    null,
    { timeout: 5000 },
  )

  await panel.getByRole('button', { name: '设置' }).click()
  const settings = page.locator('[data-testid=token-dash-settings]')
  await settings.waitFor({ timeout: 8000 })
  await page.waitForFunction(
    () => document.querySelector('[data-testid=token-dash-settings]')?.innerText.includes('月度预算'),
    null,
    { timeout: 8000 },
  )
  assert.match(await settings.innerText(), /月度预算/)
  const budgetInput = settings.locator('input[type=text]').first()
  await budgetInput.fill('123456.78')
  await budgetInput.press('Enter')
  await page.waitForFunction(
    () => document.querySelector('[data-testid=token-dash-settings]')?.innerText.includes('已保存'),
    null,
    { timeout: 8000 },
  )
  assert.equal(await budgetInput.inputValue(), '123456.78')

  await budgetInput.fill('500.50')
  await settings.getByRole('button', { name: '← 返回' }).click()
  await panel.waitFor({ timeout: 8000 })
  await panel.getByRole('button', { name: '设置' }).click()
  await settings.waitFor({ timeout: 8000 })
  await page.waitForFunction(
    () => document.querySelector('[data-testid=token-dash-settings] input[type=text]')?.value === '500.5',
    null,
    { timeout: 8000 },
  )
  assert.equal(await settings.getByRole('button', { name: '检查更新' }).count(), 1)
  assert.equal(await settings.getByRole('button', { name: '保存' }).count(), 0)
  assert.equal(await settings.getByRole('link').count(), 3)
  assert.match(await settings.innerText(), /查看明细/)

  const toggle = settings.getByRole('switch')
  assert.equal(await toggle.getAttribute('aria-checked'), 'true')
  await toggle.click()
  await page.waitForTimeout(500)
  await settings.getByRole('button', { name: '← 返回' }).click()
  await panel.waitFor({ timeout: 8000 })
  await page.waitForFunction(
    () => !document.querySelector('[data-testid=token-dash-panel]')?.innerText.includes('余额'),
    null,
    { timeout: 8000 },
  )
  assert.ok(!(await pill.innerText()).includes('余额'), '关闭余额后 Pill 不应显示余额段')

  await panel.getByRole('button', { name: '关闭' }).click()
  await panel.waitFor({ state: 'detached', timeout: 5000 })
  assert.ok(await pill.isVisible(), '关闭后 Pill 应保留')

  mkdirSync(join(tmpRoot, 'e2e'), { recursive: true })
  await page.screenshot({ path: join(tmpRoot, 'e2e', 'ui.png'), fullPage: true })
  await browser.close()
  stopTree(server.child)
  console.log('[e2e] pass')
} finally {
  if (server !== undefined) stopTree(server.child)
  if (!keep) rmSync(home, { recursive: true, force: true })
}
