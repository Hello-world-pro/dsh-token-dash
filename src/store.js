import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { emptyState } from './core.js'

export const DEFAULT_PREFS = {
  version: 1,
  budget: { amount: 3500, currency: 'CNY' },
  refreshMs: 60000,
  showBalance: true,
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

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    try {
      await rename(file, `${file}.corrupt-${Date.now()}`)
    } catch {
      // ignore
    }
    return fallback
  }
}

export async function loadState(dir) {
  await mkdir(dir, { recursive: true })
  const state = await readJson(join(dir, 'daily.json'), emptyState())
  if (state?.version !== 1 || typeof state.days !== 'object') return emptyState()
  state.watermarks ??= {}
  return state
}

export async function loadPrefs(dir) {
  const prefs = await readJson(join(dir, 'prefs.json'), DEFAULT_PREFS)
  return {
    ...DEFAULT_PREFS,
    ...prefs,
    budget: { ...DEFAULT_PREFS.budget, ...(prefs?.budget ?? {}) },
  }
}

export async function saveJson(dir, name, value) {
  await mkdir(dir, { recursive: true })
  const file = join(dir, name)
  const tmp = `${file}.tmp-${process.pid}`
  await writeFile(tmp, JSON.stringify(value), 'utf8')
  await rename(tmp, file)
}

export function createFlusher(dir, state, delay = 2000) {
  let timer
  let saving
  const flush = async () => {
    if (saving !== undefined) return saving
    saving = saveJson(dir, 'daily.json', state).finally(() => {
      saving = undefined
    })
    return saving
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      flush().catch(() => {})
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
