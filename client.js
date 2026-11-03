/**
 * dsh-token-dash — client half. P1 constraint pill, P2 usage tab, P3 settings tab.
 * The visual contract lives in docs/ui-design.md v2.21.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dash',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useLayoutEffect, useRef, useState } = React

    const API = '/token-dash/api'
    const PKG = 'dsh-token-dash'
    const RANGES = [
      ['today', '当天'],
      ['7d', '近7天'],
      ['30d', '近30天'],
      ['all', '全部'],
    ]
    const REFRESH_OPTIONS = [[30000, '30秒'], [60000, '1分钟'], [300000, '5分钟']]
    const PRICE_LABELS = { zhipu: 'GLM', qwen: 'Qwen' }
    const SPIN_CSS = '@keyframes td-spin{to{transform:rotate(360deg)}}'
    const EN = {
      '当天': 'Today', '近7天': 'Last 7 days', '近30天': 'Last 30 days', '全部': 'All',
      '30秒': '30s', '1分钟': '1m', '5分钟': '5m',
      '社区': 'Community', '内置兜底': 'Built-in fallback',
      '查询失败': 'Query failed', '套餐查询失败': 'Quota query failed',
      '周': 'Week', '月': 'Month', '重置': 'Reset',
      '按量 API': 'Pay-as-you-go', '订阅': 'Subscription', '账户套餐': 'Account plan',
      '预算': 'Budget', '未设置': 'Not set', '今日 {value}': 'Today {value}',
      '余额 {value}': 'Balance {value}', '预算已用 {value}': 'Budget used {value}',
      '预算未设置': 'Budget not set', '收起': 'Collapse', '展开': 'Expand',
      'Token 看板': 'Token dashboard', '点击查看 Token 看板': 'Click to view Token dashboard',
      'Token 看板：{text}': 'Token dashboard: {text}', '看板页面': 'Dashboard page',
      '用量': 'Usage', '设置': 'Settings',
      '查看支持的 API Key 范围': 'View supported API Key scope',
      '目前支持 DeepSeek / Kimi / GLM / OpenRouter / Qwen API Key': 'Supports DeepSeek / Kimi / GLM / OpenRouter / Qwen API Keys',
      '刷新': 'Refresh', '关闭': 'Close',
      '未定价': 'Unpriced', '请求': 'Req', '命中': 'Hit',
      '本月预算': 'Monthly budget',
      '订阅套餐（账户级）': 'Subscription plan (account-wide)',
      '重新检测订阅配额': 'Recheck subscription quota',
      '未检测到已配置供应商': 'No configured provider detected',
      '供应商探测失败': 'Provider probe failed',
      '时间范围': 'Time range',
      '刷新失败，保留上次数据': 'Refresh failed; keeping previous data',
      '范围数据加载失败': 'Range data failed to load',
      '范围数据加载中…': 'Loading range data…', '范围内暂无消耗': 'No usage in this range',
      'Tokens 括号说明': 'Tokens bracket legend',
      'Tokens 括号顺序：输入 / 缓存（读+写）/ 输出': 'Tokens bracket order: input / cache (read+write) / output',
      '真实 Tokens': 'Real Tokens',
      'Token 数据不可用': 'Token data unavailable', 'Token 数据加载中…': 'Loading Token data…',
      '设置加载失败': 'Failed to load settings', '已保存': 'Saved',
      '保存失败：{reason}': 'Save failed: {reason}', '请输入 0 或正数': 'Enter 0 or a positive number',
      '月度预算': 'Monthly budget', '账户余额': 'Account balance',
      '刷新间隔': 'Refresh interval', '显示': 'Display', '日志': 'Logs',
      '查看日志': 'View logs', '打开日志文件夹': 'Open log folder', '导出日志': 'Export logs',
      '价格与版本': 'Prices and version', '价格表': 'Price table',
      '已重新检测': 'Rechecked', '已打开日志文件夹': 'Log folder opened',
      '无法打开，已复制路径': 'Could not open; path copied', '打开日志失败': 'Failed to open logs',
      '日志已导出': 'Logs exported', '日志导出失败': 'Log export failed',
      '数据': 'Data', '备份与恢复': 'Backup and restore',
      '{n} 分钟后': 'in {n} min', '{n} 小时后': 'in {n} h', '{n} 天后': 'in {n} d',
      '导入中…': 'Importing…', '数据已导出': 'Data exported', '数据导出失败': 'Data export failed',
      '已导入 {month} 数据': 'Imported {month} data', '导入失败：{reason}': 'Import failed: {reason}',
      '检查失败': 'Check failed', '未发布': 'Not published', '已是最新': 'Up to date',
      '发现 {version}': 'Found {version}', '更新': 'Update', '取消': 'Cancel',
      '复制命令': 'Copy command', '命令已复制': 'Command copied', '复制失败': 'Copy failed',
      '设置加载中…': 'Loading settings…', '检查更新': 'Check for updates',
      '更新失败（{reason}）': 'Update failed ({reason})',
      '已更新到 {version}，重启 DSH 后生效': 'Updated to {version}; restart DSH to apply',
      '已更新，重启 DSH 后生效': 'Updated; restart DSH to apply',
      'API 计费': 'API billing',
      '发现 {version}，点击更新': 'Found {version}; click to update',
      '版本 {version}': 'Version {version}',
      '{name} · {action} Token 看板': '{name} · {action} Token dashboard',
      '{name} 月度预算': '{name} monthly budget',
      '{name}，按量 API，{budget}，今日 {today}{balance}': '{name}, pay-as-you-go, {budget}, today {today}{balance}',
      '{name}，订阅，账户套餐，{value}': '{name}, subscription, account plan, {value}',
    }
    const ZH = Object.fromEntries(Object.keys(EN).map((key) => [key, key]))
    const MESSAGES = { zh: ZH, en: EN }
    let localeService = null
    let activeTranslate = (key, params) => {
      const template = ZH[key] ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match)
    }
    const tr = (key, params) => activeTranslate(key, params)

    const T = {
      text: 'var(--dsw-alias-label-primary, var(--dsh-text, #eee))',
      muted: 'var(--dsw-alias-label-secondary, rgba(235,235,235,.65))',
      weak: 'var(--dsw-alias-label-tertiary, rgba(235,235,235,.45))',
      accent: 'var(--dsw-alias-state-business-primary, #6ea8ff)',
      warn: 'var(--dsw-alias-state-warn-primary, #f0a020)',
      over: 'var(--dsw-alias-state-error-primary, #e05a5a)',
      ok: 'var(--dsw-alias-state-success-primary, #4ed17e)',
      border: 'var(--dsw-alias-border-l2, rgba(128,128,128,.25))',
      section: 'color-mix(in srgb, var(--dsw-alias-label-primary, #eee) 3%, transparent)',
      tile: 'color-mix(in srgb, var(--dsw-alias-label-primary, #eee) 4%, transparent)',
      input: 'color-mix(in srgb, var(--dsw-alias-label-primary, #eee) 5%, transparent)',
      segment: 'var(--dsw-alias-bg-module-platform, rgba(127,127,127,.10))',
      segmentOn: 'var(--dsw-alias-button-elevated-fill, #fff)',
      tooltip: 'var(--dsw-alias-tooltip-bg, #333)',
      tooltipText: 'var(--dsw-alias-toast-label, #fff)',
      focus: 'var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #6ea8ff))',
    }

    const fmtMoney = (value, currency = 'CNY') => `${currency === 'USD' ? '$' : '¥'}${(Number(value ?? 0) || 0).toFixed(2)}`
    const fmtTokens = (value) => {
      const n = Math.max(0, Number(value) || 0)
      const trim = (text) => text.replace(/\.0$/, '')
      if (n < 1000) return String(Math.round(n))
      if (n < 1e6) return `${trim((n / 1e3).toFixed(1))}k`
      if (n < 1e9) return `${trim((n / 1e6).toFixed(1))}M`
      return `${trim((n / 1e9).toFixed(1))}B`
    }
    const fmtRatio = (value) => `${trimZeros((Math.max(0, Number(value) || 0) * 100).toFixed(1))}%`
    const fmtPercent = (value) => `${trimZeros((Number(value) || 0).toFixed(1))}%`
    const trimZeros = (text) => text.replace(/\.0$/, '')
    const fmtTime = (ts) => {
      if (!Number.isFinite(ts) || ts <= 0) return null
      const date = new Date(ts)
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      return date.toDateString() === now.toDateString() ? hm : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`
    }
    /** 重置时间带相对量：`3 小时后 · 11-03 20:15`；<1h 用分钟（最小 1），<24h 用小时，其余用天。 */
    const fmtReset = (ts) => {
      if (!Number.isFinite(ts) || ts <= 0) return null
      const date = new Date(ts)
      const pad = (value) => String(value).padStart(2, '0')
      const time = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      const minutes = Math.max(1, Math.round((Number(ts) - Date.now()) / 60000))
      const label = minutes < 60
        ? tr('{n} 分钟后', { n: minutes })
        : minutes < 1440
          ? tr('{n} 小时后', { n: Math.round(minutes / 60) })
          : tr('{n} 天后', { n: Math.round(minutes / 1440) })
      return `${label} · ${time}`
    }
    const budgetColor = (state) => (state === 'over' ? T.over : state === 'warn' ? T.warn : T.accent)
    const percentColor = (value) => (value >= 100 ? T.over : value >= 80 ? T.warn : T.accent)
    const sourceLabel = (source) => String(source ?? '').includes('community') ? tr('社区') : tr('内置兜底')
    const linkLabel = (link) => PRICE_LABELS[link.id] ?? link.label
    const formatCatalogTime = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return '—'
      const text = String(value).trim()
      const pad = (number) => String(number).padStart(2, '0')
      if (/^\d{10}$/.test(text) || /^\d{13}$/.test(text)) {
        const stamp = Number(text) * (text.length === 10 ? 1000 : 1)
        const date = new Date(stamp)
        if (!Number.isFinite(date.getTime())) return '—'
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
      const date = new Date(text)
      if (!Number.isFinite(date.getTime())) return text
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    async function getJson(path) {
      const res = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.ok !== true) throw new Error(body?.reason ?? `http-${res.status}`)
      return body.data
    }

    async function putPrefs(prefs) {
      const res = await fetch(`${API}/prefs`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.ok !== true) throw new Error(body?.reason ?? `http-${res.status}`)
      return body.data
    }

    async function postJson(path, payload) {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.ok !== true) throw new Error(body?.reason ?? `http-${res.status}`)
      return body.data
    }

    const updateListeners = new Set()
    let updateSnapshot = { phase: 'idle', text: null, latest: null, command: null }
    let updateRequest = null
    let updateResetTimer = null
    let autoUpdateChecked = false

    function emitUpdate(patch) {
      updateSnapshot = { ...updateSnapshot, ...patch }
      for (const listener of updateListeners) listener()
    }

    function resetUpdateLater() {
      if (updateResetTimer !== null) clearTimeout(updateResetTimer)
      updateResetTimer = setTimeout(() => {
        updateResetTimer = null
        if (updateSnapshot.phase === 'done') emitUpdate({ phase: 'idle', text: null, latest: null, command: null })
      }, 1600)
    }

    function useUpdateSnapshot() {
      const [snapshot, setSnapshot] = useState(updateSnapshot)
      useEffect(() => {
        const listener = () => setSnapshot(updateSnapshot)
        updateListeners.add(listener)
        return () => updateListeners.delete(listener)
      }, [])
      return snapshot
    }

    async function checkForUpdate({ manual = true } = {}) {
      if (updateSnapshot.phase === 'checking' || updateSnapshot.phase === 'installing') return
      if (updateRequest !== null) return updateRequest
      if (updateResetTimer !== null) { clearTimeout(updateResetTimer); updateResetTimer = null }
      emitUpdate({ phase: 'checking', text: null, command: null })
      updateRequest = (async () => {
        try {
          const data = await getJson('/update')
          if (data.published === false) {
            if (manual) { emitUpdate({ phase: 'done', text: tr('未发布') }); resetUpdateLater() }
            else emitUpdate({ phase: 'idle', text: null })
          } else if (data.hasUpdate) {
            emitUpdate({ phase: manual ? 'confirm' : 'available', latest: data.latest, text: null })
          } else if (manual) {
            emitUpdate({ phase: 'done', text: tr('已是最新') })
            resetUpdateLater()
          } else {
            emitUpdate({ phase: 'idle', text: null })
          }
        } catch {
          if (manual) emitUpdate({ phase: 'error', text: tr('检查失败') })
          else emitUpdate({ phase: 'idle', text: null })
        } finally {
          updateRequest = null
        }
      })()
      return updateRequest
    }

    async function installUpdateRequest() {
      if (updateSnapshot.phase === 'installing') return
      emitUpdate({ phase: 'installing', text: null })
      try {
        const res = await fetch(`${API}/update/install`, { method: 'POST', headers: { accept: 'application/json' } })
        const body = await res.json().catch(() => ({}))
        const data = body?.data
        if (body?.ok === true) {
          emitUpdate({ phase: 'done', text: data?.to ? tr('已更新到 {version}，重启 DSH 后生效', { version: data.to }) : tr('已更新，重启 DSH 后生效'), latest: null })
          resetUpdateLater()
        } else {
          emitUpdate({ phase: 'error', text: tr('更新失败（{reason}）', { reason: data?.reason ?? 'unknown' }), command: data?.command ?? null })
        }
      } catch (error) {
        emitUpdate({ phase: 'error', text: tr('更新失败（{reason}）', { reason: error.message }), command: null })
      }
    }

    const styles = {
      pill: {
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 8px',
        borderRadius: 999, cursor: 'pointer', maxWidth: '100%', fontVariantNumeric: 'tabular-nums',
        border: `1px solid ${T.border}`, color: T.text,
      },
      pillWrap: { position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 8 },
      pillHover: { background: 'color-mix(in srgb, currentColor 8%, transparent)' },
      hint: {
        position: 'absolute', right: 12, bottom: 30, padding: '5px 8px', borderRadius: 6,
        background: T.tooltip, color: T.tooltipText, border: `1px solid ${T.border}`,
        fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      },
      chevron: { marginLeft: 2, padding: '0 1px', color: T.accent, fontSize: 10 },
      num: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
      panel: {
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
        width: 'min(360px, calc(100vw - 16px))', boxSizing: 'border-box', maxHeight: '70vh',
        overflow: 'auto', zIndex: 9999, padding: 12, borderRadius: 12,
        background: 'var(--dsw-alias-bg-layer-2, var(--dsh-bg-elevated, #1f1f1f))', color: T.text,
        border: `1px solid ${T.border}`, boxShadow: '0 12px 40px rgba(0,0,0,.35)', fontSize: 12, outline: 'none',
      },
      header: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 28 },
      headerTabs: { flex: 1, minWidth: 0 },
      headerActions: { display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
      rowStart: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
      muted: { color: T.muted, fontSize: 11 },
      weak: { color: T.weak, fontSize: 10.5 },
      title: { fontSize: 13, fontWeight: 600 },
      button: {
        boxSizing: 'border-box', border: '1px solid color-mix(in srgb, var(--td-accent) 32%, transparent)',
        background: 'color-mix(in srgb, var(--td-accent) 16%, transparent)',
        color: 'var(--td-accent)', borderRadius: 6, height: 22, minHeight: 22, padding: '0 7px',
        fontSize: 11, lineHeight: '20px', cursor: 'pointer', font: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      },
      iconButton: {
        width: 22, height: 22, minHeight: 22, boxSizing: 'border-box', padding: 0,
        borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      },
      inlineInfoButton: {
        width: 20, height: 20, minHeight: 20, boxSizing: 'border-box', padding: 0, border: 'none',
        background: 'transparent', color: T.weak, borderRadius: 4, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      },
      section: { background: T.section, borderRadius: 10, padding: 10, marginTop: 10, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', alignContent: 'start', gap: 6, minWidth: 0 },
      sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 },
      budgetRow: { display: 'grid', gap: 4, padding: '3px 0', fontSize: 10.5 },
      budgetHead: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px minmax(0,1fr) 72px', alignItems: 'center', columnGap: 6 },
      budgetName: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      quotaRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 22, fontSize: 11 },
      quotaName: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 88 },
      rangeCard: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 },
      tile: { background: T.tile, borderRadius: 8, padding: '8px 9px', minWidth: 0 },
      tileLabel: { color: T.muted, fontSize: 11 },
      tileValue: { fontSize: 17, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' },
      tileDetail: { color: T.muted, fontSize: 10.5, marginTop: 1, fontVariantNumeric: 'tabular-nums' },
      group: { marginTop: 9, display: 'grid', gap: 3 },
      groupName: { fontSize: 13, fontWeight: 600 },
      modelRow: { display: 'flex', alignItems: 'baseline', gap: 8, minHeight: 18 },
      modelName: { minWidth: 0, flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      modelCost: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
      usageLine: { display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, whiteSpace: 'nowrap' },
      usagePrimary: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      usageMeta: { flex: '0 0 auto', whiteSpace: 'nowrap' },
      usageLabel: { color: T.muted, fontSize: 9.5, marginRight: 3 },
      usageValue: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
      errorStrip: { display: 'flex', alignItems: 'center', gap: 6, color: T.over, fontSize: 11, marginTop: 6 },
      empty: { color: T.muted, fontSize: 11, padding: '10px 0' },
      input: {
        width: 72, height: 22, boxSizing: 'border-box', textAlign: 'right',
        background: T.input, color: T.text, border: `1px solid ${T.border}`,
        borderRadius: 6, padding: '0 5px', font: 'inherit', fontVariantNumeric: 'tabular-nums',
      },
      card: { background: T.section, borderRadius: 10, padding: 10, marginTop: 10, display: 'grid', gap: 8 },
      link: { color: T.text, textDecoration: 'underline', cursor: 'pointer' },
      status: { minHeight: 15, fontSize: 10.5, color: T.muted, textAlign: 'right' },
      priceLinks: { display: 'flex', gap: 7, alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 1 },
    }
    styles.button['--td-accent'] = T.accent
    styles.iconButton = { ...styles.button, ...styles.iconButton, minHeight: 22, boxSizing: 'border-box' }

    function Icon({ name, size = 14, style }) {
      const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style }
      if (name === 'info') return h('svg', props, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 11v5' }), h('path', { d: 'M12 8h.01' }))
      if (name === 'close') return h('svg', props, h('path', { d: 'M6 6l12 12M18 6L6 18' }))
      if (name === 'check') return h('svg', props, h('path', { d: 'M20 6L9 17l-5-5' }))
      if (name === 'download') return h('svg', props, h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('path', { d: 'M7 10l5 5 5-5' }), h('path', { d: 'M12 15V3' }))
      if (name === 'loader') return h('svg', { ...props, style: { ...style, animation: 'td-spin 1s linear infinite' } }, h('path', { d: 'M21 12a9 9 0 1 1-6.2-8.56' }))
      return h('svg', props, h('path', { d: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }), h('path', { d: 'M3 3v5h5' }), h('path', { d: 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' }), h('path', { d: 'M16 16h5v5' }))
    }

    function IconButton({ label, children, onClick, disabled = false, testid, dot = false, dotColor = T.warn }) {
      return h('button', {
        type: 'button', 'aria-label': label, title: label, disabled, onClick,
        'data-testid': testid,
        style: { ...styles.iconButton, position: 'relative', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' },
      }, children, dot ? h('span', {
        'aria-hidden': true,
        style: { position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: 999, background: dotColor },
      }) : null)
    }

    function Tooltip({ open, anchorRef, text, onClose }) {
      const tipRef = useRef(null)
      const [pos, setPos] = useState(null)

      const updatePosition = useCallback(() => {
        const anchor = anchorRef.current
        const tip = tipRef.current
        if (anchor === null || tip === null) return
        const rect = anchor.getBoundingClientRect()
        const tipRect = tip.getBoundingClientRect()
        const width = Math.max(1, tipRect.width)
        const height = Math.max(1, tipRect.height)
        const gap = 6
        const above = rect.top - gap - height
        const below = rect.bottom + gap
        const top = above >= 8
          ? above
          : Math.min(below, window.innerHeight - height - 8)
        const left = Math.min(
          Math.max(8, rect.left + rect.width / 2 - width / 2),
          window.innerWidth - width - 8,
        )
        setPos({ top, left })
      }, [anchorRef])

      useLayoutEffect(() => {
        if (!open) {
          setPos(null)
          return undefined
        }
        updatePosition()
        const raf = requestAnimationFrame(updatePosition)
        const close = () => onClose?.()
        const onDown = (event) => {
          if (anchorRef.current?.contains(event.target)) return
          if (tipRef.current?.contains(event.target)) return
          close()
        }
        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        document.addEventListener('mousedown', onDown)
        return () => {
          cancelAnimationFrame(raf)
          window.removeEventListener('resize', close)
          window.removeEventListener('scroll', close, true)
          document.removeEventListener('mousedown', onDown)
        }
      }, [open, updatePosition, onClose, anchorRef])

      if (!open) return null
      return h('span', {
        ref: tipRef, role: 'tooltip',
        style: {
          position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0,
          width: 'max-content', maxWidth: 'min(220px, calc(100vw - 16px))',
          opacity: pos === null ? 0 : 1, zIndex: 10050,
          padding: '6px 7px', borderRadius: 6, background: T.tooltip, color: T.tooltipText,
          fontSize: 10.5, lineHeight: 1.35, boxShadow: '0 6px 20px rgba(0,0,0,.3)', whiteSpace: 'normal',
          pointerEvents: 'none',
        },
      }, text)
    }

    function InfoTip({ label, text, children, style, variant = 'header' }) {
      const [open, setOpen] = useState(false)
      const [hover, setHover] = useState(false)
      const triggerRef = useRef(null)
      const close = useCallback(() => setOpen(false), [])

      const inline = variant === 'inline'
      const triggerStyle = inline
        ? { ...styles.inlineInfoButton, ...(hover ? { background: 'color-mix(in srgb, currentColor 8%, transparent)' } : {}) }
        : styles.iconButton
      return h('span', {
        style: { position: 'relative', display: 'inline-flex', verticalAlign: 'middle', ...style },
        onMouseEnter: () => { setHover(true); setOpen(true) },
        onMouseLeave: () => { setHover(false); close() },
      }, h('button', {
        ref: triggerRef, type: 'button', 'aria-label': label, 'aria-expanded': open,
        onClick: () => setOpen((value) => !value),
        onFocus: () => setOpen(true), onBlur: close,
        onKeyDown: (event) => { if (event.key === 'Escape') close() },
        style: triggerStyle,
      }, children ?? h(Icon, { name: 'info', size: inline ? 11 : 12 })),
      h(Tooltip, { open, anchorRef: triggerRef, text, onClose: close }))
    }

    function Toggle({ checked, onChange, label }) {
      return h('button', {
        type: 'button', role: 'switch', 'aria-checked': checked, 'aria-label': label,
        onClick: () => onChange(!checked),
        style: {
          width: 28, height: 16, borderRadius: 999, border: 'none', padding: 2,
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          background: checked ? T.accent : 'color-mix(in srgb, currentColor 25%, transparent)',
        },
      }, h('span', { style: {
        width: 12, height: 12, borderRadius: 999, background: '#fff',
        transform: `translateX(${checked ? 12 : 0}px)`, transition: 'transform .15s',
      } }))
    }

    function Segmented({ value, options, onChange, label, kind = 'tablist' }) {
      const itemRole = kind === 'radiogroup' ? 'radio' : 'tab'
      return h('div', {
        role: kind, 'aria-label': label,
        style: { display: 'flex', width: '100%', height: 28, padding: 2, boxSizing: 'border-box', gap: 2, borderRadius: 8, background: T.segment },
      }, options.map((option, index) => {
        const selected = option.value === value
        return h('button', {
          key: option.value, type: 'button', role: itemRole,
          'aria-selected': itemRole === 'tab' ? selected : undefined,
          'aria-checked': itemRole === 'radio' ? selected : undefined,
          tabIndex: selected ? 0 : -1,
          onClick: () => onChange(option.value),
          onKeyDown: (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const direction = event.key === 'ArrowRight' ? 1 : -1
            onChange(options[(index + direction + options.length) % options.length].value)
          },
          style: {
            flex: 1, minWidth: 0, height: 24, padding: '0 4px', borderRadius: 6, border: 'none',
            fontSize: 11, fontWeight: 500, cursor: 'pointer', font: 'inherit',
            background: selected ? T.segmentOn : 'transparent',
            color: selected ? T.text : T.muted,
            boxShadow: selected ? 'var(--dsw-shadow-lv1, 0 1px 2px rgba(0,0,0,.08))' : 'none',
            transition: 'background .15s, color .15s',
          },
        }, option.label)
      }))
    }

    function MiniBar({ ratio = 0, neutral = false, stretch = false }) {
      return h('span', {
        style: { display: 'block', width: stretch ? '100%' : 48, height: 4, borderRadius: 999, overflow: 'hidden', background: 'color-mix(in srgb, var(--dsw-alias-label-primary, #eee) 10%, transparent)' },
      }, h('span', { style: {
        display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, (Number(ratio) || 0) * 100))}%`,
        borderRadius: 999, background: neutral ? 'color-mix(in srgb, currentColor 30%, transparent)' : T.accent,
      } }))
    }

    function balanceText(provider, show = true) {
      if (show === false) return null
      const balance = provider.balance
      if (balance === undefined || balance === null) return '—'
      if (balance.status === 'ok') return Number.isFinite(balance.amount) ? fmtMoney(balance.amount, provider.currency) : tr('查询失败')
      if (balance.status === 'unconfigured' || balance.status === 'unsupported') return '—'
      return tr('查询失败')
    }

    function windowLabel(key) { return { '5h': '5h', week: tr('周'), month: tr('月') }[key] ?? key }

    function subscriptionText(provider) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      if (windows.length === 0) return tr('套餐查询失败')
      return windows.slice(0, 2).map((plan) => `${windowLabel(plan.key)} ${fmtPercent(plan.usedPercent)}`).join(' · ')
    }

    function subscriptionNodes(provider, withReset = false) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      if (windows.length === 0) return [h('span', { key: 'fail' }, tr('套餐查询失败'))]
      const nodes = windows.slice(0, 2).map((plan, index) => h(React.Fragment, { key: plan.key },
        index > 0 ? ' · ' : null,
        `${windowLabel(plan.key)} `,
        h('b', { style: { ...styles.num, color: percentColor(plan.usedPercent ?? 0) } }, fmtPercent(plan.usedPercent))))
      if (withReset && windows.length === 1) {
        const reset = fmtTime(windows[0].resetAt)
        if (reset !== null) nodes.push(h('span', { key: 'reset' }, ` · ${tr('重置')} ${reset}`))
      }
      return nodes
    }

    function LocaleRoot() {
      const [, setTick] = useState(0)
      useEffect(() => {
        if (localeService?.subscribe === undefined) return undefined
        return localeService.subscribe(() => setTick((value) => value + 1))
      }, [])
      return h(Pill)
    }

    function Pill() {
      const updateState = useUpdateSnapshot()
      const hasUpdate = updateState.phase === 'available' || updateState.phase === 'confirm'
      const [summary, setSummary] = useState(null)
      const [open, setOpen] = useState(false)
      const [error, setError] = useState(false)
      const [refreshMs, setRefreshMs] = useState(60000)
      const [refreshing, setRefreshing] = useState(false)
      const [hover, setHover] = useState(false)
      const [hint, setHint] = useState(false)
      const [panelMaxHeight, setPanelMaxHeight] = useState('70vh')
      const [panelShift, setPanelShift] = useState(0)
      const pillRef = useRef(null)

      useEffect(() => {
        try { if (window.localStorage.getItem('token-dash-hint-seen') !== '1') setHint(true) } catch { /* ignore */ }
      }, [])

      const load = useCallback(async () => {
        setRefreshing(true)
        try {
          const data = await getJson('/summary')
          setSummary(data)
          setError(false)
          if (Number.isFinite(data?.refreshMs) && data.refreshMs !== refreshMs) setRefreshMs(data.refreshMs)
        } catch {
          setError(true)
        } finally {
          setRefreshing(false)
        }
      }, [refreshMs])

      useEffect(() => {
        getJson('/prefs').then((prefs) => setRefreshMs(prefs.refreshMs ?? 60000)).catch(() => {})
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, refreshMs)
        return () => clearInterval(timer)
      }, [load, refreshMs])

      const refreshSubs = useCallback(async () => {
        try { await fetch(`${API}/providers/refresh`, { method: 'POST', headers: { accept: 'application/json' } }) } catch { /* fall through */ }
        await load()
      }, [load])

      const dismissHint = () => {
        setHint(false)
        try { window.localStorage.setItem('token-dash-hint-seen', '1') } catch { /* ignore */ }
      }
      const closePanel = useCallback(() => {
        setOpen(false)
        setTimeout(() => pillRef.current?.focus(), 0)
      }, [])
      const measurePanel = useCallback(() => {
        const rect = pillRef.current?.getBoundingClientRect()
        if (rect === undefined) return
        const width = Math.min(360, window.innerWidth - 16)
        setPanelShift(Math.min(0, window.innerWidth - 8 - rect.left - width))
        const available = Math.round(rect.top) - 16
        setPanelMaxHeight(`${Math.max(200, Math.min(window.innerHeight * 0.7, available))}px`)
      }, [])
      useEffect(() => {
        if (!open) return
        const node = pillRef.current
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measurePanel()) : null
        if (node !== null) observer?.observe(node)
        window.addEventListener('resize', measurePanel)
        const raf = requestAnimationFrame(measurePanel)
        const timer = setTimeout(measurePanel, 120)
        return () => {
          observer?.disconnect()
          window.removeEventListener('resize', measurePanel)
          cancelAnimationFrame(raf)
          clearTimeout(timer)
        }
      }, [open, summary, measurePanel])
      const toggle = () => {
        dismissHint()
        if (!open) measurePanel()
        setOpen((value) => !value)
      }

      const providers = summary?.providers ?? []
      const current = providers.find((provider) => provider.id === summary?.currentProviderId) ?? providers[0]
      let prefix = '[API]'
      let bodyNodes = [h('span', { key: 'unknown' }, '--')]
      let ariaText = tr('按量 API')
      if (current?.kind === 'subscription') {
        prefix = `[${tr('订阅')}]`
        bodyNodes = [h('span', { key: 'windows' }, ...subscriptionNodes(current, true))]
        ariaText = tr('{name}，订阅，账户套餐，{value}', { name: current.name, value: subscriptionText(current) })
      } else if (current !== undefined) {
        const budget = current.budget
        const hasBudget = budget !== undefined && budget.state !== 'unset' && budget.amount > 0
        const balance = balanceText(current, summary?.showBalance)
        bodyNodes = [
          h('span', { key: 'budget' }, `${tr('预算')} `, hasBudget
            ? h('b', { style: { ...styles.num, color: budgetColor(budget.state) } }, fmtRatio(budget.percent))
            : tr('未设置')),
          h('span', { key: 'today' }, tr('今日 {value}', { value: fmtMoney(current.usage?.todayCost, current.currency) })),
          balance === null ? null : h('span', { key: 'balance' }, tr('余额 {value}', { value: balance })),
        ].filter(Boolean)
        ariaText = tr('{name}，按量 API，{budget}，今日 {today}{balance}', { name: current.name, budget: hasBudget ? tr('预算已用 {value}', { value: fmtRatio(budget.percent) }) : tr('预算未设置'), today: fmtMoney(current.usage?.todayCost, current.currency), balance: balance === null ? '' : `，${tr('余额 {value}', { value: balance })}` })
      }
      const hoverTitle = tr('{name} · {action} Token 看板', { name: current?.name ?? '', action: open ? tr('收起') : tr('展开') })

      return h('div', { style: styles.pillWrap },
        h('style', null, SPIN_CSS),
        hint && !open ? h('span', { style: styles.hint, role: 'status' }, tr('点击查看 Token 看板')) : null,
        h('span', {
          ref: pillRef, 'data-testid': 'token-dash-pill',
          style: { ...styles.pill, ...(hover || open ? styles.pillHover : {}) },
          onClick: toggle, onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
          onFocus: () => setHover(true), onBlur: () => setHover(false),
          onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } },
          role: 'button', tabIndex: 0, 'aria-expanded': open, 'aria-haspopup': 'dialog',
          'aria-label': tr('Token 看板：{text}', { text: ariaText }), title: hoverTitle,
        }, h('span', { key: 'prefix', style: styles.num }, prefix), ...bodyNodes,
          h('span', { key: 'chevron', style: styles.chevron }, open ? '⌄' : '⌃')),
        open ? h(Panel, {
          summary, error, refreshing, maxHeight: panelMaxHeight, left: panelShift, hasUpdate,
          onRefresh: load, onRefreshSubs: refreshSubs, onClose: closePanel,
        }) : null)
    }

    function PanelHeader({ tab, onTab, onRefresh, refreshing, onClose, showInfo, stale = false, hasUpdate = false }) {
      const settingsLabel = h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
        tr('设置'),
        hasUpdate ? h('span', {
          'aria-hidden': true,
          style: { width: 4, height: 4, borderRadius: 999, background: T.accent },
        }) : null)
      return h('div', { style: styles.header },
        h('div', { style: styles.headerTabs }, h(Segmented, {
          value: tab, onChange: onTab, label: tr('看板页面'),
          options: [{ value: 'usage', label: tr('用量') }, { value: 'settings', label: settingsLabel }],
        })),
        h('div', { style: styles.headerActions },
          showInfo ? h(InfoTip, {
            label: tr('查看支持的 API Key 范围'),
            text: tr('目前支持 DeepSeek / Kimi / GLM / OpenRouter / Qwen API Key'),
          }) : null,
          h(IconButton, {
            label: tr('刷新'), testid: 'token-dash-refresh', disabled: refreshing, onClick: onRefresh, dot: stale,
          }, h(Icon, { name: refreshing ? 'loader' : 'refresh', size: 13 })),
          h(IconButton, { label: tr('关闭'), testid: 'token-dash-close', onClick: onClose }, h(Icon, { name: 'close', size: 13 }))))
    }

    function Panel({ summary, error, refreshing, maxHeight, left = 0, hasUpdate = false, onRefresh, onRefreshSubs, onClose }) {
      const [tab, setTab] = useState('usage')
      const [range, setRange] = useState('today')
      const [usage, setUsage] = useState(null)
      const [usageLoading, setUsageLoading] = useState(false)
      const [usageError, setUsageError] = useState(false)
      const [panelError, setPanelError] = useState(false)
      const panelRef = useRef(null)

      const usageSeq = useRef(0)
      const loadUsage = useCallback(async () => {
        const seq = ++usageSeq.current
        setUsageLoading(true)
        setUsageError(false)
        try {
          const data = await getJson(`/usage?range=${encodeURIComponent(range)}`)
          if (seq !== usageSeq.current) return
          setUsage(data)
        } catch {
          if (seq !== usageSeq.current) return
          setUsageError(true)
        } finally {
          if (seq === usageSeq.current) setUsageLoading(false)
        }
      }, [range])

      useEffect(() => { if (tab === 'usage') loadUsage() }, [tab, loadUsage])
      useEffect(() => { setPanelError(error === true) }, [error])

      useEffect(() => {
        const onDown = (event) => {
          const node = panelRef.current
          if (node === null || node.contains(event.target)) return
          const wrap = node.parentElement
          if (wrap !== null && wrap.contains(event.target)) return
          onClose()
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
      }, [onClose])

      const refreshAll = useCallback(async () => {
        await onRefresh?.()
        if (tab === 'usage') await loadUsage()
      }, [onRefresh, tab, loadUsage])

      const body = tab === 'usage'
        ? h(UsageContent, {
          summary, usage, range, loading: usageLoading, usageError, error: panelError,
          onRange: setRange, onRetry: refreshAll, onRefreshSubs,
        })
        : h(SettingsContent, { summary, onRefresh, onRefreshSubs })

      const stale = Number.isFinite(summary?.updatedAt)
        && Date.now() - summary.updatedAt > (Number(summary?.refreshMs) || 60000) * 2
      return h('div', {
        ref: panelRef, tabIndex: -1, role: 'dialog', 'aria-label': tr('Token 看板'),
        'data-testid': 'token-dash-panel',
        style: { ...styles.panel, maxHeight, left },
      },
        h(PanelHeader, {
          tab, onTab: setTab, onRefresh: refreshAll, refreshing: refreshing || usageLoading,
          onClose, showInfo: tab === 'usage', stale, hasUpdate,
        }),
        body)
    }

    function BudgetRow({ provider }) {
      const budget = provider.budget
      const hasBudget = budget !== undefined && budget.state !== 'unset' && budget.amount > 0
      const color = budgetColor(budget?.state)
      return h('div', { 'data-testid': `token-dash-api-row-${provider.id}`, style: styles.budgetRow },
        h('div', { style: styles.budgetHead },
          h('span', { style: styles.budgetName, title: provider.name }, provider.name),
          h('span', { style: { color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } },
            hasBudget ? fmtRatio(budget.percent) : tr('未设置')),
          h('span', { 'data-testid': `token-dash-budget-cost-${provider.id}`, style: { color: T.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } },
            hasBudget ? `${fmtMoney(budget.used, provider.currency)}/${fmtMoney(budget.amount, provider.currency)}` : '—'),
          h('span', { 'data-testid': `token-dash-budget-balance-${provider.id}`, style: { textAlign: 'left', color: T.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } },
            `${tr('余额 {value}', { value: balanceText(provider, true) ?? '—' })}`)),
        h('div', { 'data-testid': `token-dash-budget-bar-${provider.id}` },
          h(MiniBar, { ratio: hasBudget ? budget.percent : 1, neutral: !hasBudget, stretch: true })))
    }

    /** 重置时间标准块：`3 小时后 · 11-03 20:15 重置`，P2 订阅行与 P3 共用。 */
    function ResetLabel({ ts, style }) {
      const text = fmtReset(ts)
      if (text === null) return null
      return h('span', { 'data-testid': 'token-dash-reset', style: style ?? { marginLeft: 'auto', color: T.weak, fontSize: 10.5 } },
        `${text} ${tr('重置')}`)
    }

    function QuotaRow({ provider, reset = false, heading = true }) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      const resetTs = reset && windows.length > 0 ? windows[windows.length - 1].resetAt : null
      const resetNode = resetTs === null ? null : h(ResetLabel, { ts: resetTs })
      return h('div', { 'data-testid': `token-dash-sub-row-${provider.id}`, style: { display: 'grid', gap: 2, padding: '2px 0' } },
        heading ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', { style: styles.quotaName, title: provider.name }, provider.name),
          resetNode) : null,
        windows.length === 0
          ? h('span', { style: styles.muted }, tr('套餐查询失败'))
          : h('div', {
            'data-testid': `token-dash-quota-windows-${provider.id}`,
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
          },
          ...windows.map((plan) => h('span', { key: plan.key, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
            h('span', { style: { color: T.muted } }, windowLabel(plan.key)),
            h('b', { style: { color: percentColor(plan.usedPercent ?? 0), fontVariantNumeric: 'tabular-nums', display: 'inline-block', minWidth: 34 } }, fmtPercent(plan.usedPercent)),
            h(MiniBar, { ratio: (Number(plan.usedPercent) || 0) / 100 })))))
    }

    function DetailGroup({ rows }) {
      return h('div', { style: styles.group },
        h('div', { style: styles.groupName }, rows[0]?.providerName ?? rows[0]?.providerId ?? ''),
        ...rows.map((model) => h('div', { key: `${model.providerId}:${model.modelId}`, style: { display: 'grid', gap: 1 } },
          h('div', { style: styles.modelRow },
            h('span', { style: styles.modelName, title: model.displayName ?? model.modelId }, model.displayName ?? model.modelId),
            model.kind === 'api'
              ? h('span', { style: styles.modelCost }, model.priced === false
                ? tr('未定价')
                : `${model.approximate === true ? '≈' : ''}${fmtMoney(model.cost, model.currency)}`)
              : null),
          h('div', { 'data-testid': 'token-dash-usage-line', style: styles.usageLine },
            h('span', { style: styles.usagePrimary },
              h('span', { style: styles.usageLabel }, 'Tokens '),
              h('span', { style: styles.usageValue }, fmtTokens(model.tokens?.total ?? 0)),
              h('span', { style: { ...styles.usageValue, color: T.muted } },
                ` [${fmtTokens(model.tokens?.input ?? 0)}/${fmtTokens(model.tokens?.cache ?? 0)}/${fmtTokens(model.tokens?.output ?? 0)}]`)),
            h('span', { style: { ...styles.usageMeta, marginLeft: 'auto' } },
              h('span', { style: styles.usageLabel }, `${tr('请求')} `), h('span', { style: styles.usageValue }, model.requests)),
            h('span', { style: styles.usageMeta },
              h('span', { style: styles.usageLabel }, `${tr('命中')} `), h('span', { style: styles.usageValue }, model.hitRate === null || model.hitRate === undefined ? '—' : fmtRatio(model.hitRate)))))))
    }

    function UsageContent({ summary, usage, range, loading, usageError, error, onRange, onRetry, onRefreshSubs }) {
      if (summary === null) {
        return h('div', { style: styles.section },
          h('div', { style: styles.empty }, error ? tr('Token 数据不可用') : tr('Token 数据加载中…')),
          error ? h('button', { type: 'button', style: styles.button, onClick: onRetry }, tr('重试')) : null)
      }
      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const models = Array.isArray(usage?.models) ? usage.models : []
      const groups = new Map()
      for (const model of models) {
        const list = groups.get(model.providerId) ?? []
        list.push(model)
        groups.set(model.providerId, list)
      }
      const pending = usage === null
      const total = usage?.total ?? null
      const costEntries = Object.entries(usage?.totals ?? {})
      const hasUsage = usage !== null
      const fixed = []
      if (api.length > 0) {
        fixed.push(h('div', { key: 'api-head', style: styles.sectionHead }, h('b', { style: styles.title }, tr('本月预算'))))
        fixed.push(...api.map((provider) => h(BudgetRow, { key: provider.id, provider })))
      }
      if (subscriptions.length > 0) {
        fixed.push(h('div', { key: 'sub-head', style: { ...styles.sectionHead, marginTop: 4 } },
          h('b', { style: styles.title }, tr('订阅套餐（账户级）')),
          h(IconButton, { label: tr('重新检测订阅配额'), testid: 'token-dash-rescan', onClick: () => { void onRefreshSubs?.() } },
            h(Icon, { name: 'refresh', size: 12 }))))
        fixed.push(...subscriptions.map((provider) => h(QuotaRow, { key: provider.id, provider, reset: true })))
      }
      if (fixed.length === 0) {
        const degraded = summary?.providersDegraded === true
        fixed.push(h('div', { key: 'empty', style: styles.empty },
          degraded ? tr('供应商探测失败') : tr('未检测到已配置供应商'),
          degraded ? h('button', { type: 'button', style: styles.button, onClick: onRetry }, tr('重试')) : null))
      }
      return h(React.Fragment, null,
        h('div', { style: styles.section }, ...fixed),
        h('div', { style: { marginTop: 10 } }, h(Segmented, {
          value: range, onChange: onRange, label: tr('时间范围'),
          options: RANGES.map(([value, label]) => ({ value, label: tr(label) })),
        })),
        error || usageError ? h('div', { style: styles.errorStrip, role: 'alert' },
          h('span', null, error ? tr('刷新失败，保留上次数据') : tr('范围数据加载失败')),
          h('button', { type: 'button', style: styles.button, onClick: onRetry }, tr('重试'))) : null,
        h('div', { style: styles.section },
          h('div', { style: styles.rangeCard },
            h('div', { style: styles.tile },
              h('div', { style: styles.tileLabel }, tr('总费用')),
              ...costEntries.map(([currency, value]) => h('div', { key: currency, style: { ...styles.tileValue, fontSize: 14, color: T.accent } }, fmtMoney(value.cost, currency))),
              pending ? h('div', { key: 'pending', style: { ...styles.tileValue, fontSize: 14, color: T.accent } }, '—') : null),
            h('div', { style: styles.tile },
              h('div', { style: styles.tileLabel },
                `${tr('真实 Tokens')} `,
                h(InfoTip, {
                  label: tr('Tokens 括号说明'),
                  text: tr('Tokens 括号顺序：输入 / 缓存（读+写）/ 输出'),
                  variant: 'inline',
                }, h(Icon, { name: 'info', size: 11 }))),
              h('div', { style: styles.tileValue }, pending ? '—' : fmtTokens(total?.tokens ?? 0)),
              h('div', { style: styles.tileDetail }, pending
                ? '—'
                : `${fmtTokens(total?.input ?? 0)} · ${fmtTokens(total?.cache ?? 0)} · ${fmtTokens(total?.output ?? 0)}`))),
          !hasUsage && loading ? h('div', { style: styles.empty }, tr('范围数据加载中…')) : null,
          hasUsage && models.length === 0 ? h('div', { style: styles.empty }, tr('范围内暂无消耗')) : null,
          hasUsage && models.length > 0 ? [...groups.entries()].map(([providerId, rows]) => h(DetailGroup, { key: providerId, rows })) : null))
    }

    function SettingsContent({ summary, onRefresh, onRefreshSubs }) {
      const [prefs, setPrefs] = useState(null)
      const [budgetText, setBudgetText] = useState({})
      const [fieldErrors, setFieldErrors] = useState({})
      const [status, setStatus] = useState(null)
      const [subRefreshing, setSubRefreshing] = useState(false)
      const update = useUpdateSnapshot()
      const [logMeta, setLogMeta] = useState(null)
      const [importing, setImporting] = useState(false)
      const fileRef = useRef(null)

      const loadPrefs = useCallback(async () => {
        try {
          const data = await getJson('/prefs')
          setPrefs(data)
          const next = {}
          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = value.amount > 0 ? String(value.amount) : ''
          setBudgetText(next)
        } catch {
          setStatus({ text: tr('设置加载失败'), error: true })
        }
      }, [])

      useEffect(() => { loadPrefs() }, [loadPrefs])

      function flash(text, error = false) {
        setStatus({ text, error })
        if (error !== true) setTimeout(() => setStatus((current) => (current?.text === text ? null : current)), 1600)
      }

      async function savePrefs(patch) {
        if (prefs === null) return null
        try {
          const saved = await putPrefs({ ...prefs, ...patch })
          setPrefs(saved)
          flash(tr('已保存'))
          void onRefresh?.()
          return saved
        } catch (error) {
          setStatus({ text: tr('保存失败：{reason}', { reason: error.message }), error: true })
          return null
        }
      }

      async function saveBudget(provider, raw) {
        const text = String(raw).trim()
        const budgets = { ...(prefs?.budgets ?? {}) }
        if (text === '') {
          // 显式 0：清空后不再被 DEFAULT_BUDGET 覆盖
          budgets[provider.id] = { amount: 0, currency: provider.currency }
          const saved = await savePrefs({ budgets })
          if (saved !== null) { setBudgetText((current) => ({ ...current, [provider.id]: '' })); setFieldErrors((current) => ({ ...current, [provider.id]: null })) }
          return
        }
        const amount = Number(text)
        if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(amount) || amount > 9999999.99) {
          setFieldErrors((current) => ({ ...current, [provider.id]: tr('请输入 0 或正数') }))
          return
        }
        budgets[provider.id] = { amount, currency: provider.currency }
        const saved = await savePrefs({ budgets })
        if (saved !== null) {
          setBudgetText((current) => ({ ...current, [provider.id]: String(saved.budgets[provider.id]?.amount ?? '') }))
          setFieldErrors((current) => ({ ...current, [provider.id]: null }))
        }
      }

      async function refreshSubscriptions() {
        setSubRefreshing(true)
        try {
          await onRefreshSubs?.()
          flash(tr('已重新检测'))
        } finally {
          setSubRefreshing(false)
        }
      }

      async function openLogs() {
        try {
          const meta = logMeta ?? await getJson('/logs/meta')
          setLogMeta(meta)
          const app = /Mac|iPhone|iPad/.test(navigator.platform) ? 'finder' : /Linux/.test(navigator.platform) ? 'filemanager' : 'explorer'
          const response = await fetch('/open-in-app/open', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ app, path: meta.dir }),
          })
          if (!response.ok) throw new Error('open-failed')
          flash(tr('已打开日志文件夹'))
        } catch {
          try {
            const meta = logMeta ?? await getJson('/logs/meta')
            await navigator.clipboard.writeText(meta.dir)
            flash(tr('无法打开，已复制路径'))
          } catch {
            setStatus({ text: tr('打开日志失败'), error: true })
          }
        }
      }

      async function exportLogs() {
        try {
          const data = await getJson('/logs/export')
          const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'dsh-token-dash.log'
          link.click()
          URL.revokeObjectURL(url)
          flash(tr('日志已导出'))
        } catch {
          setStatus({ text: tr('日志导出失败'), error: true })
        }
      }

      async function exportData() {
        try {
          const data = await getJson('/export')
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `dsh-token-dash-${data.month}.json`
          link.click()
          URL.revokeObjectURL(url)
          flash(tr('数据已导出'))
        } catch {
          setStatus({ text: tr('数据导出失败'), error: true })
        }
      }

      async function importData(file) {
        if (file === null || file === undefined) return
        setImporting(true)
        try {
          const bundle = JSON.parse(await file.text())
          const result = await postJson('/import', bundle)
          await loadPrefs()
          await onRefresh?.()
          flash(tr('已导入 {month} 数据', { month: result.month }))
        } catch (error) {
          setStatus({ text: tr('导入失败：{reason}', { reason: error.message }), error: true })
        } finally {
          setImporting(false)
          if (fileRef.current !== null) fileRef.current.value = ''
        }
      }

      const checkUpdate = () => { void checkForUpdate({ manual: true }) }
      const installUpdate = () => { void installUpdateRequest() }

      async function copyCommand() {
        try { await navigator.clipboard.writeText(update.command ?? ''); flash(tr('命令已复制')) } catch { setStatus({ text: tr('复制失败'), error: true }) }
      }

      if (prefs === null) {
        return h('div', { 'data-testid': 'token-dash-settings', style: { display: 'grid', gap: 10 } },
          h('div', { style: styles.empty }, status?.text ?? tr('设置加载中…')),
          status?.error === true ? h('button', { type: 'button', style: styles.button, onClick: loadPrefs }, tr('重试')) : null)
      }

      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const version = summary?.version ?? ''
      const catalog = summary?.catalog
      const section = (title, body, action = null, testid) => h('div', { 'data-testid': testid, style: styles.section },
        h('div', { style: styles.sectionHead }, h('b', { style: styles.title }, title), action), body)

      const apiRows = api.map((provider) => h('div', { key: provider.id, style: { display: 'grid', gap: 3, padding: '3px 0' } },
        h('div', { style: styles.row }, h('b', { style: styles.budgetName, title: provider.name }, provider.name), h('span', { style: styles.weak }, tr('按量 API'))),
        h('div', { style: styles.row }, h('span', { style: styles.muted }, tr('月度预算')),
          h('span', { style: styles.rowStart },
            h('input', {
              type: 'text', inputMode: 'decimal', 'data-testid': `token-dash-budget-input-${provider.id}`,
              'aria-label': tr('{name} 月度预算', { name: provider.name }), 'aria-invalid': fieldErrors[provider.id] !== undefined && fieldErrors[provider.id] !== null,
              value: budgetText[provider.id] ?? String(provider.budget?.amount ?? ''), onChange: (event) => setBudgetText({ ...budgetText, [provider.id]: event.target.value }),
              onBlur: (event) => saveBudget(provider, event.currentTarget.value),
              onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } },
              style: { ...styles.input, borderColor: fieldErrors[provider.id] ? T.over : T.border },
            }), h('span', { style: styles.muted }, provider.currency))),
        fieldErrors[provider.id] ? h('div', { style: { color: T.over, fontSize: 10.5, textAlign: 'right' }, role: 'alert' }, fieldErrors[provider.id]) : null))

      const subRows = subscriptions.map((provider) => {
        const windows = Array.isArray(provider.windows) ? provider.windows : []
        const resetTs = windows.length > 0 ? windows[windows.length - 1].resetAt : null
        return h('div', { key: provider.id, style: { padding: '3px 0' } },
          h('div', { style: styles.row },
            h('b', { style: styles.budgetName, title: provider.name }, provider.name),
            resetTs === null ? null : h(ResetLabel, { ts: resetTs, style: styles.weak })))
      })

      let updateControl
      const updateBusy = update.phase === 'checking' || update.phase === 'installing'
      const updateAvailable = update.phase === 'available'
      const updateError = update.phase === 'error'
      if (update.phase === 'confirm') {
        updateControl = h('span', { style: styles.rowStart },
          h('span', { style: styles.muted }, tr('发现 {version}', { version: update.latest })),
          h('button', { type: 'button', style: styles.button, onClick: installUpdate }, tr('更新')),
          h('button', { type: 'button', style: styles.button, onClick: () => emitUpdate({ phase: 'idle', latest: null }) }, tr('取消')))
      } else {
        updateControl = h('span', { style: styles.rowStart },
          updateError && update.command
            ? h('button', { type: 'button', style: styles.button, onClick: copyCommand }, tr('复制命令'))
            : null,
          h(IconButton, {
            label: updateAvailable ? tr('发现 {version}，点击更新', { version: update.latest }) : tr('检查更新'),
            testid: 'token-dash-update', disabled: updateBusy,
            dot: updateAvailable || updateError,
            dotColor: updateError ? T.over : T.accent,
            onClick: () => {
              if (updateAvailable) emitUpdate({ phase: 'confirm', latest: update.latest })
              else checkUpdate()
            },
          }, h(Icon, {
            name: updateBusy ? 'loader' : update.phase === 'done' ? 'check' : 'download', size: 13,
          })))
      }

      const statusText = update.text ?? status?.text ?? tr('版本 {version}', { version })
      return h('div', { 'data-testid': 'token-dash-settings', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 0, minWidth: 0 } },
        api.length > 0 ? section(tr('API 计费'), h('div', null, ...apiRows)) : null,
        subscriptions.length > 0 ? section(tr('订阅'),
          h('div', null, ...subRows),
          h(IconButton, { label: tr('重新检测订阅配额'), testid: 'token-dash-settings-rescan', disabled: subRefreshing, onClick: refreshSubscriptions }, h(Icon, { name: subRefreshing ? 'loader' : 'refresh', size: 12 }))) : null,
        section(tr('显示'), h('div', { style: { display: 'grid', gap: 7 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
            h('span', { style: { whiteSpace: 'nowrap' } }, tr('刷新间隔')),
            h('div', { 'data-testid': 'token-dash-refresh-segment', style: { width: 168, flex: '0 1 168px', minWidth: 0 } }, h(Segmented, { value: prefs.refreshMs, onChange: (ms) => savePrefs({ refreshMs: ms }), label: tr('刷新间隔'), kind: 'radiogroup', options: REFRESH_OPTIONS.map(([value, label]) => ({ value, label: tr(label) })) }))),
          h('div', { style: styles.row }, h('span', null, tr('账户余额')), h(Toggle, { checked: prefs.showBalance, label: tr('账户余额'), onChange: (next) => savePrefs({ showBalance: next }) })))),
        section(tr('数据与日志'), [
          h('div', { key: 'log', style: styles.row },
            h('span', null, tr('日志')),
            h('span', { style: styles.rowStart },
              h('button', { type: 'button', 'data-testid': 'token-dash-log-open', style: styles.button, onClick: openLogs }, tr('打开日志文件夹')),
              h('button', { type: 'button', 'data-testid': 'token-dash-log-export', style: styles.button, onClick: exportLogs }, tr('导出日志')))),
          h('div', { key: 'data', style: styles.row },
            h('span', null, tr('备份与恢复')),
            h('span', { style: styles.rowStart },
              h('button', { type: 'button', 'data-testid': 'token-dash-data-export', style: styles.button, onClick: () => { void exportData() } }, tr('导出数据')),
              h('button', { type: 'button', 'data-testid': 'token-dash-data-import', disabled: importing, style: styles.button, onClick: () => fileRef.current?.click() }, importing ? tr('导入中…') : tr('导入数据')),
              h('input', { ref: fileRef, type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: (event) => { void importData(event.target.files?.[0]) } })))],
        null, 'token-dash-data-log-section'),
        section(tr('价格与版本'), h('div', { style: { display: 'grid', gap: 6 } },
          h('div', { 'data-testid': 'token-dash-price-links', style: styles.priceLinks },
            (summary?.pricingLinks ?? []).map((link) => h('a', { key: link.id ?? link.label, href: link.url, target: '_blank', rel: 'noopener', style: styles.link }, linkLabel(link)))),
          h('div', { style: { ...styles.muted, fontSize: 10 } },
            `${tr('价格表')} `, formatCatalogTime(catalog?.updatedAt), ' · ',
            catalog?.url
              ? h('a', { href: catalog.url, target: '_blank', rel: 'noopener', style: { ...styles.link, color: T.muted } }, tr('社区'))
              : h('span', null, sourceLabel(catalog?.source))),
          h('div', { style: styles.row }, h('span', { style: { ...styles.status, color: status?.error ? T.over : T.muted }, role: 'status', 'aria-live': 'polite', title: statusText }, statusText), updateControl)), null, 'token-dash-price-section'),
        api.length === 0 && subscriptions.length === 0 ? h('div', { style: styles.empty }, tr('未检测到已配置供应商')) : null)
    }

    return {
      name: PKG,
      inject: ['slots', 'locale'],
      apply(ctx) {
        if (ctx.locale !== undefined) {
          localeService = ctx.locale
          try {
            ctx.effect?.(() => ctx.locale.register('token-dash', MESSAGES), 'locale:dictionaries')
            activeTranslate = ctx.locale.bind('token-dash')
          } catch { /* keep built-in zh fallback */ }
        }
        if (!autoUpdateChecked) {
          autoUpdateChecked = true
          ctx.effect?.(() => {
            const timer = setTimeout(() => { void checkForUpdate({ manual: false }) }, 4000)
            return () => clearTimeout(timer)
          }, 'update:startup')
        }
        const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots
        if (slots === undefined || typeof slots.inject !== 'function') return
        const reportMount = (slot) => {
          try {
            void fetch(`${API}/log`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ module: 'slot', event: 'mount.ok', meta: { slot } }),
            }).catch(() => {})
          } catch { /* ignore */ }
        }
        slots.inject('conversation.hero.agentPreset', () => {
          reportMount('conversation.hero.agentPreset')
          return slots.register({ name: 'conversation.hero.agentPreset', id: 'token-dash-home', order: 10 }, LocaleRoot)
        })
        slots.inject('conversation.composer.dock', () => {
          reportMount('conversation.composer.dock')
          return slots.register({ name: 'conversation.composer.dock', id: 'token-dash-input', order: -1 }, LocaleRoot)
        })
      },
    }
  },
})
