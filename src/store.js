import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { emptyState } from './core.js'

export const DEFAULT_PREFS = {
  version: 1,
  budget: { amount: 3500, currency: 'CNY' },
  budgets: {},
  billingModes: {},
  refreshMs: 60000,
  showBalance: true,
  showMonthTokens: true,
  logLevel: 'info',
}

export function resolveHome(ctx) {
  try {
    const fn = ctx.get?.('dshHomePath')
    if (typeof fn === 'function') {
      const value = fn()
      if (typeof value === 'string' && value.trim() !== '') return value
    }
  } catch {
    // fall through
  }
  const env = process.env.DSH_HOME
  if (typeof env === 'string' && env.trim() !== '') return env
  return join(homedir(), '.dsh')
}

export function dataDir(ctx) {
  return join(resolveHome(ctx), 'dsh-token-dash')
}

export function logsDir(ctx) {
  return join(resolveHome(ctx), 'logs', 'dsh-token-dash')
}

async function readJson(file, fallback, onCorrupt) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    const backup = `${file}.corrupt-${Date.now()}`
    try {
      await rename(file, backup)
    } catch {
      // ignore
    }
    // #47：损坏文件不再静默丢弃——报障时日志可还原"数据为何重置"
    if (typeof onCorrupt === 'function') onCorrupt(file, backup, error)
    return fallback
  }
}

export async function loadState(dir, logger) {
  await mkdir(dir, { recursive: true })
  const state = await readJson(join(dir, 'daily.json'), emptyState(), (file, backup) => {
    logger?.warn('boot', 'state.corrupt', { file, backup })
  })
  if (state?.version !== 1 || typeof state.days !== 'object') return emptyState()
  for (const bucket of Object.values(state.days)) {
    if (bucket === null || typeof bucket !== 'object') continue
    if (bucket.providers === undefined) {
      bucket.providers = { unknown: { models: bucket.models ?? {} } }
      delete bucket.models
    }
  }
  state.watermarks ??= {}
  state.headers ??= {}
  state.currentProvider ??= null
  return state
}

export async function loadPrefs(dir, logger) {
  const prefs = await readJson(join(dir, 'prefs.json'), DEFAULT_PREFS, (file, backup) => {
    logger?.warn('boot', 'state.corrupt', { file, backup })
  })
  return {
    ...DEFAULT_PREFS,
    ...prefs,
    budget: { ...DEFAULT_PREFS.budget, ...(prefs?.budget ?? {}) },
    budgets: { ...(prefs?.budgets ?? {}) },
    billingModes: { ...(prefs?.billingModes ?? {}) },
    logLevel: prefs?.logLevel === 'debug' ? 'debug' : 'info',
  }
}

export async function saveJson(dir, name, value) {
  await mkdir(dir, { recursive: true })
  const file = join(dir, name)
  const tmp = `${file}.tmp-${process.pid}`
  await writeFile(tmp, JSON.stringify(value), 'utf8')
  await rename(tmp, file)
}

export function createFlusher(dir, state, delay = 2000, logger) {
  let timer
  let saving
  const flush = async () => {
    if (saving !== undefined) return saving
    saving = saveJson(dir, 'daily.json', state)
      .catch((error) => {
        // #47：写盘失败不再静默——数据丢失报障的关键线索
        logger?.warn('collect', 'state.write-fail', { message: String(error?.message ?? error) })
      })
      .finally(() => {
        saving = undefined
      })
    return saving
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      void flush()
    }, delay)
    timer.unref?.()
  }
  return {
    schedule,
    flush,
    stop() {
      clearTimeout(timer)
    },
  }
}
