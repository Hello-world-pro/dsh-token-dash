/**
 * L2 + L3 E2E：临时 DSH_HOME + web profile，起 dsh web，验证路由与页面。
 * 用法：node scripts/e2e.mjs [--keep]
 */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
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
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? cachedChromium,
  })
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

  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: /设置/ }).click()
  const settings = page.locator('[data-testid=token-dash-settings]')
  if ((await settings.count()) === 0) {
    await page.locator('span', { hasText: 'Token 看板' }).last().click({ force: true })
  }
  await settings.waitFor({ timeout: 8000 })
  assert.match(await settings.innerText(), /月度预算/)

  mkdirSync(join(tmpRoot, 'e2e'), { recursive: true })
  await page.screenshot({ path: join(tmpRoot, 'e2e', 'ui.png'), fullPage: true })
  await browser.close()
  stopTree(server.child)
  console.log('[e2e] pass')
} finally {
  if (server !== undefined) stopTree(server.child)
  if (!keep) rmSync(home, { recursive: true, force: true })
}
