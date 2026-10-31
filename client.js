/**
 * dsh-token-dash — client half. P1 constraint pill, P2 dynamic provider cards,
 * P3 provider settings and diagnostic export.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dash',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const API = '/token-dash/api'
    const PKG = 'dsh-token-dash'
    const VERSION = '0.2.0'
    const LINKS = [
      ['DeepSeek', 'https://api-docs.deepseek.com/quick_start/pricing'],
      ['GLM', 'https://docs.bigmodel.cn/cn/guide/start/pricing'],
      ['Kimi', 'https://platform.moonshot.cn/docs/pricing/chat'],
      ['OpenRouter', 'https://openrouter.ai/models'],
      ['Qwen', 'https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio'],
    ]

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
        gap: 8,
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        cursor: 'pointer',
        fontVariantNumeric: 'tabular-nums',
        border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
        color: 'var(--dsh-text, inherit)',
      },
      pillWrap: { position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 8 },
      pillHover: { background: 'rgba(127,127,127,.12)' },
      hint: {
        position: 'absolute', right: 12, bottom: 30, padding: '5px 8px', borderRadius: 6,
        background: 'var(--dsh-bg-elevated, #2a2a2a)', border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
        fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      },
      chevron: {
        marginLeft: 6, padding: '0 3px', borderRadius: 4, background: 'rgba(77,141,255,.16)',
        color: 'var(--dsw-alias-state-business-primary, #6ea8ff)', fontSize: 10,
      },
      sep: { width: 1, height: 12, background: 'currentColor', opacity: 0.2 },
      num: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
      panel: {
        position: 'fixed', right: 16, bottom: 52, width: 'max-content',
        minWidth: 'min(380px, calc(100vw - 32px))', maxWidth: 'min(600px, calc(100vw - 32px))',
        boxSizing: 'border-box', maxHeight: '70vh', overflow: 'auto', zIndex: 9999,
        padding: 12, borderRadius: 12, background: 'var(--dsh-bg-elevated, #1f1f1f)',
        color: 'var(--dsh-text, #eee)', boxShadow: '0 12px 40px rgba(0,0,0,.35)', fontSize: 12,
      },
      card: { border: '1px solid var(--dsh-border, rgba(128,128,128,.25))', borderRadius: 10, padding: 12, marginTop: 10 },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
      rowStart: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      muted: { opacity: 0.65, fontSize: 11 },
      bar: { height: 6, borderRadius: 3, background: 'rgba(128,128,128,.25)', overflow: 'hidden', margin: '8px 0' },
      barFill: { height: '100%', background: '#6ea8ff' },
      barNeutral: { height: '100%', background: 'rgba(128,128,128,.45)' },
      cols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 8 },
      cols1: { display: 'grid', gridTemplateColumns: '1fr', gap: 0, marginTop: 8 },
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
      input: { width: 110, textAlign: 'right', background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,.35)', borderRadius: 5, padding: '2px 4px' },
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

    function balanceValue(provider, showBalance) {
      if (showBalance === false) return null
      const budget = provider.budget
      if (budget !== undefined && budget.state !== 'unset') return fmtMoney(budget.remaining, provider.currency)
      const balance = provider.balance
      if (balance?.status === 'ok' && Number.isFinite(balance.amount)) return fmtMoney(balance.amount, provider.currency)
      if (balance?.status === 'unsupported') return '不支持'
      return fmtMoney(0, provider.currency)
    }

    function subscriptionText(provider) {
      const plans = Array.isArray(provider.plans) ? provider.plans : []
      if (plans.length === 0) return '套餐查询失败'
      return plans.slice(0, 2).map((plan) => `${windowLabel[plan.key] ?? plan.key} ${fmtUsed(plan.usedPercent)}`).join(' · ')
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

      useEffect(() => {
        try {
          if (window.localStorage.getItem('token-dash-hint-seen') !== '1') setHint(true)
        } catch { /* ignore */ }
      }, [])

      const load = useCallback(async () => {
        setRefreshing(true)
        try {
          setSummary(await getJson('/summary'))
          setError(false)
        } catch {
          setError(true)
        } finally {
          setRefreshing(false)
        }
      }, [])

      useEffect(() => {
        getJson('/prefs').then((prefs) => setRefreshMs(prefs.refreshMs ?? 60000)).catch(() => {})
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, refreshMs)
        return () => clearInterval(timer)
      }, [load, refreshMs])

      const dismissHint = () => {
        setHint(false)
        try { window.localStorage.setItem('token-dash-hint-seen', '1') } catch { /* ignore */ }
      }
      const toggle = () => {
        dismissHint()
        setOpen((value) => {
          if (!value) setView('dashboard')
          return !value
        })
      }

      const providers = summary?.providers ?? []
      const current = providers.find((provider) => provider.id === summary?.currentProviderId) ?? providers[0]
      let prefix = '[API]'
      let content = '--'
      if (current?.kind === 'subscription') {
        prefix = '[订阅]'
        content = `${current.name}   ${subscriptionText(current)}`
      } else if (current !== undefined) {
        const budget = current.budget
        const budgetText = budget === undefined || budget.state === 'unset' ? '预算 未设置' : `预算 ${fmtRatio(budget.percent)}`
        content = `${current.name}   ${budgetText} · 今日 ${fmtMoney(current.usage?.todayCost, current.currency)} · 余额 ${balanceValue(current, summary?.showBalance) ?? '--'}`
      }
      const children = [h('span', { key: 'prefix', style: styles.num }, prefix), h('span', { key: 'content' }, content)]
      children.push(h('span', { key: 'chevron', style: styles.chevron }, open ? '⌄' : '⌃'))

      return h(React.Fragment, null,
        h('div', { style: styles.pillWrap },
          hint && !open ? h('span', { style: styles.hint, role: 'status' }, '点击查看 Token 看板') : null,
          h('span', {
            'data-testid': 'token-dash-pill',
            style: { ...styles.pill, ...(hover || open ? styles.pillHover : {}) },
            onClick: toggle,
            onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
            onFocus: () => setHover(true), onBlur: () => setHover(false),
            onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } },
            role: 'button', tabIndex: 0, 'aria-expanded': open, 'aria-haspopup': 'dialog',
            title: open ? '收起 Token 看板' : '展开 Token 看板',
          }, ...children)),
        open ? h(Panel, { summary, error, view, refreshing, onView: setView, onRefresh: load, onClose: () => setOpen(false) }) : null)
    }

    function ApiCard({ provider, showBalance }) {
      const budget = provider.budget ?? { state: 'unset', amount: 0, used: 0, remaining: 0, percent: 0 }
      const hasBudget = budget.state !== 'unset'
      const ratio = hasBudget ? Math.min(1, budget.percent ?? 0) : 1
      const color = !hasBudget ? styles.barNeutral : budget.state === 'over' ? { ...styles.barFill, background: '#e05a5a' } : budget.state === 'warn' ? { ...styles.barFill, background: '#f0a020' } : styles.barFill
      return h('div', { 'data-testid': `token-dash-api-card-${provider.id}`, style: styles.card },
        h('div', { style: styles.row },
          h('b', null, provider.name),
          h('span', { style: styles.muted }, hasBudget ? `预算 ${fmtRatio(budget.percent)}` : '预算 未设置')),
        h('div', { style: { fontSize: 20, fontWeight: 700, marginTop: 4 } },
          hasBudget ? `${fmtMoney(budget.used, provider.currency)} / ${fmtMoney(budget.amount, provider.currency)}` : fmtMoney(provider.usage?.monthCost, provider.currency)),
        h('div', { style: styles.bar }, h('div', { style: { ...color, width: `${ratio * 100}%` } })),
        h('div', { style: showBalance === false ? styles.cols1 : styles.cols },
          h('div', { style: { textAlign: 'left' } }, h('div', { style: styles.muted }, '今日'), h('b', { style: styles.num }, fmtMoney(provider.usage?.todayCost, provider.currency))),
          showBalance === false ? null : h('div', { style: { textAlign: 'right' } }, h('div', { style: styles.muted }, '余额'), h('b', { style: styles.num }, balanceValue(provider, showBalance) ?? '--'))))
    }

    function SubscriptionCard({ provider }) {
      const plans = Array.isArray(provider.plans) ? provider.plans : []
      const rows = plans.length === 0
        ? [h('div', { key: 'error', style: styles.muted }, '套餐查询失败')]
        : plans.map((plan) => h('div', { key: plan.key, style: { marginTop: 6 } },
          h('div', { style: styles.row }, h('span', null, windowLabel[plan.key] ?? plan.key), h('b', null, fmtUsed(plan.usedPercent))),
          h('div', { style: styles.bar }, h('div', { style: { ...styles.barFill, width: `${Math.min(100, plan.usedPercent ?? 0)}%` } }))))
      return h('div', { 'data-testid': `token-dash-sub-card-${provider.id}`, style: styles.card },
        h('div', { style: styles.row }, h('b', null, provider.name), h('span', { style: styles.muted }, '订阅')),
        ...rows)
    }

    function ApiCostTable({ models }) {
      const groups = new Map()
      for (const model of models) {
        if (model.kind !== 'api') continue
        const list = groups.get(model.currency) ?? []
        list.push(model)
        groups.set(model.currency, list)
      }
      if (groups.size === 0) return null
      return h('div', { 'data-testid': 'token-dash-cost-table', style: styles.card },
        h('div', { style: styles.row }, h('b', null, 'API 费用明细（仅按量供应商）'), h('span', { style: styles.muted }, '按币种分组')),
        ...[...groups.entries()].flatMap(([currency, rows]) => [
          h('div', { key: `${currency}-head`, style: { ...styles.muted, marginTop: 8 } }, `${currency} 合计 ${fmtMoney(rows.reduce((sum, row) => sum + row.cost, 0), currency)}`),
          h('div', { key: `${currency}-wrap`, style: { overflowX: 'auto' } },
            h('table', { style: styles.table },
              h('thead', null, h('tr', null, h('th', { style: styles.th }, '模型'), h('th', { style: styles.thRight }, '占比'), h('th', { style: styles.thRight }, '费用'))),
              h('tbody', null, rows.map((model) => h('tr', { key: `${model.providerId}:${model.modelId}` },
                h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
                h('td', { style: styles.tdRight }, fmtRatio(model.share)),
                h('td', { style: { ...styles.tdRight, fontWeight: 600 } }, model.priced === false ? '未定价' : fmtMoney(model.cost, currency))))))),
        ]))
    }

    function UsageTable({ models }) {
      return h('div', { 'data-testid': 'token-dash-usage-table', style: styles.card },
        h('div', { style: styles.row }, h('b', null, '模型用量明细（全部供应商）'), h('span', { style: styles.muted }, `合计 ${fmtM(models.reduce((sum, model) => sum + (model.tokens?.total ?? 0), 0))}`)),
        h('div', { style: { overflowX: 'auto' } },
          h('table', { style: styles.table },
            h('thead', null, h('tr', null, ['模型', '请求', '输入', '命中', '输出', '命中率'].map((label, index) => h('th', { key: label, style: index === 0 ? styles.th : styles.thRight }, label)))),
            h('tbody', null, models.map((model) => h('tr', { key: `${model.providerId}:${model.modelId}` },
              h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
              h('td', { style: styles.tdRight }, model.requests),
              h('td', { style: styles.tdRight }, fmtM(model.tokens?.input ?? 0)),
              h('td', { style: styles.tdRight }, fmtM(model.tokens?.cacheRead ?? 0)),
              h('td', { style: styles.tdRight }, fmtM(model.tokens?.output ?? 0)),
              h('td', { style: styles.tdRight }, model.hitRate === null || model.hitRate === undefined ? '—' : fmtRatio(model.hitRate))))),
            models.length === 0 ? h('tr', null, h('td', { style: styles.modelCell, colSpan: 6 }, '本月暂无消耗')) : null)))
    }

    function Panel({ summary, error, view, refreshing, onView, onRefresh, onClose }) {
      if (view === 'settings') {
        return h('div', { 'data-testid': 'token-dash-panel', style: styles.panel },
          h(Settings, { summary, onBack: () => onView('dashboard'), onClose, onRefresh }))
      }
      const models = summary?.breakdown?.models ?? []
      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      return h('div', { 'data-testid': 'token-dash-panel', style: styles.panel },
        h('div', { style: styles.row },
          h('b', null, 'Token 看板'),
          h('span', null,
            h('button', { style: { ...styles.button, opacity: refreshing ? 0.6 : 1 }, disabled: refreshing, onClick: onRefresh }, refreshing ? '刷新中…' : '刷新'),
            h('button', { style: { ...styles.button, marginLeft: 8 }, onClick: () => onView('settings') }, '设置'),
            h('button', { style: { ...styles.button, marginLeft: 8 }, onClick: onClose }, '关闭'))),
        error ? h('div', { style: { color: '#e05a5a', marginTop: 6 } }, 'Token 数据不可用') : null,
        h('div', { style: { ...styles.muted, marginTop: 6 } }, '自动侦测 API Key 类型：DeepSeek / Kimi / GLM / OpenRouter / Qwen'),
        providers.length === 0 ? h('div', { style: { ...styles.muted, marginTop: 10 } }, '未检测到已配置供应商') : null,
        api.length > 0 ? h('div', { 'data-testid': 'token-dash-api-section', style: { marginTop: 8 } },
          h('b', null, `API 按量（已检测 ${api.length}）`),
          api.map((provider) => h(ApiCard, { key: provider.id, provider, showBalance: summary?.showBalance }))) : null,
        subscriptions.length > 0 ? h('div', { 'data-testid': 'token-dash-sub-section', style: { marginTop: 8 } },
          h('div', { style: styles.row }, h('b', null, `订阅套餐（已检测 ${subscriptions.length}）`), h('button', { style: styles.button, onClick: onRefresh }, '重新检测')),
          subscriptions.map((provider) => h(SubscriptionCard, { key: provider.id, provider }))) : null,
        h(ApiCostTable, { models }),
        h(UsageTable, { models }),
        h('div', { style: { ...styles.muted, marginTop: 8 } }, `DSH 本机估算 / ${fmtAgo(summary?.updatedAt)}刷新`))
    }

    function Settings({ summary, onBack, onClose, onRefresh }) {
      const [prefs, setPrefs] = useState(null)
      const [budgetText, setBudgetText] = useState({})
      const [status, setStatus] = useState('')
      const [logMeta, setLogMeta] = useState(null)

      useEffect(() => {
        getJson('/prefs').then((data) => {
          setPrefs(data)
          const next = {}
          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = String(value.amount ?? '')
          setBudgetText(next)
        }).catch(() => setStatus('读取失败'))
      }, [])

      async function savePrefs(patch) {
        if (prefs === null) return null
        try {
          const saved = await putPrefs({ ...prefs, ...patch })
          setPrefs(saved)
          setStatus('已保存')
          setTimeout(() => setStatus(''), 1500)
          void onRefresh?.()
          return saved
        } catch (error) {
          setStatus(`保存失败：${error.message}`)
          return null
        }
      }

      async function saveBudget(provider, raw) {
        const text = String(raw).replace(/[\u00a5$,\s]/g, '')
        const amount = Number(text)
        if (text === '' || !Number.isFinite(amount) || amount < 0 || amount > 9999999.99) {
          setStatus('请输入 0 ~ 9,999,999.99')
          return
        }
        const budgets = { ...(prefs?.budgets ?? {}), [provider.id]: { amount: Math.round(amount * 100) / 100, currency: provider.currency } }
        const saved = await savePrefs({ budgets })
        if (saved !== null) setBudgetText((current) => ({ ...current, [provider.id]: String(saved.budgets[provider.id]?.amount ?? '') }))
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
          setStatus('已打开日志文件夹')
        } catch {
          try {
            const meta = logMeta ?? await getJson('/logs/meta')
            await navigator.clipboard.writeText(meta.dir)
            setStatus('无法打开，已复制路径')
          } catch {
            setStatus('打开日志失败')
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
          setStatus('日志已导出')
        } catch {
          setStatus('日志导出失败')
        }
      }

      async function checkUpdate() {
        setStatus('检查中…')
        try {
          const data = await getJson('/update')
          setStatus(data.published === false ? '未发布' : data.hasUpdate ? `发现 ${data.latest}` : '已是最新')
        } catch {
          setStatus('检查失败')
        }
      }

      const header = h('div', { style: styles.row },
        h('div', { style: styles.rowStart },
          h('button', { style: styles.button, onClick: () => { void savePrefs({}); onBack() } }, '← 返回'),
          h('b', { style: { fontSize: 13 } }, 'Token 看板')),
        h('button', { style: styles.button, onClick: onClose }, '关闭'))

      if (prefs === null) return h('div', { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 10 } }, header, 'Token 看板加载中…')

      const providers = summary?.providers ?? []
      const api = providers.filter((provider) => provider.kind === 'api')
      const subscriptions = providers.filter((provider) => provider.kind === 'subscription')
      const cardStyle = { ...styles.card, marginTop: 0, display: 'grid', gap: 10, background: 'rgba(128,128,128,.05)' }
      const section = (title, body, action = null) => h('section', { style: { display: 'grid', gap: 8 } },
        h('div', { style: styles.row }, h('b', { style: { fontSize: 13 } }, title), action),
        body)

      const apiCards = api.map((provider) => h('div', { key: provider.id, style: cardStyle },
        h('div', { style: styles.row },
          h('b', null, provider.name),
          h('select', {
            value: prefs.billingModes?.[provider.id] ?? 'api',
            onChange: (event) => savePrefs({ billingModes: { ...(prefs.billingModes ?? {}), [provider.id]: event.target.value } }),
            style: styles.select,
          }, h('option', { value: 'api' }, '按量 API'), provider.id === 'zhipu' || provider.id === 'moonshot' ? h('option', { value: 'subscription' }, '订阅套餐') : null)),
        h('div', { style: styles.row },
          h('span', { style: styles.muted }, '月度预算'),
          h('span', { style: styles.rowStart },
            h('input', {
              type: 'text', inputMode: 'decimal', value: budgetText[provider.id] ?? (provider.budget?.amount ? String(provider.budget.amount) : ''),
              onChange: (event) => setBudgetText({ ...budgetText, [provider.id]: event.target.value }),
              onBlur: (event) => saveBudget(provider, event.currentTarget.value),
              onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } },
              style: styles.input,
            }),
            h('span', { style: styles.muted }, provider.currency)))))

      const subscriptionRows = subscriptions.map((provider) => {
        const control = h('select', {
          value: prefs.billingModes?.[provider.id] ?? 'subscription',
          onChange: (event) => savePrefs({ billingModes: { ...(prefs.billingModes ?? {}), [provider.id]: event.target.value } }),
          style: styles.select,
        }, h('option', { value: 'subscription' }, '订阅套餐'), h('option', { value: 'api' }, '按量 API'))
        return h('div', { key: provider.id, style: styles.row },
          h('span', null, provider.name),
          h('span', { style: styles.rowStart }, control, h('span', { style: styles.muted }, `${subscriptionText(provider)} · 账户套餐`)))
      })

      return h('div', { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 12 } },
        header,
        api.length > 0 ? section('API 计费', h('div', { style: { display: 'grid', gap: 8 } }, ...apiCards)) : null,
        subscriptions.length > 0 ? section('订阅计费',
          h('div', { style: cardStyle }, ...subscriptionRows),
          h('button', { style: styles.button, onClick: () => { setStatus('检测中…'); void onRefresh?.() } }, '重新检测')) : null,
        section('显示', h('div', { style: cardStyle },
          h('div', { style: styles.row }, h('span', null, '刷新间隔'), h('select', {
            value: prefs.refreshMs,
            onChange: (event) => savePrefs({ refreshMs: Number(event.target.value) }),
            style: styles.select,
          }, [30000, 60000, 300000].map((ms) => h('option', { key: ms, value: ms }, ms === 30000 ? '30 秒' : ms === 60000 ? '1 分钟' : '5 分钟')))),
          h('div', { style: styles.row }, h('span', null, '账户余额'), h(Toggle, { checked: prefs.showBalance, onChange: (next) => savePrefs({ showBalance: next }) })),
          h('div', { style: styles.row }, h('span', null, '本月 Token'), h(Toggle, { checked: prefs.showMonthTokens !== false, onChange: (next) => savePrefs({ showMonthTokens: next }) })))),
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
            h('span', { style: styles.muted }, `版本 ${VERSION} ${status}`),
            h('button', { style: styles.button, onClick: checkUpdate }, '检查更新')))),
        h('div', { style: styles.muted }, 'API 费用按 catalog/社区价估算；订阅只显示账户配额'))
    }

    return {
      name: PKG,
      inject: ['slots'],
      apply(ctx) {
        const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots
        if (slots === undefined || typeof slots.inject !== 'function') return
        slots.inject('conversation.hero.agentPreset', () =>
          slots.register({ name: 'conversation.hero.agentPreset', id: 'token-dash-home', order: 10 }, Pill))
        slots.inject('conversation.composer.dock', () =>
          slots.register({ name: 'conversation.composer.dock', id: 'token-dash-input', order: -1 }, Pill))
      },
    }
  },
})
