/**
 * dsh-token-dash — host half: collect, aggregate, pricing, adapters and routes.
 */
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { buildSummary, emptyState, num } from './src/core.js'
import { ingest, backfill } from './src/collect.js'
import { createFlusher, dataDir, loadPrefs, loadState, logsDir, saveJson } from './src/store.js'
import { readProviders, readSubscriptions } from './src/adapters.js'
import { catalogInfo, loadCommunityPricing, loadRouterPricing } from './src/pricing.js'
import { clearLog, createLogger, exportLog } from './src/diagnostics.js'

export const name = 'dsh-token-dash'

const ROUTE_PREFIX = '/token-dash/api'
const CURRENT_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const PROVIDER_TTL = 30000
let updateCache = { at: 0, data: null }

function versionParts(value) {
  return String(value).split('.').map((part) => Number.parseInt(part, 10) || 0)
}

function isNewer(latest, current) {
  const left = versionParts(latest)
  const right = versionParts(current)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

/** Locate the bundled dsh CLI (same layout scripts/e2e.mjs relies on). */
function findDshCli() {
  const fromEnv = process.env.DSH_CLI
  if (typeof fromEnv === 'string' && fromEnv !== '' && existsSync(fromEnv)) return fromEnv
  try {
    const bundled = join(dirname(process.execPath), 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js')
    if (existsSync(bundled)) return bundled
  } catch {
    // ignore
  }
  return null
}

/** Run `dsh plugin --profile <p> update dsh-token-dash`; resolves with { ok, reason?, command, output }. */
function runPluginUpdate(profile) {
  return new Promise((resolve) => {
    const command = `dsh plugin --profile ${profile} update dsh-token-dash`
    const cli = findDshCli()
    if (cli === null) {
      resolve({ ok: false, reason: 'cli-not-found', command, output: '' })
      return
    }
    const child = spawn(process.execPath, ['--expose-internals', cli, 'plugin', '--profile', profile, 'update', 'dsh-token-dash'], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
    })
    let tail = ''
    const collect = (chunk) => {
      tail = `${tail}${String(chunk)}`.slice(-2000)
    }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* ignore */ }
    }, 120000)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, reason: String(error?.message ?? error), command, output: tail })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({ ok: true, command, output: tail })
      else resolve({ ok: false, reason: `exit-${code}`, command, output: tail })
    })
  })
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'close',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let text = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      text += chunk
      if (text.length > 64 * 1024) reject(new Error('body-too-large'))
    })
    req.on('error', reject)
    req.on('end', () => resolve(text))
  })
}

function budgetPatch(raw, base) {
  if (raw === null || typeof raw !== 'object') return base
  const amount = Number(raw.amount)
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999.99) throw new Error('invalid-budget')
  return { amount: Math.round(amount * 100) / 100, currency: raw.currency === 'USD' ? 'USD' : 'CNY' }
}

function normalizePrefs(input, base) {
  const prefs = {
    version: 1,
    budget: { ...base.budget },
    budgets: { ...(base.budgets ?? {}) },
    billingModes: { ...(base.billingModes ?? {}) },
    refreshMs: base.refreshMs,
    showBalance: base.showBalance,
    showMonthTokens: base.showMonthTokens !== false,
    logLevel: base.logLevel === 'debug' ? 'debug' : 'info',
  }
  if (input?.budget !== undefined) prefs.budget = budgetPatch(input.budget, prefs.budget)
  if (input?.budgets !== undefined) {
    if (input.budgets === null || typeof input.budgets !== 'object') throw new Error('invalid-budgets')
    const next = {}
    for (const [id, value] of Object.entries(input.budgets)) {
      if (typeof id !== 'string' || id === '') continue
      next[id] = budgetPatch(value, { amount: 0, currency: 'CNY' })
    }
    prefs.budgets = next
  }
  if (input?.billingModes !== undefined) {
    if (input.billingModes === null || typeof input.billingModes !== 'object') throw new Error('invalid-modes')
    const next = {}
    for (const [id, value] of Object.entries(input.billingModes)) {
      if (value === 'api' || value === 'subscription' || value === 'hide') next[id] = value
    }
    prefs.billingModes = next
  }
  if (input?.refreshMs !== undefined) {
    const refresh = Number(input.refreshMs)
    if (![30000, 60000, 300000].includes(refresh)) throw new Error('invalid-refresh')
    prefs.refreshMs = refresh
  }
  if (input?.showBalance !== undefined) prefs.showBalance = input.showBalance === true
  if (input?.showMonthTokens !== undefined) prefs.showMonthTokens = input.showMonthTokens === true
  if (input?.logLevel !== undefined) prefs.logLevel = input.logLevel === 'debug' ? 'debug' : 'info'
  return prefs
}

export function apply(ctx) {
  const dir = dataDir(ctx)
  const logDir = logsDir(ctx)
  const logger = createLogger({ dir: logDir, version: CURRENT_VERSION, dshVersion: '0.2.1-rc.5' })
  let prefs
  let state
  let providerCache = { at: 0, data: [] }
  const ready = Promise.all([loadState(dir), loadPrefs(dir)]).then(([loadedState, loadedPrefs]) => {
    state = loadedState ?? emptyState()
    prefs = loadedPrefs
    logger.info('boot', 'start', { version: CURRENT_VERSION })
    return { state, prefs }
  })
  const flusher = { schedule() {}, flush: async () => {}, stop() {} }
  let flushReady

  ctx.effect(() => {
    let disposed = false
    ready
      .then(() => {
        if (disposed) return
        const local = createFlusher(dir, state)
        flusher.schedule = local.schedule
        flusher.flush = local.flush
        flusher.stop = local.stop
        flushReady = flusher
        flusher.flush().catch(() => {})
      })
      .catch(() => {})
    const tick = setInterval(() => {
      if (flushReady !== undefined) flushReady.flush().catch(() => {})
    }, 30000)
    tick.unref?.()
    return () => {
      disposed = true
      clearInterval(tick)
      flushReady?.stop?.()
    }
  }, 'dsh-token-dash: store')

  // Pricing refresh is best-effort and never blocks summary.
  ready.then(() => {
    void loadCommunityPricing().then((info) => logger.info('pricing', 'catalog.loaded', info)).catch(() => {})
    void loadRouterPricing().then((ok) => logger.info('pricing', 'router.loaded', { ok })).catch(() => {})
  })

  ctx.inject(['sessionPersistence'], (scoped) => {
    ready
      .then(async () => {
        const result = await backfill(scoped, state)
        await flushReady?.flush?.()
        logger.info('collect', result.degraded === null ? 'backfill.done' : 'backfill.degraded', result)
      })
      .catch((error) => logger.warn('collect', 'backfill.failed', { message: String(error) }))
  })

  ctx.on(
    'session/event',
    (session, event) => {
      if (state === undefined) return
      const sessionId = session?.id ?? session?.header?.id ?? 'live'
      const record = ingest(state, sessionId, event, num(session?.header?.seedLength))
      if (record !== undefined) flushReady?.schedule?.()
    },
    { global: true },
  )

  ctx.inject(['webServer'], (scoped) => {
    const webServer = scoped.webServer
    if (webServer === undefined) return
    const off = webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        try {
          await ready
          if (url.pathname === `${ROUTE_PREFIX}/summary` && req.method === 'GET') {
            if (Date.now() - providerCache.at > PROVIDER_TTL) {
              providerCache = { at: Date.now(), data: await readProviders(scoped, prefs) }
            }
            const summary = buildSummary(state, prefs, Date.now(), providerCache.data)
            summary.version = CURRENT_VERSION
            summary.refreshMs = prefs.refreshMs
            logger.info('vm', 'build', { providers: summary.providers.length, api: summary.providers.filter((item) => item.kind === 'api').length, subscription: summary.providers.filter((item) => item.kind === 'subscription').length })
            json(res, 200, { ok: true, data: summary })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/providers/refresh` && req.method === 'POST') {
            // 仅重查订阅 provider 配额（GLM / Kimi Coding），绕过 TTL 缓存；无 Key 的订阅 provider 从缓存移除。
            const subs = await readSubscriptions(scoped, prefs)
            const map = new Map(providerCache.data.map((item) => [item.id, item]))
            map.delete('zhipu')
            map.delete('moonshot')
            for (const item of subs) map.set(item.id, item)
            providerCache = { at: Date.now(), data: [...map.values()] }
            logger.info('provider', 'subscriptions.refreshed', { ids: subs.map((item) => item.id) })
            json(res, 200, { ok: true, data: { refreshed: subs.map((item) => item.id) } })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/update/install` && req.method === 'POST') {
            const profile = typeof process.env.DSH_PROFILE === 'string' && process.env.DSH_PROFILE !== '' ? process.env.DSH_PROFILE : 'desktop'
            const result = await runPluginUpdate(profile)
            logger.info('update', result.ok ? 'install.ok' : 'install.fail', { profile, reason: result.reason ?? null })
            json(res, 200, { ok: result.ok, data: result, ...(result.ok ? {} : { reason: 'install-failed' }) })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/update` && req.method === 'GET') {
            if (updateCache.data !== null && Date.now() - updateCache.at < 300000) {
              json(res, 200, { ok: true, data: updateCache.data })
              return
            }
            const response = await fetch('https://registry.npmjs.org/dsh-token-dash/latest', {
              headers: { accept: 'application/json' },
              signal: AbortSignal.timeout(5000),
            })
            if (response.status === 404) {
              const data = { current: CURRENT_VERSION, latest: null, hasUpdate: false, published: false }
              updateCache = { at: Date.now(), data }
              json(res, 200, { ok: true, data })
              return
            }
            if (!response.ok) throw new Error(`registry-${response.status}`)
            const meta = await response.json()
            if (typeof meta?.version !== 'string') throw new Error('invalid-registry-response')
            const data = { current: CURRENT_VERSION, latest: meta.version, hasUpdate: isNewer(meta.version, CURRENT_VERSION), published: true }
            updateCache = { at: Date.now(), data }
            json(res, 200, { ok: true, data })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/prefs` && req.method === 'GET') {
            json(res, 200, { ok: true, data: prefs })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/prefs` && req.method === 'PUT') {
            const body = JSON.parse((await readBody(req)) || '{}')
            prefs = normalizePrefs(body, prefs)
            await saveJson(dir, 'prefs.json', prefs)
            providerCache = { at: 0, data: [] }
            logger.info('boot', 'prefs.saved', { budgets: Object.keys(prefs.budgets).length, modes: Object.keys(prefs.billingModes).length })
            json(res, 200, { ok: true, data: prefs })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/logs/meta` && req.method === 'GET') {
            json(res, 200, { ok: true, data: { dir: logDir, file: logger.file } })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/logs/export` && req.method === 'GET') {
            const exported = exportLog(logDir, logger)
            logger.info('diag', 'export', { bytes: exported.bytes, redacted: exported.redacted === true })
            json(res, 200, { ok: true, data: { file: exported.file, content: exported.content } })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/logs` && req.method === 'DELETE') {
            clearLog(logDir, logger)
            logger.info('diag', 'clear', {})
            json(res, 200, { ok: true, data: { cleared: true } })
            return
          }
          json(res, 404, { ok: false, reason: 'not-found' })
        } catch (error) {
          logger.error('route', 'failed', { path: url.pathname, message: error instanceof Error ? error.message : String(error) })
          json(res, 400, { ok: false, reason: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    return off
  })
}
