/**
 * dsh-token-dash — client half. P1 constraint pill, P2 dynamic provider cards,
 * P3 provider settings, log export and in-place update.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dash',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

    const API = '/token-dash/api'
    const PKG = 'dsh-token-dash'
    const LINKS = [
      ['DeepSeek', 'https://api-docs.deepseek.com/quick_start/pricing'],
      ['GLM', 'https://docs.bigmodel.cn/cn/guide/start/pricing'],
      ['Kimi', 'https://platform.moonshot.cn/docs/pricing/chat'],
      ['OpenRouter', 'https://openrouter.ai/models'],
      ['Qwen', 'https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio'],
    ]

    const COLORS = { primary: '#6ea8ff', warn: '#f0a020', over: '#e05a5a' }
    const budgetColor = (state) => (state === 'over' ? COLORS.over : state === 'warn' ? COLORS.warn : COLORS.primary)
    const percentColor = (value) => (value >= 100 ? COLORS.over : value >= 80 ? COLORS.warn : COLORS.primary)

    const fmtMoney = (value, currency = 'CNY') => `${currency === 'USD' ? '$' : '¥'}${Number(value ?? 0).toFixed(2)}`
    const fmtM = (value) => `${(Number(value ?? 0) / 1e6).toFixed(2)}M`
    const fmtRatio = (value) => `${(Number(value ?? 0) * 100).toFixed(1)}%`
    const fmtUsed = (value) => `${Number(value ?? 0).toFixed(1)}%`
    const fmtAgo = (ts) => {
      if (!Number.isFinite(ts)) return '加载中'
      const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000))
      if (seconds < 60) return '刚刚'
      if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
      return `${Math.floor(seconds / 3600)} 小时前`
    }
    const fmtReset = (ts) => {
      if (!Number.isFinite(ts) || ts <= 0) return null
      const date = new Date(ts)
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      if (date.toDateString() === now.toDateString()) return hm
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`
    }
    const modelTitle = (model) => {
      if (!model.providerId || model.providerId === 'unknown') return model.displayName ?? model.modelId
      return [model.providerName, model.displayName ?? model.modelId].filter(Boolean).join(' / ')
    }
    const windowLabel = { '5h': '5h', week: '周', month: '月' }

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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        cursor: 'pointer',
        maxWidth: '100%',
        fontVariantNumeric: 'tabular-nums',
        border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
        color: 'var(--dsh-text, inherit)',
      },
      pillWrap: { position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 8 },
      pillHover: { background: 'rgba(127,127,127,.12)' },
      nameEllipsis: { maxWidth: '12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      hint: {
        position: 'absolute', right: 12, bottom: 30, padding: '5px 8px', borderRadius: 6,
        background: 'var(--dsh-bg-elevated, #2a2a2a)', border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
        fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      },
      chevron: {
        marginLeft: 2, padding: '0 1px', borderRadius: 4, background: 'rgba(77,141,255,.16)',
        color: 'var(--dsw-alias-state-business-primary, #6ea8ff)', fontSize: 10,
      },
      sep: { width: 1, height: 12, background: 'currentColor', opacity: 0.2 },
      num: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
      panel: {
        // #30 三次定案：从 pill 正上方弹出——左缘对齐 pill 左缘、底边距 pill 顶 8px，允许遮挡输入框
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 'max-content',
        minWidth: 'min(380px, calc(100vw - 32px))', maxWidth: 'min(600px, calc(100vw - 32px))',
        boxSizing: 'border-box', maxHeight: '70vh', overflow: 'auto', zIndex: 9999,
        padding: 12, borderRadius: 12, background: 'var(--dsh-bg-elevated, #1f1f1f)',
        color: 'var(--dsh-text, #eee)', boxShadow: '0 12px 40px rgba(0,0,0,.35)', fontSize: 12,
        outline: 'none',
      },
      card: { border: '1px solid var(--dsh-border, rgba(128,128,128,.25))', borderRadius: 10, padding: 12, marginTop: 10 },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
      rowStart: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      muted: { opacity: 0.65, fontSize: 11 },
      headerTitle: { fontSize: 13, fontWeight: 600 },
      titleBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 36 },
      buttonGroup: { display: 'flex', gap: 12 },
      bar: { height: 6, borderRadius: 3, background: 'rgba(128,128,128,.25)', overflow: 'hidden', margin: '8px 0' },
      barFill: { height: '100%', background: '#6ea8ff' },
      barNeutral: { height: '100%', background: 'rgba(128,128,128,.45)' },
      cols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 8 },
      subGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 },
      scrollList: { maxHeight: 280, overflowY: 'auto', paddingRight: 4 },
      table: { width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', tableLayout: 'auto', marginTop: 6 },
      th: { textAlign: 'left', opacity: 0.6, fontWeight: 400, padding: '4px 8px', whiteSpace: 'nowrap' },
      thRight: { textAlign: 'right', opacity: 0.6, fontWeight: 400, padding: '4px 8px', borderLeft: '1px solid rgba(128,128,128,.15)', whiteSpace: 'nowrap' },
      td: { padding: '4px 8px', borderTop: '1px solid rgba(128,128,128,.15)', whiteSpace: 'nowrap' },
      tdRight: { padding: '4px 8px', textAlign: 'right', borderTop: '1px solid rgba(128,128,128,.15)', borderLeft: '1px solid rgba(128,128,128,.15)', whiteSpace: 'nowrap' },
      modelCell: { padding: '4px 8px', borderTop: '1px solid rgba(128,128,128,.15)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' },
      link: { color: 'inherit', textDecoration: 'underline', cursor: 'pointer', marginLeft: 10 },
      button: {
        border: '1px solid rgba(77,141,255,.32)', background: 'rgba(77,141,255,.16)',
        color: 'var(--dsw-alias-state-business-primary, #6ea8ff)', borderRadius: 6,
        padding: '2px 8px', cursor: 'pointer',
      },
      select: { background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,.35)', borderRadius: 5, padding: '2px 4px' },
      input: { width: 110, height: 28, boxSizing: 'border-box', textAlign: 'right', background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,.35)', borderRadius: 5, padding: '2px 4px' },
      segButton: {
        width: 72, height: 28, borderRadius: 6, border: '1px solid rgba(128,128,128,.35)',
        background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12,
      },
      segActive: { borderColor: 'rgba(77,141,255,.64)', color: 'var(--dsw-alias-state-business-primary, #6ea8ff)', background: 'rgba(77,141,255,.12)' },
      toggleTrack: {
        width: 44, height: 24, borderRadius: 999, border: 'none', padding: 2, display: 'flex', alignItems: 'center',
        background: 'rgba(128,128,128,.35)', cursor: 'pointer', transition: 'background .15s',
      },
      toggleOn: { background: '#2ea36f' },
      toggleKnob: { width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'transform .15s' },
      toggleKnobOn: { transform: 'translateX(20px)' },
    }

    function Toggle({ checked, onChange }) {
      return h('button', {
        type: 'button', role: 'switch', 'aria-checked': checked, onClick: () => onChange(!checked),
        style: { ...styles.toggleTrack, ...(checked ? styles.toggleOn : {}) },
      }, h('span', { style: { ...styles.toggleKnob, ...(checked ? styles.toggleKnobOn : {}) } }))
    }

    const REFRESH_OPTIONS = [[30000, '30 秒'], [60000, '1 分钟'], [300000, '5 分钟']]

    function Segmented({ value, onChange }) {
      return h('div', { role: 'radiogroup', 'aria-label': '刷新间隔', style: { display: 'inline-flex', gap: 4 } },
        REFRESH_OPTIONS.map(([ms, label]) => h('button', {
          key: ms, type: 'button', role: 'radio', 'aria-checked': value === ms,
          onClick: () => onChange(ms),
          style: { ...styles.segButton, ...(value === ms ? styles.segActive : {}) },
        }, label)))
    }

    /** 余额只来自账户余额接口；预算剩余不进入余额位。 */
    function balanceText(provider, showBalance) {
      if (showBalance === false) return null
      const balance = provider.balance
      if (balance === undefined || balance === null) return '待配置'
      if (balance.status === 'ok') return Number.isFinite(balance.amount) ? fmtMoney(balance.amount, provider.currency) : '查询失败'
      if (balance.status === 'unconfigured') return '待配置'
      if (balance.status === 'unsupported') return '不支持'
      return '查询失败'
    }

    function subscriptionText(provider) {
      const plans = Array.isArray(provider.plans) ? provider.plans : []
      if (plans.length === 0) return '套餐查询失败'
      const text = plans.slice(0, 2).map((plan) => `${windowLabel[plan.key] ?? plan.key} ${fmtUsed(plan.usedPercent)}`).join(' · ')
      if (plans.length === 1) {
        const reset = fmtReset(plans[0].resetAt)
        if (reset !== null) return `${text} · 重置 ${reset}`
      }
      return text
    }

    /** 订阅窗口节点：百分比按官方原值着色；withReset 时单窗口附重置时间（P1）。 */
    function subscriptionNodes(provider, withReset = false) {
      const plans = Array.isArray(provider.plans) ? provider.plans : []
      if (plans.length === 0) return [h('span', { key: 'fail' }, '套餐查询失败')]
      const nodes = plans.slice(0, 2).map((plan, index) => h(React.Fragment, { key: plan.key },
        index > 0 ? ' · ' : null,
        `${windowLabel[plan.key] ?? plan.key} `,
        h('b', { style: { ...styles.num, color: percentColor(plan.usedPercent ?? 0) } }, fmtUsed(plan.usedPercent))))
      if (withReset && plans.length === 1) {
        const reset = fmtReset(plans[0].resetAt)
        if (reset !== null) nodes.push(h('span', { key: 'reset' }, ` · 重置 ${reset}`))
      }
      return nodes
    }

    function Pill() {
      const [summary, setSummary] = useState(null)
      const [open, setOpen] = useState(false)
      const [error, setError] = useState(false)
      const [refreshMs, setRefreshMs] = useState(60000)
      const [view, setView] = useState('dashboard')
      const [refreshing, setRefreshing] = useState(false)
      const [hover, setHover] = useState(false)
      const [hint, setHint] = useState(false)
      const [panelMaxHeight, setPanelMaxHeight] = useState('70vh')
      const pillRef = useRef(null)

      useEffect(() => {
        try {
          if (window.localStorage.getItem('token-dash-hint-seen') !== '1') setHint(true)
        } catch { /* ignore */ }
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
        try {
          await fetch(`${API}/providers/refresh`, { method: 'POST', headers: { accept: 'application/json' } })
        } catch {
          // fall through: still refresh the summary below
        }
        await load()
      }, [load])

      const dismissHint = () => {
        setHint(false)
        try { window.localStorage.setItem('token-dash-hint-seen', '1') } catch { /* ignore */ }
      }
      const closePanel = useCallback(() => {
        setOpen(false)
        // 等 React 移除浮层后再归还焦点，避免同步 focus 被随后的重渲染吞掉
        setTimeout(() => pillRef.current?.focus(), 0)
      }, [])
      const toggle = () => {
        dismissHint()
        // #30 三次定案：浮层从 pill 正上方弹出；pill 上方空间不足时收紧 maxHeight（视口顶 8px 间隙 + pill 间距 8px），内容内部滚动
        const rect = pillRef.current?.getBoundingClientRect()
        if (rect !== undefined) {
          const available = Math.round(rect.top) - 16
          setPanelMaxHeight(`${Math.max(200, Math.min(window.innerHeight * 0.7, available))}px`)
        }
        setOpen((value) => {
          if (!value) setView('dashboard')
          return !value
        })
      }

      const providers = summary?.providers ?? []
      const current = providers.find((provider) => provider.id === summary?.currentProviderId) ?? providers[0]
      // #36/#38 定案：徽标 [API]/[订阅]（词条统一），不显示 provider 名（hover title 与 aria-label 兜底）
      let prefix = '[API]'
      let bodyNodes = [h('span', { key: 'unknown' }, '--')]
      let ariaText = '按量 API'
      if (current?.kind === 'subscription') {
        prefix = '[订阅]'
        bodyNodes = [
          h('span', { key: 'plans' }, ...subscriptionNodes(current, true)),
        ]
        ariaText = `${current.name}，订阅，账户套餐，${subscriptionText(current)}`
      } else if (current !== undefined) {
        const budget = current.budget
        const hasBudget = budget !== undefined && budget.state !== 'unset'
        const balance = balanceText(current, summary?.showBalance)
        bodyNodes = [
          h('span', { key: 'budget' }, '预算 ',
            hasBudget
              ? h('b', { style: { ...styles.num, color: budgetColor(budget.state) } }, fmtRatio(budget.percent))
              : '未设置'),
          h('span', { key: 'today' }, `今日 ${fmtMoney(current.usage?.todayCost, current.currency)}`),
          balance === null ? null : h('span', { key: 'balance' }, `余额 ${balance}`),
        ].filter(Boolean)
        ariaText = `${current.name}，按量 API，${hasBudget ? `预算已用 ${fmtRatio(budget.percent)}` : '预算未设置'}，今日 ${fmtMoney(current.usage?.todayCost, current.currency)}${balance === null ? '' : `，余额 ${balance}`}`
      }
      const hoverTitle = `${current?.name ?? ''} · ${open ? '收起' : '展开'} Token 看板`

      // #30 三次定案 + 根因修复：Panel 必须渲染在 pillWrap 内部，
      // absolute 才以 pillWrap（position:relative）为锚——此前 Panel 是 pillWrap 的兄弟节点，
      // absolute 一直挂在宿主槽位容器上，导致 v1 起浮层位置从未真正对齐过 pill。
      return h('div', { style: styles.pillWrap },
        hint && !open ? h('span', { style: styles.hint, role: 'status' }, '点击查看 Token 看板') : null,
        h('span', {
          ref: pillRef,
          'data-testid': 'token-dash-pill',
          style: { ...styles.pill, ...(hover || open ? styles.pillHover : {}) },
          onClick: toggle,
          onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
          onFocus: () => setHover(true), onBlur: () => setHover(false),
          onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } },
          role: 'button', tabIndex: 0, 'aria-expanded': open, 'aria-haspopup': 'dialog',
          'aria-label': `Token 看板：${ariaText}`,
          title: hoverTitle,
        }, h('span', { key: 'prefix', style: styles.num }, prefix), ...bodyNodes,
          h('span', { key: 'chevron', style: styles.chevron }, open ? '⌄' : '⌃')),
        open ? h(Panel, {
          summary, error, view, refreshing, maxHeight: panelMaxHeight, onView: setView, onRefresh: load, onRefreshSubs: refreshSubs, onClose: closePanel,
        }) : null)
    }

    function ApiCard({ provider }) {
      const budget = provider.budget
      const hasBudget = budget !== undefined && budget.state !== 'unset'
      const color = budgetColor(budget?.state)
      // #37：单行紧凑式（框线图）——名称 + 预算段（#33 总额度并入）+ 今日 + 余额，第二行进度条
      return h('div', { 'data-testid': `token-dash-api-card-${provider.id}`, style: styles.card },
        h('div', { style: styles.row },
          h('b', { style: styles.nameEllipsis, title: provider.name }, provider.name),
          h('span', { style: styles.rowStart },
            hasBudget
              ? h('span', { 'data-testid': `token-dash-budget-${provider.id}` },
                  '预算 ', h('b', { style: { color } }, fmtMoney(budget.used, provider.currency)),
                  ` / ${fmtMoney(budget.amount, provider.currency)} · `,
                  h('b', { style: { color } }, fmtRatio(budget.percent)))
              : h('span', { style: styles.muted }, '预算 未设置'),
            h('span', null, `今日 ${fmtMoney(provider.usage?.todayCost, provider.currency)}`),
            h('span', null, `余额 ${balanceText(provider, true) ?? '--'}`))),
        h('div', { style: { ...styles.bar, marginTop: 6, marginBottom: 0 } },
          h('div', {
            style: {
              ...(hasBudget ? { background: color } : styles.barNeutral),
              width: hasBudget ? `${Math.min(100, (budget.percent ?? 0) * 100)}%` : '100%',
            },
          })))
    }

    function SubscriptionCard({ provider }) {
      const plans = Array.isArray(provider.plans) ? provider.plans : []
      const resets = plans.map((plan) => plan.resetAt).filter((ts) => Number.isFinite(ts) && ts > 0)
      const nextReset = resets.length > 0 ? Math.min(...resets) : null
      return h('div', { 'data-testid': `token-dash-sub-card-${provider.id}`, style: { ...styles.card, marginTop: 0 } },
        h('div', { style: styles.row }, h('b', { style: styles.nameEllipsis, title: provider.name }, provider.name), h('span', { style: styles.muted }, '订阅')),
        plans.length === 0
          ? h('div', { style: { ...styles.muted, marginTop: 6 } }, '套餐查询失败')
          : h(React.Fragment, null,
              h('div', { style: { ...styles.row, marginTop: 6, flexWrap: 'wrap', justifyContent: 'flex-start' } }, subscriptionNodes(provider)),
              plans.map((plan) => h('div', { key: plan.key, style: styles.bar },
                h('div', { style: { ...styles.barFill, width: `${Math.min(100, plan.usedPercent ?? 0)}%` } }))),
              nextReset !== null ? h('div', { style: { ...styles.muted, marginTop: 2 } }, `重置 ${fmtReset(nextReset)}`) : null))
    }

    function ApiCostTable({ models }) {
      const groups = new Map()
      for (const model of models) {
        if (model.kind !== 'api') continue
        const list = groups.get(model.currency) ?? []
        list.push(model)
        groups.set(model.currency, list)
      }
      if (groups.size === 0) {
        // #40：空态保留表格结构（对齐 #32 用量表空态口径），不再整体隐藏
        return h('div', { 'data-testid': 'token-dash-cost-table', style: styles.card },
          h('div', { style: styles.row }, h('b', { style: styles.headerTitle }, 'API 费用明细 / 本月'), h('span', { style: styles.muted }, 'DSH 本机估算')),
          h('div', { style: { ...styles.muted, marginTop: 8 } }, `CNY 合计 ${fmtMoney(0, 'CNY')}`),
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: styles.table },
              h('thead', null, h('tr', null, h('th', { style: styles.th }, '模型'), h('th', { style: { ...styles.thRight, width: 64 } }, '占比'), h('th', { style: { ...styles.thRight, width: 96 } }, '费用'))),
              h('tbody', null, h('tr', { key: 'empty' },
                h('td', { style: styles.modelCell }, '—'),
                h('td', { style: styles.tdRight }, fmtRatio(0)),
                h('td', { style: styles.tdRight }, fmtMoney(0, 'CNY')))))))
      }
      return h('div', { 'data-testid': 'token-dash-cost-table', style: styles.card },
        h('div', { style: styles.row }, h('b', { style: styles.headerTitle }, 'API 费用明细 / 本月'), h('span', { style: styles.muted }, 'DSH 本机估算')),
        ...[...groups.entries()].flatMap(([currency, rows]) => [
          h('div', { key: `${currency}-head`, style: { ...styles.muted, marginTop: 8 } }, `${currency} 合计 ${fmtMoney(rows.reduce((sum, row) => sum + row.cost, 0), currency)}`),
          h('div', { key: `${currency}-wrap`, style: { overflowX: 'auto' } },
            h('table', { style: styles.table },
              h('thead', null, h('tr', null, h('th', { style: styles.th }, '模型'), h('th', { style: { ...styles.thRight, width: 64 } }, '占比'), h('th', { style: { ...styles.thRight, width: 96 } }, '费用'))),
              h('tbody', null, rows.map((model) => h('tr', { key: `${model.providerId}:${model.modelId}` },
                h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
                h('td', { style: styles.tdRight }, fmtRatio(model.share)),
                h('td', { style: { ...styles.tdRight, fontWeight: 600 } }, model.priced === false ? '未定价' : fmtMoney(model.cost, currency))))))),
        ]))
    }

    function UsageTable({ models }) {
      // #32：空态保留表格结构，数值显示 0（不再用 colSpan 文案行）
      const emptyRow = models.length === 0
        ? h('tr', { key: 'empty' },
            h('td', { style: styles.modelCell }, '—'),
            h('td', { style: styles.tdRight }, 0),
            h('td', { style: styles.tdRight }, fmtM(0)),
            h('td', { style: styles.tdRight }, fmtM(0)),
            h('td', { style: styles.tdRight }, fmtM(0)),
            h('td', { style: styles.tdRight }, '—'))
        : null
      return h('div', { 'data-testid': 'token-dash-usage-table', style: styles.card },
        h('div', { style: styles.row }, h('b', { style: styles.headerTitle }, '模型用量明细 / 本月'), h('span', { style: styles.muted }, `合计 ${fmtM(models.reduce((sum, model) => sum + (model.tokens?.total ?? 0), 0))}`)),
        h('div', { style: { overflowX: 'auto' } },
          h('table', { style: styles.table },
            h('thead', null, h('tr', null,
              h('th', { key: '模型', style: styles.th }, '模型'),
              h('th', { key: '请求', style: { ...styles.thRight, width: 44 } }, '请求'),
              h('th', { key: '输入', style: { ...styles.thRight, width: 56 } }, '输入'),
              h('th', { key: '命中', style: { ...styles.thRight, width: 56 } }, '命中'),
              h('th', { key: '输出', style: { ...styles.thRight, width: 56 } }, '输出'),
              h('th', { key: '命中率', style: { ...styles.thRight, width: 52 } }, '命中率'))),
            h('tbody', null,
              models.map((model) => h('tr', { key: `${model.providerId}:${model.modelId}` },
                h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
                h('td', { style: styles.tdRight }, model.requests),
                h('td', { style: styles.tdRight }, fmtM(model.tokens?.input ?? 0)),
                h('td', { style: styles.tdRight }, fmtM(model.tokens?.cacheRead ?? 0)),
                h('td', { style: styles.tdRight }, fmtM(model.tokens?.output ?? 0)),
                h('td', { style: styles.tdRight }, model.hitRate === null || model.hitRate === undefined ? '—' : fmtRatio(model.hitRate)))),
              emptyRow))))
    }

    function Panel({ summary, error, view, refreshing, maxHeight = '70vh', onView, onRefresh, onRefreshSubs, onClose }) {
      const panelRef = useRef(null)

      useEffect(() => {
        panelRef.current?.focus?.()
      }, [])

      // #35：点击浮层外部关闭（Esc 按 D-15 修订不做）；命中 pill/hint 时交给 pill 的 toggle，不视为外部
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

      const panelProps = {
        ref: panelRef, tabIndex: -1, role: 'dialog', 'aria-label': 'Token 看板',
        'data-testid': 'token-dash-panel',
        style: { ...styles.panel, maxHeight },
      }

      if (view === 'settings') {
        return h('div', panelProps,
          h(Settings, { summary, onBack: () => onView('dashboard'), onClose, onRefresh, onRefreshSubs }))
      }

      const models = summary?.breakdown?.models ?? []
      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const ago = fmtAgo(summary?.updatedAt)
      return h('div', panelProps,
        h('div', { style: styles.titleBar },
          h('b', { style: styles.headerTitle }, 'Token 看板'),
          h('span', { style: styles.buttonGroup },
            h('button', { style: { ...styles.button, opacity: refreshing ? 0.6 : 1 }, disabled: refreshing, onClick: onRefresh }, refreshing ? '刷新中…' : '刷新'),
            h('button', { style: styles.button, onClick: () => onView('settings') }, '设置'),
            h('button', { style: styles.button, onClick: onClose }, '关闭'))),
        error ? h('div', { style: { ...styles.row, color: '#e05a5a', marginTop: 6 } },
          h('span', null, 'Token 数据不可用'),
          h('button', { 'data-testid': 'token-dash-retry', style: styles.button, onClick: onRefresh }, '重试')) : null,
        h('div', { style: { ...styles.muted, marginTop: 6 } }, '自动侦测 API Key 类型：DeepSeek / Kimi / GLM / OpenRouter / Qwen'),
        providers.length === 0 ? h('div', { style: { ...styles.muted, marginTop: 10 } }, '未检测到已配置供应商') : null,
        api.length > 0 ? h('div', { 'data-testid': 'token-dash-api-section', style: { marginTop: 8 } },
          h('div', { style: styles.row }, h('b', { style: styles.headerTitle }, 'API 按量'), h('span', { style: styles.muted }, `已检测 ${api.length} · ${ago}`)),
          h('div', { style: api.length > 3 ? styles.scrollList : null },
            api.map((provider) => h(ApiCard, { key: provider.id, provider })))) : null,
        subscriptions.length > 0 ? h('div', { 'data-testid': 'token-dash-sub-section', style: { marginTop: 8 } },
          h('div', { style: styles.row },
            h('b', { style: styles.headerTitle }, '订阅套餐'),
            h('span', { style: styles.rowStart }, api.length === 0 ? h('span', { style: styles.muted }, ago) : null,
              h('button', { 'data-testid': 'token-dash-rescan', style: styles.button, onClick: onRefreshSubs }, '重新检测'))),
          h('div', { style: styles.subGrid }, subscriptions.map((provider) => h(SubscriptionCard, { key: provider.id, provider })))) : null,
        h(ApiCostTable, { models }),
        h(UsageTable, { models }))
    }

    function modeSelect(provider, prefs, savePrefs) {
      const value = prefs.billingModes?.[provider.id] ?? (provider.kind === 'subscription' ? 'subscription' : 'api')
      return h('select', {
        value,
        'aria-label': `${provider.name} 计费模式`,
        onChange: (event) => savePrefs({ billingModes: { ...(prefs.billingModes ?? {}), [provider.id]: event.target.value } }),
        style: styles.select,
      },
        h('option', { value: 'api' }, '按量 API'),
        provider.canSubscribe === true ? h('option', { value: 'subscription' }, '订阅套餐') : null,
        h('option', { value: 'hide' }, '不显示'))
    }

    function Settings({ summary, onBack, onClose, onRefresh, onRefreshSubs }) {
      const [prefs, setPrefs] = useState(null)
      const [budgetText, setBudgetText] = useState({})
      const [status, setStatus] = useState(null)
      const [update, setUpdate] = useState({ phase: 'idle' })
      const [logMeta, setLogMeta] = useState(null)

      useEffect(() => {
        getJson('/prefs').then((data) => {
          setPrefs(data)
          const next = {}
          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = String(value.amount ?? '')
          setBudgetText(next)
        }).catch(() => setStatus({ text: '读取失败', error: true }))
      }, [])

      function flash(text, error = false) {
        setStatus({ text, error })
        if (error !== true) setTimeout(() => setStatus((current) => (current?.text === text ? null : current)), 1500)
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
        const text = String(raw).replace(/[\u00a5$,\s]/g, '')
        const amount = Number(text)
        if (text === '' || !Number.isFinite(amount) || amount < 0 || amount > 9999999.99) {
          setStatus({ text: '请输入 0 ~ 9,999,999.99', error: true })
          return
        }
        const budgets = { ...(prefs?.budgets ?? {}), [provider.id]: { amount: Math.round(amount * 100) / 100, currency: provider.currency } }
        const saved = await savePrefs({ budgets })
        if (saved !== null) setBudgetText((current) => ({ ...current, [provider.id]: String(saved.budgets[provider.id]?.amount ?? '') }))
      }

      async function refreshSubscriptions() {
        flash('检测中…')
        await onRefreshSubs?.()
        flash('已重新检测')
      }

      async function openLogs() {
        try {
          const meta = logMeta ?? await getJson('/logs/meta')
          setLogMeta(meta)
          const app = /Mac|iPhone|iPad/.test(navigator.platform) ? 'finder' : /Linux/.test(navigator.platform) ? 'filemanager' : 'explorer'
          const response = await fetch('/open-in-app/open', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
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
          if (body?.ok === true) setUpdate({ phase: 'done', text: '已更新，重启 DSH 后生效' })
          else setUpdate({ phase: 'error', text: `更新失败（${data?.reason ?? 'unknown'}）`, command: data?.command })
        } catch (error) {
          setUpdate({ phase: 'error', text: `更新失败（${error.message}）` })
        }
      }

      async function copyCommand() {
        try {
          await navigator.clipboard.writeText(update.command ?? '')
          flash('命令已复制')
        } catch {
          setStatus({ text: '复制失败', error: true })
        }
      }

      // #34：状态提示放"关闭"左侧，固定宽度占位——出现/消失不改变标题栏布局，弹窗不 resize
      const statusSlot = h('span', {
        role: 'status', 'aria-live': 'polite',
        style: { minWidth: 88, textAlign: 'right', fontSize: 11, opacity: 0.85, color: status?.error === true ? '#e05a5a' : undefined },
      }, status?.text ?? '')

      const header = h('div', { style: styles.titleBar },
        h('div', { style: styles.rowStart },
          h('button', { style: styles.button, onClick: onBack }, '← 返回'),
          h('b', { style: styles.headerTitle }, 'Token 看板')),
        h('span', { style: styles.rowStart }, statusSlot, h('button', { style: styles.button, onClick: onClose }, '关闭')))

      if (prefs === null) return h('div', { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 10 } }, header, '加载中…')

      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const version = summary?.version ?? ''
      const cardStyle = { ...styles.card, marginTop: 0, display: 'grid', gap: 10, background: 'rgba(128,128,128,.05)' }
      const section = (title, body, action = null) => h('section', { style: { display: 'grid', gap: 8 } },
        h('div', { style: styles.row }, h('b', { style: styles.headerTitle }, title), action),
        body)

      // #39：API 卡删除计费模式下拉——单行：provider 名 + 月度预算 + 输入框 + 币种（模式依赖自动侦测）
      const apiCards = api.map((provider) => h('div', { key: provider.id, style: cardStyle },
        h('div', { style: styles.row },
          h('b', { style: styles.nameEllipsis, title: provider.name }, provider.name),
          h('span', { style: styles.rowStart },
            h('span', { style: styles.muted }, '月度预算'),
            h('input', {
              type: 'text', inputMode: 'decimal', 'aria-label': `${provider.name} 月度预算`,
              value: budgetText[provider.id] ?? (provider.budget?.amount ? String(provider.budget.amount) : ''),
              onChange: (event) => setBudgetText({ ...budgetText, [provider.id]: event.target.value }),
              onBlur: (event) => saveBudget(provider, event.currentTarget.value),
              onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } },
              style: styles.input,
            }),
            h('span', { style: styles.muted }, provider.currency)))))

      const subscriptionRows = subscriptions.map((provider) => h('div', { key: provider.id, style: styles.row },
        h('span', { style: styles.nameEllipsis, title: provider.name }, provider.name),
        h('span', { style: styles.rowStart },
          modeSelect(provider, prefs, savePrefs),
          h('span', { style: styles.muted }, `${subscriptionText(provider)} · 账户套餐`))))

      let updateControl = h('button', { style: styles.button, onClick: checkUpdate }, '检查更新')
      if (update.phase === 'checking') updateControl = h('span', { style: styles.muted }, '检查中…')
      else if (update.phase === 'confirm') updateControl = h('span', { style: styles.rowStart },
        h('span', null, `发现 ${update.latest}`),
        h('button', { style: styles.button, onClick: installUpdate }, '更新'),
        h('button', { style: styles.button, onClick: () => setUpdate({ phase: 'idle' }) }, '取消'))
      else if (update.phase === 'installing') updateControl = h('span', { style: styles.muted }, '更新中…')
      else if (update.phase === 'done') updateControl = h('span', { style: styles.muted }, update.text)
      else if (update.phase === 'error') updateControl = h('span', { style: styles.rowStart },
        h('span', { style: { color: '#e05a5a' } }, update.text),
        update.command ? h('button', { style: styles.button, onClick: copyCommand }, '复制命令') : null)

      return h('div', { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 12 } },
        header,
        api.length > 0 ? section(`API 计费（已检测 ${api.length}）`, h('div', { style: { display: 'grid', gap: 8 } }, ...apiCards)) : null,
        subscriptions.length > 0 ? section(`订阅计费（已检测 ${subscriptions.length}）`,
          h('div', { style: cardStyle }, ...subscriptionRows),
          h('button', { 'data-testid': 'token-dash-rescan', style: styles.button, onClick: refreshSubscriptions }, '重新检测')) : null,
        section('显示', h('div', { style: cardStyle },
          h('div', { style: styles.row }, h('span', null, '刷新间隔'),
            h(Segmented, { value: prefs.refreshMs, onChange: (ms) => savePrefs({ refreshMs: ms }) })),
          h('div', { style: styles.row }, h('span', null, '账户余额'),
            h(Toggle, { checked: prefs.showBalance, onChange: (next) => savePrefs({ showBalance: next }) })))),
        section('日志', h('div', { style: cardStyle },
          h('div', { style: styles.row },
            h('span', null, '查看日志'),
            h('span', { style: styles.rowStart },
              h('button', { 'data-testid': 'token-dash-log-open', style: styles.button, onClick: openLogs }, '打开日志文件夹'),
              h('button', { 'data-testid': 'token-dash-log-export', style: styles.button, onClick: exportLogs }, '导出日志'))))),
        section('价格与版本', h('div', { style: cardStyle },
          h('div', { style: styles.row },
            h('span', null, '查看价格明细'),
            h('span', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 } },
              LINKS.map(([label, url]) => h('a', { key: label, href: url, target: '_blank', rel: 'noopener', style: { ...styles.link, marginLeft: 0 } }, label)))),
          h('div', { style: styles.row },
            h('span', { style: styles.muted }, `版本 ${version}`),
            updateControl))),
        h('div', { style: styles.muted }, 'API 费用按 catalog/社区价估算；订阅只显示账户配额'))
    }

    return {
      name: PKG,
      inject: ['slots'],
      apply(ctx) {
        const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots
        if (slots === undefined || typeof slots.inject !== 'function') return
        // #46：slot 挂载上报 host 落盘（§2.5 slot 模块；fire-and-forget，失败静默）
        const reportMount = (slot) => {
          try {
            void fetch(`${API}/log`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ module: 'slot', event: 'mount.ok', meta: { slot } }),
            }).catch(() => {})
          } catch {
            // ignore
          }
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
