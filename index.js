/**
 * dsh-token-dash — host 半：采集、聚合、持久化、同源查询接口。
 */

import { buildSummary, emptyState, num } from './src/core.js'
import { ingest, backfill } from './src/collect.js'
import { createFlusher, dataDir, loadPrefs, loadState, saveJson } from './src/store.js'
import { readBalance } from './src/balance.js'

export const name = 'dsh-token-dash'

const ROUTE_PREFIX = '/token-dash/api'

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

function normalizePrefs(input, base) {
  const prefs = {
    version: 1,
    budget: { ...base.budget },
    refreshMs: base.refreshMs,
    showBalance: base.showBalance,
  }
  if (input?.budget !== undefined) {
    const amount = Number(input.budget?.amount)
    if (!Number.isFinite(amount) || amount < 0 || amount > 9999999.99) throw new Error('invalid-budget')
    prefs.budget.amount = Math.round(amount * 100) / 100
  }
  if (input?.refreshMs !== undefined) {
    const refresh = Number(input.refreshMs)
    if (![30000, 60000, 300000].includes(refresh)) throw new Error('invalid-refresh')
    prefs.refreshMs = refresh
  }
  if (input?.showBalance !== undefined) prefs.showBalance = input.showBalance === true
  return prefs
}

export function apply(ctx) {
  const dir = dataDir(ctx)
  let prefs
  let state
  const ready = Promise.all([loadState(dir), loadPrefs(dir)]).then(([loadedState, loadedPrefs]) => {
    state = loadedState ?? emptyState()
    prefs = loadedPrefs
    return { state, prefs }
  })
  const flusher = { schedule() {}, flush: async () => {}, stop() {} }
  let flushReady

  ctx.effect(() => {
    let disposed = false
    let timer
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
      timer = setTimeout(() => {}, 0)
      clearTimeout(timer)
      flushReady?.stop?.()
    }
  }, 'dsh-token-dash: store')

  // 历史回填（可选依赖）：失败只记日志，不影响实时采集。
  ctx.inject(['sessionPersistence'], (scoped) => {
    ready
      .then(async () => {
        const result = await backfill(scoped, state)
        await flushReady?.flush?.()
        if (result.degraded !== null) {
          console.warn(`[TokenDash] backfill degraded=${result.degraded}`)
        } else {
          console.info(`[TokenDash] backfill sessions=${result.sessions} records=${result.records}`)
        }
      })
      .catch((error) => console.warn(`[TokenDash] backfill-failed ${String(error)}`))
  })

  // 实时入账。
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

  // 同源只读接口 + 唯一写端点。
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
            const balance = await readBalance(scoped, prefs)
            json(res, 200, { ok: true, data: buildSummary(state, prefs, Date.now(), balance) })
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
            json(res, 200, { ok: true, data: prefs })
            return
          }
          json(res, 404, { ok: false, reason: 'not-found' })
        } catch (error) {
          json(res, 400, { ok: false, reason: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    return off
  })
}
