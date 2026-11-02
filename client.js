/**
 * dsh-token-dash — client half. P1 constraint pill, P2 usage tab, P3 settings tab.
 * The visual contract lives in docs/ui-design.md v2.21.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dash',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

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
    const budgetColor = (state) => (state === 'over' ? T.over : state === 'warn' ? T.warn : T.accent)
    const percentColor = (value) => (value >= 100 ? T.over : value >= 80 ? T.warn : T.accent)
    const sourceLabel = (source) => String(source ?? '').includes('community') ? '社区' : '内置'
    const linkLabel = (link) => PRICE_LABELS[link.id] ?? link.label

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
        width: 'min(320px, calc(100vw - 16px))', boxSizing: 'border-box', maxHeight: '70vh',
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
        border: '1px solid color-mix(in srgb, var(--td-accent) 32%, transparent)',
        background: 'color-mix(in srgb, var(--td-accent) 16%, transparent)',
        color: 'var(--td-accent)', borderRadius: 6, minHeight: 22, padding: '0 7px',
        fontSize: 11, cursor: 'pointer', font: 'inherit',
      },
      iconButton: {
        width: 20, height: 20, padding: 0, borderRadius: 6, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      },
      section: { background: T.section, borderRadius: 10, padding: 10, marginTop: 10, display: 'grid', gap: 6 },
      sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 },
      budgetRow: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 28px 48px 78px 58px', alignItems: 'center', columnGap: 2, minHeight: 22, fontSize: 10.5 },
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
      usageRow: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', columnGap: 8, alignItems: 'center', fontSize: 10.5 },
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
    styles.iconButton = { ...styles.button, ...styles.iconButton }

    function Icon({ name, size = 14, style }) {
      const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style }
      if (name === 'info') return h('svg', props, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 11v5' }), h('path', { d: 'M12 8h.01' }))
      if (name === 'close') return h('svg', props, h('path', { d: 'M6 6l12 12M18 6L6 18' }))
      if (name === 'download') return h('svg', props, h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('path', { d: 'M7 10l5 5 5-5' }), h('path', { d: 'M12 15V3' }))
      if (name === 'loader') return h('svg', { ...props, style: { ...style, animation: 'td-spin 1s linear infinite' } }, h('path', { d: 'M21 12a9 9 0 1 1-6.2-8.56' }))
      return h('svg', props, h('path', { d: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }), h('path', { d: 'M3 3v5h5' }), h('path', { d: 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' }), h('path', { d: 'M16 16h5v5' }))
    }

    function IconButton({ label, children, onClick, disabled = false, testid, dot = false }) {
      return h('button', {
        type: 'button', 'aria-label': label, title: label, disabled, onClick,
        'data-testid': testid,
        style: { ...styles.iconButton, position: 'relative', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' },
      }, children, dot ? h('span', {
        'aria-hidden': true,
        style: { position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: 999, background: T.warn },
      }) : null)
    }

    function InfoTip({ label, text, children, style }) {
      const [open, setOpen] = useState(false)
      return h('span', {
        style: { position: 'relative', display: 'inline-flex', ...style },
        onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false),
      }, h('button', {
        type: 'button', 'aria-label': label, 'aria-expanded': open,
        onClick: () => setOpen((value) => !value),
        onFocus: () => setOpen(true), onBlur: () => setOpen(false),
        style: { ...styles.iconButton, width: 16, height: 16, minHeight: 16, padding: 0, fontSize: 10 },
      }, children ?? h(Icon, { name: 'info', size: 12 })),
      open ? h('span', {
        role: 'tooltip',
        style: {
          position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 20, width: 190,
          padding: '6px 7px', borderRadius: 6, background: T.tooltip, color: T.tooltipText,
          fontSize: 10.5, lineHeight: 1.35, boxShadow: '0 6px 20px rgba(0,0,0,.3)', whiteSpace: 'normal',
        },
      }, text) : null)
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

    function MiniBar({ ratio = 0, neutral = false }) {
      return h('span', {
        style: { display: 'block', width: 48, height: 4, borderRadius: 999, overflow: 'hidden', background: 'color-mix(in srgb, var(--dsw-alias-label-primary, #eee) 10%, transparent)' },
      }, h('span', { style: {
        display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, (Number(ratio) || 0) * 100))}%`,
        borderRadius: 999, background: neutral ? 'color-mix(in srgb, currentColor 30%, transparent)' : T.accent,
      } }))
    }

    function balanceText(provider, show = true) {
      if (show === false) return null
      const balance = provider.balance
      if (balance === undefined || balance === null) return '—'
      if (balance.status === 'ok') return Number.isFinite(balance.amount) ? fmtMoney(balance.amount, provider.currency) : '查询失败'
      if (balance.status === 'unconfigured' || balance.status === 'unsupported') return '—'
      return '查询失败'
    }

    function windowLabel(key) { return { '5h': '5h', week: '周', month: '月' }[key] ?? key }

    function subscriptionText(provider) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      if (windows.length === 0) return '套餐查询失败'
      return windows.slice(0, 2).map((plan) => `${windowLabel(plan.key)} ${fmtPercent(plan.usedPercent)}`).join(' · ')
    }

    function subscriptionNodes(provider, withReset = false) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      if (windows.length === 0) return [h('span', { key: 'fail' }, '套餐查询失败')]
      const nodes = windows.slice(0, 2).map((plan, index) => h(React.Fragment, { key: plan.key },
        index > 0 ? ' · ' : null,
        `${windowLabel(plan.key)} `,
        h('b', { style: { ...styles.num, color: percentColor(plan.usedPercent ?? 0) } }, fmtPercent(plan.usedPercent))))
      if (withReset && windows.length === 1) {
        const reset = fmtTime(windows[0].resetAt)
        if (reset !== null) nodes.push(h('span', { key: 'reset' }, ` · 重置 ${reset}`))
      }
      return nodes
    }

    function Pill() {
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
        const width = Math.min(320, window.innerWidth - 16)
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
      let ariaText = '按量 API'
      if (current?.kind === 'subscription') {
        prefix = '[订阅]'
        bodyNodes = [h('span', { key: 'windows' }, ...subscriptionNodes(current, true))]
        ariaText = `${current.name}，订阅，账户套餐，${subscriptionText(current)}`
      } else if (current !== undefined) {
        const budget = current.budget
        const hasBudget = budget !== undefined && budget.state !== 'unset' && budget.amount > 0
        const balance = balanceText(current, summary?.showBalance)
        bodyNodes = [
          h('span', { key: 'budget' }, '预算 ', hasBudget
            ? h('b', { style: { ...styles.num, color: budgetColor(budget.state) } }, fmtRatio(budget.percent))
            : '未设置'),
          h('span', { key: 'today' }, `今日 ${fmtMoney(current.usage?.todayCost, current.currency)}`),
          balance === null ? null : h('span', { key: 'balance' }, `余额 ${balance}`),
        ].filter(Boolean)
        ariaText = `${current.name}，按量 API，${hasBudget ? `预算已用 ${fmtRatio(budget.percent)}` : '预算未设置'}，今日 ${fmtMoney(current.usage?.todayCost, current.currency)}${balance === null ? '' : `，余额 ${balance}`}`
      }
      const hoverTitle = `${current?.name ?? ''} · ${open ? '收起' : '展开'} Token 看板`

      return h('div', { style: styles.pillWrap },
        h('style', null, SPIN_CSS),
        hint && !open ? h('span', { style: styles.hint, role: 'status' }, '点击查看 Token 看板') : null,
        h('span', {
          ref: pillRef, 'data-testid': 'token-dash-pill',
          style: { ...styles.pill, ...(hover || open ? styles.pillHover : {}) },
          onClick: toggle, onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
          onFocus: () => setHover(true), onBlur: () => setHover(false),
          onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } },
          role: 'button', tabIndex: 0, 'aria-expanded': open, 'aria-haspopup': 'dialog',
          'aria-label': `Token 看板：${ariaText}`, title: hoverTitle,
        }, h('span', { key: 'prefix', style: styles.num }, prefix), ...bodyNodes,
          h('span', { key: 'chevron', style: styles.chevron }, open ? '⌄' : '⌃')),
        open ? h(Panel, {
          summary, error, refreshing, maxHeight: panelMaxHeight, left: panelShift,
          onRefresh: load, onRefreshSubs: refreshSubs, onClose: closePanel,
        }) : null)
    }

    function PanelHeader({ tab, onTab, onRefresh, refreshing, onClose, showInfo, stale = false }) {
      return h('div', { style: styles.header },
        h('div', { style: styles.headerTabs }, h(Segmented, {
          value: tab, onChange: onTab, label: '看板页面',
          options: [{ value: 'usage', label: '用量' }, { value: 'settings', label: '设置' }],
        })),
        h('div', { style: styles.headerActions },
          showInfo ? h(InfoTip, {
            label: '查看支持的 API Key 范围',
            text: '目前支持 DeepSeek / Kimi / GLM / OpenRouter / Qwen API Key',
          }) : null,
          h(IconButton, {
            label: '刷新', testid: 'token-dash-refresh', disabled: refreshing, onClick: onRefresh, dot: stale,
          }, h(Icon, { name: refreshing ? 'loader' : 'refresh', size: 13 })),
          h(IconButton, { label: '关闭', testid: 'token-dash-close', onClick: onClose }, h(Icon, { name: 'close', size: 13 }))))
    }

    function Panel({ summary, error, refreshing, maxHeight, left = 0, onRefresh, onRefreshSubs, onClose }) {
      const [tab, setTab] = useState('usage')
      const [range, setRange] = useState('today')
      const [usage, setUsage] = useState(null)
      const [usageLoading, setUsageLoading] = useState(false)
      const [usageError, setUsageError] = useState(false)
      const [panelError, setPanelError] = useState(false)
      const panelRef = useRef(null)

      const loadUsage = useCallback(async () => {
        setUsageLoading(true)
        setUsageError(false)
        try {
          setUsage(await getJson(`/usage?range=${encodeURIComponent(range)}`))
        } catch {
          setUsageError(true)
        } finally {
          setUsageLoading(false)
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
        ref: panelRef, tabIndex: -1, role: 'dialog', 'aria-label': 'Token 看板',
        'data-testid': 'token-dash-panel',
        style: { ...styles.panel, maxHeight, left },
      },
        h(PanelHeader, {
          tab, onTab: setTab, onRefresh: refreshAll, refreshing: refreshing || usageLoading,
          onClose, showInfo: tab === 'usage', stale,
        }),
        body)
    }

    function BudgetRow({ provider }) {
      const budget = provider.budget
      const hasBudget = budget !== undefined && budget.state !== 'unset' && budget.amount > 0
      const color = budgetColor(budget?.state)
      return h('div', { 'data-testid': `token-dash-api-row-${provider.id}`, style: styles.budgetRow },
        h('span', { style: styles.budgetName, title: provider.name }, provider.name),
        h('span', { style: { color, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } },
          hasBudget ? fmtRatio(budget.percent) : '未设置'),
        h(MiniBar, { ratio: hasBudget ? budget.percent : 1, neutral: !hasBudget }),
        h('span', { style: { textAlign: 'right', color: T.muted, fontVariantNumeric: 'tabular-nums' } },
          hasBudget ? `${fmtMoney(budget.used, provider.currency)}/${fmtMoney(budget.amount, provider.currency)}` : '—'),
        h('span', { style: { textAlign: 'right', color: T.muted, fontVariantNumeric: 'tabular-nums' } },
          `余额 ${balanceText(provider, true) ?? '—'}`))
    }

    function QuotaRow({ provider, reset = false }) {
      const windows = Array.isArray(provider.windows) ? provider.windows : []
      const resetText = reset && windows.length > 0 ? fmtTime(windows[windows.length - 1].resetAt) : null
      return h('div', { 'data-testid': `token-dash-sub-row-${provider.id}`, style: { display: 'grid', gap: 2, padding: '2px 0' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', { style: styles.quotaName, title: provider.name }, provider.name),
          resetText === null ? null : h('span', { style: { marginLeft: 'auto', color: T.weak, fontSize: 10.5 } }, `${resetText} 重置`)),
        windows.length === 0
          ? h('span', { style: styles.muted }, '套餐查询失败')
          : h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            ...windows.map((plan) => h('span', { key: plan.key, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
              h('span', { style: { color: T.muted } }, windowLabel(plan.key)),
              h('b', { style: { color: percentColor(plan.usedPercent ?? 0), fontVariantNumeric: 'tabular-nums' } }, fmtPercent(plan.usedPercent)),
              h(MiniBar, { ratio: (Number(plan.usedPercent) || 0) / 100 })))))
    }

    function DetailGroup({ rows }) {
      return h('div', { style: styles.group },
        h('div', { style: styles.groupName }, rows[0]?.providerName ?? rows[0]?.providerId ?? ''),
        ...rows.map((model) => h('div', { key: `${model.providerId}:${model.modelId}`, style: { display: 'grid', gap: 1 } },
          h('div', { style: styles.modelRow },
            h('span', { style: styles.modelName, title: model.displayName ?? model.modelId }, model.displayName ?? model.modelId),
            model.kind === 'api'
              ? h('span', { style: styles.modelCost }, model.priced === false ? '未定价' : fmtMoney(model.cost, model.currency))
              : null),
          h('div', { style: styles.usageRow },
            h('span', { style: { minWidth: 0, whiteSpace: 'nowrap' } },
              h('span', { style: styles.usageLabel }, 'Tokens '),
              h('span', { style: styles.usageValue }, fmtTokens(model.tokens?.total ?? 0)),
              h(InfoTip, {
                label: `${model.displayName ?? model.modelId} Token 明细`,
                text: `输入 ${fmtTokens(model.input)} · 缓存 ${fmtTokens(model.cacheRead)} · 输出 ${fmtTokens(model.output)}`,
                style: { marginLeft: 2, verticalAlign: 'middle' },
              }, h(Icon, { name: 'info', size: 10 }))),
            h('span', { style: { whiteSpace: 'nowrap', textAlign: 'right' } },
              h('span', { style: styles.usageLabel }, '请求 '), h('span', { style: styles.usageValue }, model.requests)),
            h('span', { style: { whiteSpace: 'nowrap', textAlign: 'right' } },
              h('span', { style: styles.usageLabel }, '命中 '), h('span', { style: styles.usageValue }, model.hitRate === null || model.hitRate === undefined ? '—' : fmtRatio(model.hitRate)))))))
    }

    function UsageContent({ summary, usage, range, loading, usageError, error, onRange, onRetry, onRefreshSubs }) {
      if (summary === null) {
        return h('div', { style: styles.section },
          h('div', { style: styles.empty }, error ? 'Token 数据不可用' : 'Token 数据加载中…'),
          error ? h('button', { type: 'button', style: styles.button, onClick: onRetry }, '重试') : null)
      }
      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const models = usage?.range === range && Array.isArray(usage.models) ? usage.models : []
      const groups = new Map()
      for (const model of models) {
        const list = groups.get(model.providerId) ?? []
        list.push(model)
        groups.set(model.providerId, list)
      }
      const totalTokenCount = models.reduce((sum, model) => sum + (model.tokens?.total ?? 0), 0)
      const costEntries = Object.entries(usage?.totals ?? { CNY: { cost: 0 } })
      const selected = usage?.range === range
      const fixed = []
      if (api.length > 0) {
        fixed.push(h('div', { key: 'api-head', style: styles.sectionHead }, h('b', { style: styles.title }, `本月预算（已检测 ${api.length}）`)))
        fixed.push(...api.map((provider) => h(BudgetRow, { key: provider.id, provider })))
      }
      if (subscriptions.length > 0) {
        fixed.push(h('div', { key: 'sub-head', style: { ...styles.sectionHead, marginTop: 4 } },
          h('b', { style: styles.title }, `订阅套餐（账户级，已检测 ${subscriptions.length}）`),
          h(IconButton, { label: '重新检测订阅配额', testid: 'token-dash-rescan', onClick: () => { void onRefreshSubs?.() } },
            h(Icon, { name: 'refresh', size: 12 }))))
        fixed.push(...subscriptions.map((provider) => h(QuotaRow, { key: provider.id, provider, reset: true })))
      }
      if (fixed.length === 0) fixed.push(h('div', { key: 'empty', style: styles.empty }, '未检测到已配置供应商'))
      return h(React.Fragment, null,
        h('div', { style: styles.section }, ...fixed),
        h('div', { style: { marginTop: 10 } }, h(Segmented, {
          value: range, onChange: onRange, label: '时间范围',
          options: RANGES.map(([value, label]) => ({ value, label })),
        })),
        error || usageError ? h('div', { style: styles.errorStrip, role: 'alert' },
          h('span', null, error ? '刷新失败，保留上次数据' : '范围数据加载失败'),
          h('button', { type: 'button', style: styles.button, onClick: onRetry }, '重试')) : null,
        h('div', { style: styles.section },
          h('div', { style: styles.rangeCard },
            h('div', { style: styles.tile },
              h('div', { style: styles.tileLabel }, '总费用'),
              ...costEntries.map(([currency, value]) => h('div', { key: currency, style: { ...styles.tileValue, fontSize: 14, color: T.ok } }, fmtMoney(value.cost, currency))),
              h('div', { style: styles.tileDetail }, '按币种')),
            h('div', { style: styles.tile },
              h('div', { style: styles.tileLabel }, '真实 Tokens'),
              h('div', { style: styles.tileValue }, fmtTokens(totalTokenCount)),
              h('div', { style: styles.tileDetail }, `入 ${fmtTokens(models.reduce((sum, model) => sum + (model.input ?? 0), 0))} · 出 ${fmtTokens(models.reduce((sum, model) => sum + (model.output ?? 0), 0))}`))),
          !selected && loading ? h('div', { style: styles.empty }, '范围数据加载中…') : null,
          selected && models.length === 0 ? h('div', { style: styles.empty }, '范围内暂无消耗') : null,
          selected && models.length > 0 ? [...groups.entries()].map(([providerId, rows]) => h(DetailGroup, { key: providerId, rows })) : null))
    }

    function SettingsContent({ summary, onRefresh, onRefreshSubs }) {
      const [prefs, setPrefs] = useState(null)
      const [budgetText, setBudgetText] = useState({})
      const [fieldErrors, setFieldErrors] = useState({})
      const [status, setStatus] = useState(null)
      const [subRefreshing, setSubRefreshing] = useState(false)
      const [update, setUpdate] = useState({ phase: 'idle' })
      const [logMeta, setLogMeta] = useState(null)

      const loadPrefs = useCallback(async () => {
        try {
          const data = await getJson('/prefs')
          setPrefs(data)
          const next = {}
          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = String(value.amount ?? '')
          setBudgetText(next)
        } catch {
          setStatus({ text: '设置加载失败', error: true })
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
          flash('已保存')
          void onRefresh?.()
          return saved
        } catch (error) {
          setStatus({ text: `保存失败：${error.message}`, error: true })
          return null
        }
      }

      async function saveBudget(provider, raw) {
        const text = String(raw).trim()
        const budgets = { ...(prefs?.budgets ?? {}) }
        if (text === '') {
          delete budgets[provider.id]
          const saved = await savePrefs({ budgets })
          if (saved !== null) { setBudgetText((current) => ({ ...current, [provider.id]: '' })); setFieldErrors((current) => ({ ...current, [provider.id]: null })) }
          return
        }
        const amount = Number(text)
        if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(amount) || amount > 9999999.99) {
          setFieldErrors((current) => ({ ...current, [provider.id]: '请输入 0 或正数' }))
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
          flash('已重新检测')
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
          flash('已打开日志文件夹')
        } catch {
          try {
            const meta = logMeta ?? await getJson('/logs/meta')
            await navigator.clipboard.writeText(meta.dir)
            flash('无法打开，已复制路径')
          } catch {
            setStatus({ text: '打开日志失败', error: true })
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
          flash('日志已导出')
        } catch {
          setStatus({ text: '日志导出失败', error: true })
        }
      }

      async function checkUpdate() {
        setUpdate({ phase: 'checking' })
        try {
          const data = await getJson('/update')
          if (data.published === false) setUpdate({ phase: 'done', text: '未发布' })
          else if (data.hasUpdate) setUpdate({ phase: 'confirm', latest: data.latest })
          else setUpdate({ phase: 'done', text: '已是最新' })
        } catch {
          setUpdate({ phase: 'error', text: '检查失败' })
        }
      }

      async function installUpdate() {
        setUpdate({ phase: 'installing' })
        try {
          const res = await fetch(`${API}/update/install`, { method: 'POST', headers: { accept: 'application/json' } })
          const body = await res.json().catch(() => ({}))
          const data = body?.data
          if (body?.ok === true) setUpdate({ phase: 'done', text: data?.to ? `已更新到 ${data.to}，重启 DSH 后生效` : '已更新，重启 DSH 后生效' })
          else setUpdate({ phase: 'error', text: `更新失败（${data?.reason ?? 'unknown'}）`, command: data?.command })
        } catch (error) {
          setUpdate({ phase: 'error', text: `更新失败（${error.message}）` })
        }
      }

      async function copyCommand() {
        try { await navigator.clipboard.writeText(update.command ?? ''); flash('命令已复制') } catch { setStatus({ text: '复制失败', error: true }) }
      }

      if (prefs === null) {
        return h('div', { 'data-testid': 'token-dash-settings', style: { display: 'grid', gap: 10 } },
          h('div', { style: styles.empty }, status?.text ?? '设置加载中…'),
          status?.error === true ? h('button', { type: 'button', style: styles.button, onClick: loadPrefs }, '重试') : null)
      }

      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const version = summary?.version ?? ''
      const catalog = summary?.catalog
      const section = (title, body, action = null) => h('section', { style: styles.section },
        h('div', { style: styles.sectionHead }, h('b', { style: styles.title }, title), action), body)

      const apiRows = api.map((provider) => h('div', { key: provider.id, style: { display: 'grid', gap: 3, padding: '3px 0' } },
        h('div', { style: styles.row }, h('b', { style: styles.budgetName, title: provider.name }, provider.name), h('span', { style: styles.weak }, '按量 API')),
        h('div', { style: styles.row }, h('span', { style: styles.muted }, '月度预算'),
          h('span', { style: styles.rowStart },
            h('input', {
              type: 'text', inputMode: 'decimal', 'data-testid': `token-dash-budget-input-${provider.id}`,
              'aria-label': `${provider.name} 月度预算`, 'aria-invalid': fieldErrors[provider.id] !== undefined && fieldErrors[provider.id] !== null,
              value: budgetText[provider.id] ?? '', onChange: (event) => setBudgetText({ ...budgetText, [provider.id]: event.target.value }),
              onBlur: (event) => saveBudget(provider, event.currentTarget.value),
              onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } },
              style: { ...styles.input, borderColor: fieldErrors[provider.id] ? T.over : T.border },
            }), h('span', { style: styles.muted }, provider.currency))),
        fieldErrors[provider.id] ? h('div', { style: { color: T.over, fontSize: 10.5, textAlign: 'right' }, role: 'alert' }, fieldErrors[provider.id]) : null))

      const subRows = subscriptions.map((provider) => h('div', { key: provider.id, style: { padding: '3px 0' } },
        h('div', { style: styles.row }, h('b', { style: styles.budgetName, title: provider.name }, provider.name), h('span', { style: styles.weak }, '账户套餐')),
        h('div', { style: { marginTop: 3 } }, h(QuotaRow, { provider, reset: true }))))

      let updateControl
      if (update.phase === 'checking' || update.phase === 'installing') {
        updateControl = h(IconButton, { label: '检查更新', disabled: true }, h(Icon, { name: 'loader', size: 13 }))
      } else if (update.phase === 'confirm') {
        updateControl = h('span', { style: styles.rowStart },
          h('span', { style: styles.muted }, `发现 ${update.latest}`),
          h('button', { type: 'button', style: styles.button, onClick: installUpdate }, '更新'),
          h('button', { type: 'button', style: styles.button, onClick: () => setUpdate({ phase: 'idle' }) }, '取消'))
      } else if (update.phase === 'error') {
        updateControl = h('span', { style: { ...styles.rowStart, color: T.over, fontSize: 10.5 } },
          h('span', null, update.text), update.command ? h('button', { type: 'button', style: styles.button, onClick: copyCommand }, '复制命令') : null)
      } else if (update.phase === 'done') {
        updateControl = h('span', { style: styles.muted }, update.text)
      } else {
        updateControl = h(IconButton, { label: '检查更新', testid: 'token-dash-update', onClick: checkUpdate }, h(Icon, { name: 'download', size: 13 }))
      }

      const statusText = update.text ?? (status?.text || `版本 ${version} · 已保存`)
      return h('div', { 'data-testid': 'token-dash-settings', style: { display: 'grid', gap: 0 } },
        api.length > 0 ? section(`API 计费（已检测 ${api.length}）`, h('div', null, ...apiRows)) : null,
        subscriptions.length > 0 ? section(`订阅（已检测 ${subscriptions.length}）`,
          h('div', null, ...subRows),
          h(IconButton, { label: '重新检测订阅配额', testid: 'token-dash-settings-rescan', disabled: subRefreshing, onClick: refreshSubscriptions }, h(Icon, { name: subRefreshing ? 'loader' : 'refresh', size: 12 }))) : null,
        section('显示', h('div', { style: { display: 'grid', gap: 7 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
            h('span', null, '刷新间隔'),
            h('div', { style: { width: 224, flex: '0 0 224px' } }, h(Segmented, { value: prefs.refreshMs, onChange: (ms) => savePrefs({ refreshMs: ms }), label: '刷新间隔', kind: 'radiogroup', options: REFRESH_OPTIONS.map(([value, label]) => ({ value, label })) }))),
          h('div', { style: styles.row }, h('span', null, '账户余额'), h(Toggle, { checked: prefs.showBalance, label: '账户余额', onChange: (next) => savePrefs({ showBalance: next }) })))),
        section('日志', h('div', { style: styles.row },
          h('span', null, '查看日志'),
          h('span', { style: styles.rowStart },
            h('button', { type: 'button', 'data-testid': 'token-dash-log-open', style: styles.button, onClick: openLogs }, '打开日志文件夹'),
            h('button', { type: 'button', 'data-testid': 'token-dash-log-export', style: styles.button, onClick: exportLogs }, '导出日志')))),
        section('价格与版本', h('div', { style: { display: 'grid', gap: 6 } },
          h('div', { style: styles.priceLinks }, h('span', { style: { ...styles.muted, whiteSpace: 'nowrap' } }, '查看价格明细'),
            (summary?.pricingLinks ?? []).map((link) => h('a', { key: link.id ?? link.label, href: link.url, target: '_blank', rel: 'noopener', style: styles.link }, linkLabel(link)))),
          h('div', { style: { ...styles.muted, fontSize: 10 } }, `价格表 ${catalog?.updatedAt ?? '—'} · ${sourceLabel(catalog?.source)} / 内置兜底`),
          h('div', { style: styles.row }, h('span', { style: { ...styles.status, color: status?.error ? T.over : T.muted }, role: 'status', 'aria-live': 'polite', title: statusText }, statusText), updateControl))),
        api.length === 0 && subscriptions.length === 0 ? h('div', { style: styles.empty }, '未检测到已配置供应商') : null)
    }

    return {
      name: PKG,
      inject: ['slots'],
      apply(ctx) {
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
          return slots.register({ name: 'conversation.hero.agentPreset', id: 'token-dash-home', order: 10 }, Pill)
        })
        slots.inject('conversation.composer.dock', () => {
          reportMount('conversation.composer.dock')
          return slots.register({ name: 'conversation.composer.dock', id: 'token-dash-input', order: -1 }, Pill)
        })
      },
    }
  },
})
