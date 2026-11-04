/**
 * dsh-token-dash — host half: collect, aggregate, pricing, adapters and routes.
 */
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { buildSummary, buildUsage, emptyState, localMonthKey, num, repriceState, stampProviderKinds } from './src/core.js'
import { ingest, backfill } from './src/collect.js'
import { REFRESH_OPTIONS, createFlusher, dataDir, loadPrefs, loadState, logsDir, recoverState, resolveHome, saveJson, saveMonths } from './src/store.js'
import { buildExport, mergeImportDays, validateBundle } from './src/backup.js'
import { logAdapterEvents, logAdapterFailures, readProviders, readSubscriptions } from './src/adapters.js'
import { PROVIDER_SOURCES } from './src/quota-sources.js'
import { catalogInfo, loadCommunityPricing, loadRouterPricing } from './src/pricing.js'
import { clearLog, createLogger, exportLog } from './src/diagnostics.js'
import { isNewer } from './src/version.js'

export const name = 'dsh-token-dash'

const ROUTE_PREFIX = '/token-dash/api'
const CURRENT_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])
let updateCache = { at: 0, data: null }

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

/** Installed version of this plugin inside a DSH profile; null when the manifest is unreadable. */
function installedVersion(home, profile) {
  try {
    const file = join(home, 'profiles', profile, 'node_modules', 'dsh-token-dash', 'package.json')
    return JSON.parse(readFileSync(file, 'utf8')).version ?? null
  } catch {
    return null
  }
}

/** Ask the npm registry for the published latest; 404 means the package is not published yet. */
async function fetchLatest() {
  const response = await fetch('https://registry.npmjs.org/dsh-token-dash/latest', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  })
  if (response.status === 404) return { current: CURRENT_VERSION, latest: null, hasUpdate: false, published: false }
  if (!response.ok) throw new Error(`registry-${response.status}`)
  const meta = await response.json()
  if (typeof meta?.version !== 'string') throw new Error('invalid-registry-response')
  return { current: CURRENT_VERSION, latest: meta.version, hasUpdate: isNewer(meta.version, CURRENT_VERSION), published: true }
}

/** Run `dsh plugin --profile <p> add dsh-token-dash@<version> --save-exact`; resolves with { ok, reason?, command, output }. */
function runPluginUpdate(profile, version) {
  return new Promise((resolve) => {
    const spec = `dsh-token-dash@${version}`
    const command = `dsh plugin --profile ${profile} add ${spec} --save-exact`
    const cli = findDshCli()
    if (cli === null) {
      resolve({ ok: false, reason: 'cli-not-found', command, output: '' })
      return
    }
    const child = spawn(process.execPath, ['--expose-internals', cli, 'plugin', '--profile', profile, 'add', spec, '--save-exact'], {
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
    budgets: { ...(base.budgets ?? {}) },
    billingModes: { ...(base.billingModes ?? {}) },
    refreshMs: base.refreshMs,
    showBalance: base.showBalance,
  }
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
    if (!REFRESH_OPTIONS.includes(refresh)) throw new Error('invalid-refresh')
    prefs.refreshMs = refresh
  }
  if (input?.showBalance !== undefined) prefs.showBalance = input.showBalance === true
  return prefs
}

function isLoopbackRequest(req) {
  const remote = String(req.socket?.remoteAddress ?? '')
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false
  const host = String(req.headers?.host ?? '').replace(/:\d+$/, '')
  if (!LOOPBACK_HOSTS.has(host)) return false
  const origin = req.headers?.origin
  if (origin === undefined) return true
  try {
    const url = new URL(origin)
    return LOOPBACK_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export function apply(ctx) {
  const dir = dataDir(ctx)
  const logDir = logsDir(ctx)
  const logger = createLogger({ dir: logDir, version: CURRENT_VERSION, dshVersion: '0.2.1-rc.5' })
  let prefs
  let state
  let providerCache = new Map()
  let providerCacheMeta = { at: 0, hadProviders: false, degraded: false }
  const cacheData = () => [...providerCache.values()].map((entry) => entry.data).filter((item) => item !== null && item !== undefined)
  const clearProviderCache = () => {
    providerCache.clear()
    providerCacheMeta = { at: 0, hadProviders: false, degraded: false }
  }
  const ready = Promise.all([loadState(dir, logger), loadPrefs(dir, logger)]).then(([loadedState, loadedPrefs]) => {
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
        const local = createFlusher(dir, state, 2000, logger)
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

  // 价格表必须先于重算就绪：社区表加载失败时回退已对齐官方价的内置目录。
  const pricingReady = ready.then(async () => {
    await Promise.allSettled([
      loadCommunityPricing()
        .then((info) => logger.info('pricing', 'catalog.loaded', info))
        .catch((error) => logger.warn('pricing', 'catalog.fail', { message: String(error?.message ?? error) })),
      loadRouterPricing()
        .then((ok) => logger.info('pricing', 'router.loaded', { ok }))
        .catch((error) => logger.warn('pricing', 'router.fail', { message: String(error?.message ?? error) })),
    ])
  })

  ctx.inject(['sessionPersistence'], (scoped) => {
    ready
      .then(async () => {
        // 等价格表（最多 5s）再重算，避免用旧内置价把历史成本写死
        await Promise.race([
          pricingReady,
          new Promise((resolve) => {
            const timer = setTimeout(resolve, 5000)
            timer.unref?.()
          }),
        ])
        // 不丢聚合：先并回 1.0.3 迁移备份，再按日级 token 重算旧计价成本
        const recovery = await recoverState(dir, state, logger)
        const repriced = repriceState(state)
        if (repriced.repriced) logger.info('boot', 'state.reprice', { rows: repriced.rows, recovered: recovery.recovered })
        const result = await backfill(scoped, state)
        if (flushReady === undefined) {
          await saveJson(dir, 'daily.json', state)
          await saveMonths(dir, state)
        } else {
          await flushReady.flush()
        }
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
    const refreshProviderCache = async () => {
      const data = await readProviders(scoped, prefs, providerCache)
      const hadProviders = providerCacheMeta.hadProviders === true || data.length > 0
      providerCacheMeta = {
        at: Date.now(),
        hadProviders,
        degraded: data.length === 0 && hadProviders,
      }
      if (data.length === 0) {
        logger.warn('provider', 'probe.miss', {
          misses: data.misses ?? [],
          credentials: scoped.get?.('credentials') !== undefined,
          account: scoped.get?.('deepseekAccount') !== undefined,
        })
      }
      logAdapterEvents(logger, data)
      logAdapterFailures(logger, data.failures)
      logger.debug('provider', 'cache.state', { entries: providerCache.size, providers: data.length, misses: (data.misses ?? []).length })
      if (stampProviderKinds(state, data)) {
        logger.info('provider', 'kind.stamp', { ids: Object.keys(state.providerKinds) })
        flusher.schedule()
      }
    }
    const off = webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (!isLoopbackRequest(req)) {
          let rejection
          try {
            rejection = await scoped.get?.('connection')?.requestRejection?.(req)
          } catch {
            rejection = undefined
          }
          if (rejection !== undefined && rejection !== null) {
            logger.warn('route', 'forbidden', { method: req.method, path: url.pathname, source: 'requestRejection' })
            return rejection
          }
          logger.warn('route', 'forbidden', { method: req.method, path: url.pathname, source: 'loopback' })
          json(res, 403, { ok: false, reason: 'forbidden' })
          return
        }
        try {
          await ready
          if (url.pathname === `${ROUTE_PREFIX}/summary` && req.method === 'GET') {
            if (Date.now() - providerCacheMeta.at > 5000) await refreshProviderCache()
            const summary = buildSummary(state, prefs, Date.now(), cacheData())
            summary.version = CURRENT_VERSION
            summary.refreshMs = prefs.refreshMs
            summary.providersDegraded = providerCacheMeta.degraded === true
            summary.catalog = catalogInfo()
            logger.info('vm', 'build', { providers: summary.providers.length, api: summary.providers.filter((item) => item.kind === 'api').length, subscription: summary.providers.filter((item) => item.kind === 'subscription').length })
            json(res, 200, { ok: true, data: summary })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/usage` && req.method === 'GET') {
            const range = url.searchParams.get('range') ?? 'today'
            if (!['today', '7d', '30d', 'all'].includes(range)) {
              json(res, 400, { ok: false, reason: 'invalid-range' })
              return
            }
            if (Date.now() - providerCacheMeta.at > 5000) await refreshProviderCache()
            const usage = buildUsage(state, prefs, range, Date.now(), cacheData())
            logger.info('vm', 'usage', {
              range,
              models: usage.models.length,
              billable: usage.models.filter((item) => item.billable === true).length,
              tokens: usage.total.tokens,
              currencies: Object.keys(usage.totals).length,
            })
            json(res, 200, { ok: true, data: usage })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/providers/refresh` && req.method === 'POST') {
            // 仅重查订阅 provider 配额（GLM / Kimi Coding），绕过 TTL 缓存；无 Key 的订阅 provider 从缓存移除。
            const subs = await readSubscriptions(scoped, prefs)
            for (const source of PROVIDER_SOURCES) {
              if (source.kind === 'subscription') providerCache.delete(source.id)
            }
            for (const item of subs) {
              providerCache.set(item.id, { at: Date.now(), ok: true, data: item, promise: null })
            }
            providerCacheMeta = { at: Date.now(), hadProviders: true, degraded: false }
            if (stampProviderKinds(state, subs)) flusher.schedule()
            logAdapterEvents(logger, subs)
            logAdapterFailures(logger, subs.failures)
            logger.info('provider', 'subscriptions.refreshed', { ids: subs.map((item) => item.id) })
            json(res, 200, { ok: true, data: { refreshed: subs.map((item) => item.id) } })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/export` && req.method === 'GET') {
            const data = buildExport(state, prefs, Date.now(), cacheData())
            logger.info('data', 'export', { month: data.month, days: Object.keys(data.days).length, models: data.usage.all.models.length })
            json(res, 200, { ok: true, data })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/import` && req.method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}')
            const checked = validateBundle(body)
            if (checked.ok !== true) {
              logger.warn('data', 'import.reject', { reason: checked.reason })
              json(res, 400, { ok: false, reason: checked.reason })
              return
            }
            const { bundle } = checked
            const stamp = Date.now()
            // 覆盖前留一份可回滚的现场
            await saveJson(dir, `prefs.json.import-backup-${stamp}`, prefs)
            await saveJson(dir, `daily.json.import-backup-${stamp}`, state)
            prefs = normalizePrefs(bundle.prefs ?? {}, prefs)
            state.days = mergeImportDays(state.days, bundle.month, bundle.days)
            state.providerKinds = { ...(state.providerKinds ?? {}), ...(bundle.providerKinds ?? {}) }
            clearProviderCache()
            flusher.schedule()
            logger.info('data', 'import', {
              month: bundle.month,
              days: Object.keys(bundle.days).length,
              backup: `daily.json.import-backup-${stamp}`,
            })
            json(res, 200, {
              ok: true,
              data: {
                month: bundle.month,
                days: Object.keys(bundle.days).length,
                backup: `daily.json.import-backup-${stamp}`,
              },
            })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/log` && req.method === 'POST') {
            // #46：client 端 slot 挂载上报落盘——模块白名单仅 slot，防日志注入
            const body = JSON.parse((await readBody(req)) || '{}')
            if (body?.module !== 'slot' || typeof body?.event !== 'string') {
              json(res, 400, { ok: false, reason: 'invalid-log' })
              return
            }
            logger.info('slot', body.event, typeof body.meta === 'object' && body.meta !== null ? body.meta : {})
            json(res, 200, { ok: true, data: { logged: true } })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/update/install` && req.method === 'POST') {
            const profile = typeof process.env.DSH_PROFILE === 'string' && process.env.DSH_PROFILE !== '' ? process.env.DSH_PROFILE : 'desktop'
            const latest = (await fetchLatest()).latest
            if (latest === null) {
              logger.info('update', 'install.fail', { profile, reason: 'unpublished' })
              json(res, 200, { ok: false, reason: 'unpublished', data: { reason: 'unpublished', command: '' } })
              return
            }
            if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(latest) === false) throw new Error('invalid-latest-version')
            const home = resolveHome(scoped)
            const from = installedVersion(home, profile) ?? CURRENT_VERSION
            const result = await runPluginUpdate(profile, latest)
            const to = installedVersion(home, profile)
            const changed = to === latest
            const ok = result.ok === true && changed
            const failReason = result.ok === true ? 'version-unchanged' : result.reason ?? 'install-failed'
            logger.info('update', ok ? 'install.ok' : 'install.fail', {
              profile,
              from,
              to,
              reason: ok ? null : failReason,
              ...(ok ? {} : { output: String(result.output ?? '').slice(-500) }),
            })
            updateCache = { at: 0, data: null }
            json(res, 200, {
              ok,
              data: { ...result, from, to, latest, ...(ok ? {} : { reason: failReason }) },
              ...(ok ? {} : { reason: failReason }),
            })
            return
          }
          if (url.pathname === `${ROUTE_PREFIX}/update` && req.method === 'GET') {
            if (updateCache.data !== null && Date.now() - updateCache.at < 300000) {
              json(res, 200, { ok: true, data: updateCache.data })
              return
            }
            const data = await fetchLatest()
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
            clearProviderCache()
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
          logger.error('route', 'failed', { method: req.method, path: url.pathname, message: error instanceof Error ? error.message : String(error) })
          json(res, 400, { ok: false, reason: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    return off
  })
}
