import { addRecord, num } from './core.js'

const USAGE_TYPES = new Set(['assistant/message', 'compaction/summary'])

export function recordFromEvent(event) {
  if (event === null || typeof event !== 'object') return undefined
  if (!USAGE_TYPES.has(event.type)) return undefined
  const usage = event.data?.usage
  if (usage === null || typeof usage !== 'object') return undefined
  const source = event.data?.message?.source ?? event.data ?? {}
  return {
    ts: num(event.time) || Date.now(),
    sessionId: '',
    model: source.model ?? '',
    input: num(usage.inputTokens),
    cacheRead: num(usage.cacheReadTokens),
    cacheWrite: num(usage.cacheWriteTokens),
    output: num(usage.outputTokens),
  }
}

/** 入账一条事件；返回记录或 undefined。 */
export function ingest(state, sessionId, event, seedFloor = 0) {
  const seq = num(event?.seq)
  const mark = num(state.watermarks[sessionId])
  if (seq > 0 && seq <= mark) return undefined
  if (seq > 0 && seq < num(seedFloor)) return undefined
  const record = recordFromEvent(event)
  if (record === undefined) {
    if (seq > 0) state.watermarks[sessionId] = seq
    return undefined
  }
  record.sessionId = sessionId
  addRecord(state, record)
  if (seq > 0) state.watermarks[sessionId] = seq
  return record
}

export async function backfill(ctx, state) {
  const persistence = ctx.get?.('sessionPersistence')
  if (persistence === undefined || typeof persistence.list !== 'function') {
    return { sessions: 0, records: 0, degraded: 'no-session-persistence' }
  }
  let sessions = 0
  let records = 0
  const list = await persistence.list()
  for (const header of Array.isArray(list) ? list : []) {
    const id = header?.id
    if (typeof id !== 'string' || id === '') continue
    sessions += 1
    let handle
    try {
      handle = await persistence.open(id, 'read')
      const events = await handle.read(0, Number.MAX_SAFE_INTEGER)
      const seed = num(header.seedLength) || num(handle.inheritedEventCount)
      for (const event of Array.isArray(events) ? events : []) {
        if (ingest(state, id, event, seed) !== undefined) records += 1
      }
    } catch {
      // 单个会话失败不影响其余会话
    } finally {
      try {
        await handle?.close?.()
      } catch {
        // ignore
      }
    }
  }
  return { sessions, records, degraded: null }
}
