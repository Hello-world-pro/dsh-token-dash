/**
 * dsh-token-dash — client 半：底栏 Pill、浮层看板与设置 section。
 * 手写 ModuleLoader bundle，id 必须等于包名。
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-dash',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useState } = React

    const API = '/token-dash/api'
    const PKG = 'dsh-token-dash'
    const LINKS = [
      ['DeepSeek', 'https://platform.deepseek.com/usage'],
      ['GLM', 'https://open.bigmodel.cn/user-center/usage'],
      ['Kimi', 'https://platform.moonshot.cn/console'],
    ]

    const fmtMoney = (value) => `¥${Number(value ?? 0).toFixed(2)}`
    const fmtM = (value) => `${(Number(value ?? 0) / 1e6).toFixed(2)}M`
    const fmtPct = (value) => `${(Number(value ?? 0) * 100).toFixed(1)}%`
    const fmtAgo = (ts) => {
      if (!Number.isFinite(ts)) return '加载中'
      const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000))
      if (seconds < 60) return '刚刚'
      if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
      return `${Math.floor(seconds / 3600)} 小时前`
    }
    const modelTitle = (model) => {
      const name = model.displayName ?? model.name
      if (!model.providerId || model.providerId === 'unknown') return name
      return [model.providerName, name].filter(Boolean).join(' / ')
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
      sep: { width: 1, height: 12, background: 'currentColor', opacity: 0.2 },
      num: { fontWeight: 600 },
      panel: {
        position: 'fixed',
        right: 16,
        bottom: 52,
        width: 'max-content',
        minWidth: 'min(380px, calc(100vw - 32px))',
        maxWidth: 'min(560px, calc(100vw - 32px))',
        boxSizing: 'border-box',
        maxHeight: '70vh',
        overflow: 'auto',
        zIndex: 9999,
        padding: 12,
        borderRadius: 12,
        background: 'var(--dsh-bg-elevated, #1f1f1f)',
        color: 'var(--dsh-text, #eee)',
        boxShadow: '0 12px 40px rgba(0,0,0,.35)',
        fontSize: 12,
      },
      card: {
        border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
      },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
      muted: { opacity: 0.65, fontSize: 11 },
      bar: { height: 6, borderRadius: 3, background: 'rgba(128,128,128,.25)', overflow: 'hidden', margin: '8px 0' },
      barFill: { height: '100%', background: '#f0a020' },
      cols: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 8 },
      table: { width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', tableLayout: 'auto', marginTop: 6 },
      th: { textAlign: 'left', opacity: 0.6, fontWeight: 400, padding: '4px 8px', whiteSpace: 'nowrap' },
      thRight: {
        textAlign: 'right',
        opacity: 0.6,
        fontWeight: 400,
        padding: '4px 8px',
        borderLeft: '1px solid rgba(128,128,128,.15)',
        whiteSpace: 'nowrap',
      },
      td: { padding: '4px 8px', borderTop: '1px solid rgba(128,128,128,.15)', whiteSpace: 'nowrap' },
      tdRight: {
        padding: '4px 8px',
        textAlign: 'right',
        borderTop: '1px solid rgba(128,128,128,.15)',
        borderLeft: '1px solid rgba(128,128,128,.15)',
        whiteSpace: 'nowrap',
      },
      modelCell: {
        padding: '4px 8px',
        borderTop: '1px solid rgba(128,128,128,.15)',
        whiteSpace: 'nowrap',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      link: { color: 'inherit', textDecoration: 'underline', cursor: 'pointer', marginLeft: 12 },
      button: {
        border: '1px solid var(--dsh-border, rgba(128,128,128,.35))',
        background: 'transparent',
        color: 'inherit',
        borderRadius: 6,
        padding: '2px 8px',
        cursor: 'pointer',
      },
      toggleTrack: {
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(128,128,128,.35)',
        cursor: 'pointer',
        transition: 'background .15s',
      },
      toggleOn: { background: '#2ea36f' },
      toggleKnob: { width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'transform .15s' },
      toggleKnobOn: { transform: 'translateX(20px)' },
    }

    function BalanceText({ balance, prefix = true }) {
      if (balance?.status === 'hidden') return null
      let text = '--'
      if (balance?.status === 'ok') text = fmtMoney(balance.amount)
      else if (balance?.status === 'unsupported') text = '第三方不支持'
      else if (balance?.status === 'unconfigured') text = '待配置'
      else if (balance?.status === 'error') text = '查询失败'
      return prefix ? `余额 ${text}` : text
    }

    function Toggle({ checked, onChange }) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          onClick: () => onChange(!checked),
          style: { ...styles.toggleTrack, ...(checked ? styles.toggleOn : {}) },
        },
        h('span', { style: { ...styles.toggleKnob, ...(checked ? styles.toggleKnobOn : {}) } }),
      )
    }

    function Pill() {
      const [summary, setSummary] = useState(null)
      const [open, setOpen] = useState(false)
      const [error, setError] = useState(false)
      const [refreshMs, setRefreshMs] = useState(60000)
      const [view, setView] = useState('dashboard')
      const [refreshing, setRefreshing] = useState(false)

      const load = useCallback(async () => {
        setRefreshing(true)
        try {
          const data = await getJson('/summary')
          setSummary(data)
          setError(false)
        } catch {
          setError(true)
        } finally {
          setRefreshing(false)
        }
      }, [])

      useEffect(() => {
        getJson('/prefs')
          .then((prefs) => setRefreshMs(prefs.refreshMs ?? 60000))
          .catch(() => {})
      }, [])

      useEffect(() => {
        load()
        const timer = setInterval(load, refreshMs)
        return () => clearInterval(timer)
      }, [load, refreshMs])

      const toggle = () => {
        setOpen((value) => {
          if (!value) setView('dashboard')
          return !value
        })
      }
      const percent = summary?.budget?.state === 'unset' ? '设置预算' : fmtPct(summary?.budget?.percent)
      const monthTokens = fmtM(summary?.tokens?.total)
      const balanceHidden = summary?.showBalance === false || summary?.balance?.status === 'hidden'
      return h(
        React.Fragment,
        null,
        h(
          'span',
          {
            'data-testid': 'token-dash-pill',
            style: styles.pill,
            onClick: toggle,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggle()
              }
            },
            role: 'button',
            tabIndex: 0,
          },
          h('span', null, '预算 ', h('b', { style: styles.num }, percent)),
          balanceHidden ? null : h(React.Fragment, null, h('span', { style: styles.sep }), h('span', null, h(BalanceText, { balance: summary?.balance }))),
          h('span', { style: styles.sep }),
          h('span', null, '今日 ', h('b', { style: styles.num }, fmtMoney(summary?.today?.cost))),
          h('span', { style: styles.sep }),
          h('span', null, '本月 ', h('b', { style: styles.num }, monthTokens)),
        ),
        open
          ? h(Panel, {
              summary,
              error,
              view,
              refreshing,
              onView: setView,
              onRefresh: load,
              onClose: () => setOpen(false),
            })
          : null,
      )
    }

    function BudgetCard({ summary }) {
      const budget = summary?.budget ?? {}
      const pct = budget.state === 'unset' ? 0 : Math.min(1, budget.percent ?? 0)
      const balanceHidden = summary?.showBalance === false || summary?.balance?.status === 'hidden'
      return h(
        'div',
        { style: styles.card },
        h('div', { style: styles.row }, h('b', null, 'DSH本月估算'), h('b', { style: styles.num }, budget.state === 'unset' ? '--' : fmtPct(budget.percent))),
        h('div', { style: { fontSize: 20, fontWeight: 700, marginTop: 4 } }, `${fmtMoney(budget.used)} / ${fmtMoney(budget.amount)}`),
        h('div', { style: styles.bar }, h('div', { style: { ...styles.barFill, width: `${pct * 100}%` } })),
        h(
          'div',
          {
            'data-testid': 'token-dash-budget-cols',
            style: {
              ...styles.cols,
              gridTemplateColumns: balanceHidden ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
            },
          },
          h(
            'div',
            { style: { textAlign: 'left' } },
            h('div', { style: styles.muted }, '今日'),
            h('b', { style: styles.num }, fmtMoney(summary?.today?.cost)),
          ),
          h(
            'div',
            { style: { textAlign: balanceHidden ? 'right' : 'center' } },
            h('div', { style: styles.muted }, '剩余'),
            h('b', { style: styles.num }, fmtMoney(budget.remaining)),
          ),
          balanceHidden
            ? null
            : h(
                'div',
                { style: { textAlign: 'right' } },
                h('div', { style: styles.muted }, '余额'),
                h(BalanceText, { balance: summary?.balance, prefix: false }),
              ),
        ),
        h('div', { style: { ...styles.muted, marginTop: 8 } }, `估算口径 / ${fmtAgo(summary?.updatedAt)}刷新`),
      )
    }

    function CostTable({ models }) {
      return h(
        'div',
        { style: styles.card },
        h('div', { style: styles.row }, h('b', null, '本月 模型费用明细'), h('span', { style: styles.muted }, `合计 ${fmtMoney(models?.reduce((s, m) => s + m.cost, 0))}`)),
        h(
          'div',
          { style: { overflowX: 'auto' } },
          h(
            'table',
            { style: styles.table },
            h('thead', null, h('tr', null, h('th', { style: styles.th }, '模型'), h('th', { style: styles.thRight }, '占比'), h('th', { style: styles.thRight }, '费用'))),
            h(
              'tbody',
              null,
              (models ?? []).map((model) =>
                h(
                  'tr',
                  { key: `${model.providerId}:${model.modelId}` },
                  h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
                  h('td', { style: styles.tdRight }, fmtPct(model.share)),
                  h('td', { style: { ...styles.tdRight, fontWeight: 600 } }, model.priced === false ? '未定价' : fmtMoney(model.cost)),
                ),
              ),
              (models ?? []).length === 0 ? h('tr', null, h('td', { style: styles.modelCell, colSpan: 3 }, '本月暂无消耗')) : null,
            ),
          ),
        ),
      )
    }

    function UsageTable({ models }) {
      return h(
        'div',
        { style: styles.card },
        h('div', { style: styles.row }, h('b', null, '本月 模型用量明细'), h('span', { style: styles.muted }, `合计 ${fmtM(models?.reduce((s, m) => s + m.tokens.total, 0))}`)),
        h(
          'div',
          { style: { overflowX: 'auto' } },
          h(
            'table',
            { style: styles.table },
            h('thead', null, h('tr', null, ['模型', '请求', '输入', '命中', '输出', '命中率'].map((label, i) => h('th', { key: label, style: i === 0 ? styles.th : styles.thRight }, label)))),
            h(
              'tbody',
              null,
              (models ?? []).map((model) =>
                h(
                  'tr',
                  { key: `${model.providerId}:${model.modelId}` },
                  h('td', { style: styles.modelCell, title: modelTitle(model) }, modelTitle(model)),
                  h('td', { style: styles.tdRight }, model.requests),
                  h('td', { style: styles.tdRight }, fmtM(model.tokens.input)),
                  h('td', { style: styles.tdRight }, fmtM(model.tokens.cacheRead)),
                  h('td', { style: styles.tdRight }, fmtM(model.tokens.output)),
                  h('td', { style: styles.tdRight }, model.hitRate === null ? '—' : fmtPct(model.hitRate)),
                ),
              ),
            ),
          ),
        ),
      )
    }

    function Panel({ summary, error, view, refreshing, onView, onRefresh, onClose }) {
      if (view === 'settings') {
        return h(
          'div',
          { 'data-testid': 'token-dash-panel', style: styles.panel },
          h(Settings, { onBack: () => onView('dashboard'), onClose, onRefresh }),
        )
      }
      const models = summary?.breakdown?.models ?? []
      return h(
        'div',
        { 'data-testid': 'token-dash-panel', style: styles.panel },
        h(
          'div',
          { style: styles.row },
          h('b', null, 'Token 看板'),
          h(
            'span',
            null,
            h(
              'button',
              { style: { ...styles.button, opacity: refreshing ? 0.6 : 1 }, disabled: refreshing, onClick: onRefresh },
              refreshing ? '刷新中…' : '刷新',
            ),
            h('button', { style: { ...styles.button, marginLeft: 8 }, onClick: () => onView('settings') }, '设置'),
            h('button', { style: { ...styles.button, marginLeft: 8 }, onClick: onClose }, '关闭'),
          ),
        ),
        error ? h('div', { style: { color: '#e05a5a', marginTop: 6 } }, 'Token 数据不可用') : null,
        h(BudgetCard, { summary }),
        h(CostTable, { models }),
        h(UsageTable, { models }),
      )
    }

    function Settings({ onBack, onClose, onRefresh }) {
      const [prefs, setPrefs] = useState(null)
      const [budgetText, setBudgetText] = useState('')
      const [status, setStatus] = useState('')

      useEffect(() => {
        getJson('/prefs')
          .then((data) => {
            setPrefs(data)
            setBudgetText(String(data.budget.amount))
          })
          .catch(() => setStatus('读取失败'))
      }, [])

      async function write(next) {
        const saved = await putPrefs(next)
        setPrefs(saved)
        return saved
      }

      async function saveBudget() {
        if (prefs === null) return true
        const raw = String(budgetText).replace(/[\u00a5,\s]/g, '')
        const amount = Number(raw)
        if (raw === '' || !Number.isFinite(amount) || amount < 0 || amount > 9999999.99) {
          setStatus('请输入 0 ~ 9,999,999.99')
          return false
        }
        const next = { ...prefs, budget: { ...prefs.budget, amount: Math.round(amount * 100) / 100 } }
        try {
          const saved = await write(next)
          setBudgetText(String(saved.budget.amount))
          setStatus('已保存')
          setTimeout(() => setStatus(''), 1500)
          void onRefresh?.()
          return true
        } catch (error) {
          setStatus(`保存失败：${error.message}`)
          return false
        }
      }

      function savePatch(patch) {
        if (prefs === null) return
        const next = { ...prefs, ...patch }
        setPrefs(next)
        write(next)
          .then(() => {
            setStatus('已保存')
            setTimeout(() => setStatus(''), 1500)
            void onRefresh?.()
          })
          .catch((error) => setStatus(`保存失败：${error.message}`))
      }

      function back() {
        void saveBudget()
        onBack()
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

      const header = h(
        'div',
        { style: styles.row },
        h('button', { style: styles.button, onClick: back }, '← 返回'),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('b', null, 'Token 看板'),
          h('button', { style: styles.button, onClick: onClose }, '关闭'),
        ),
      )

      if (prefs === null) {
        return h('div', { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 10 } }, header, 'Token 看板加载中…')
      }

      return h(
        'div',
        { 'data-testid': 'token-dash-settings', style: { fontSize: 12, display: 'grid', gap: 10 } },
        header,
        h(
          'label',
          { style: styles.row },
          h('span', null, '月度预算'),
          h('input', {
            type: 'text',
            inputMode: 'decimal',
            value: budgetText,
            onChange: (event) => setBudgetText(event.target.value),
            onBlur: saveBudget,
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                setBudgetText(String(prefs.budget.amount))
                setStatus('')
              }
            },
            style: { width: 160, textAlign: 'right' },
          }),
        ),
        h(
          'label',
          { style: styles.row },
          h('span', null, '刷新间隔'),
          h(
            'select',
            {
              value: prefs.refreshMs,
              onChange: (event) => savePatch({ refreshMs: Number(event.target.value) }),
            },
            [30000, 60000, 300000].map((ms) => h('option', { key: ms, value: ms }, ms === 30000 ? '30 秒' : ms === 60000 ? '1 分钟' : '5 分钟')),
          ),
        ),
        h(
          'div',
          { style: styles.row },
          h('span', null, '账户余额'),
          h(Toggle, { checked: prefs.showBalance, onChange: (next) => savePatch({ showBalance: next }) }),
        ),
        h(
          'div',
          { style: styles.row },
          h('span', null, '查看明细'),
          h(
            'span',
            null,
            LINKS.map(([label, url]) => h('a', { key: label, href: url, target: '_blank', rel: 'noopener', style: styles.link }, label)),
          ),
        ),
        h(
          'div',
          { style: styles.row },
          h('span', { style: styles.muted }, `版本 0.1.0 ${status}`),
          h('button', { style: styles.button, onClick: checkUpdate }, '检查更新'),
        ),
        h('div', { style: styles.muted }, '费用按内置官方峰谷价估算，仅供参考'),
      )
    }

    return {
      name: PKG,
      inject: ['slots'],
      apply(ctx) {
        const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots
        if (slots === undefined || typeof slots.inject !== 'function') return
        slots.inject('conversation.composer.dock', () =>
          slots.register({ name: 'conversation.composer.dock', id: 'token-dash', order: 10 }, Pill),
        )
      },
    }
  },
})
