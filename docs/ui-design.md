# Token 看板 UI 设计

> 唯一 UI 设计真源：视觉、信息层级、文案与交互以本文件为准。<br>
> **当前版本：v3.1（2026-11-04 组件与字号定稿）**——新增 §2.5 公共组件（ProgressRing / ResetClock / TokenTable）与 §2.6 字号 token；P2 主区四列、用量表按「单位 / `[` 交界」对齐。<br>
> 底框层级：`Panel → Section → Tile`，最多两层；分区不靠色相，状态色只给预算/金额/错误。<br>
> 架构与数据流见 [design.md](design.md)；本轮迭代的需求与实施细节见 [UI 迭代计划](plan/archived/feature_ui_refresh.md)。

## 变更记录（里程碑）

> 只保留影响结构与口径的里程碑；逐版细节见 `git log -- docs/ui-design.md`。状态按当前代码回填。

| 日期 | 版本 | 变更 | 状态 |
|---|---|---|---|
| 2026-11-04 | v3.1 | **组件与字号定稿**：新增 §2.5（ProgressRing 14/20、ResetClock 拆 relative+absolute、TokenTable 全自适应 + `[` 交界基线）与 §2.6（`--td-fs-*` / `--td-lh-*` 六个 token） | 待实施 |
| 2026-11-04 | v3.0 | **结构重构**：P3 改左侧常驻 + 中栏整页（`main` + `sidebar.panellist`）；P2 只留当前模型、宽度自适应、去进度条与设置开关；P1 订阅段加环；关闭入口加 Esc | 待实施 |
| 2026-11-03 | v2.40 | **面板宽度调整**：320→360 CSS px；M 级 Tokens/请求/命中单行完整显示；窄视口仍按 `100vw - 16px` 收缩 | 已实现，待桌面验证 |
| 2026-11-02 | v2.39 | **按代码校准**：预算名称行四列 `1fr / 34px / 1fr / 72px`、tile 与明细字号、名称 12px、范围不持久化、tooltip 文案 | 已实现 |
| 2026-11-02 | v2.31 ~ v2.38 | **预算与订阅行排版**：名称行四列 + 满宽 4px 条；余额与费用左缘对齐；订阅窗口 5h/周 定宽成列、右侧贴边；P3 订阅行只留名称 + 重置；`ResetLabel` 三档单位；标题去掉「(已检测 N)」；两格卡删「按币种」、金额改主蓝、副行只留三数字 | 已实现 |
| 2026-11-02 | v2.29 ~ v2.30 | **数据整合**：两格卡统一取 VM（总费用按币种、Tokens 含缓存读写）、首屏占位；预算未填写默认 100、清空写 0；新增数据导出 / 导入，并与日志合并为「数据与日志」，P3 收敛为五分区 | 已实现 |
| 2026-11-02 | v2.19 ~ v2.28 | **交互与视觉打磨**：按钮与胶囊改 DSH token、tooltip 独立 fixed 浮层并翻转、订阅刷新与检查更新图标化、启动静默检查更新、界面跟随 DSH locale、两格卡框线回补、明细单行 | 已实现 |
| 2026-11-02 | v2.4 ~ v2.18 | **骨架定稿**：`用量 / 设置` 双 tab 浮层、Panel→Section→Tile 三层底框、行卡片明细、MiniBar 48×4、Segmented 胶囊、日志 / 价格与版本分区成形 | 已实现 |
| 2026-11-02 | v2.1 ~ v2.3 | **细化**：迷你条全局固定 48×4；Segmented 参考 cc-switch 胶囊；明细改三列 `Tokens / 请求 / 命中` | 已实现 |
| 2026-11-02 | v2 | **迭代定稿**：面板 420→320；明细两表合并为行卡片；进度条满宽→48×4 迷你条；订阅统一 QuotaBlock；汇总砍请求 / 命中两格；字号阶梯 13 / 11 / 10.5 | 已实现 |
| 2026-11-02 | v1 | 从已归档 UI checklist 收敛为 UI 唯一真源 | 已发布 1.0.x |

## 1. 定位与信息层级

| 层 | 回答的问题 | 只放什么 |
|---|---|---|
| P1 Pill | 现在怎样？ | 当前 provider 的模式、预算 %、今日、余额（订阅为窗口 %） |
| P2 浮层 | 当前模型现在怎样？ | 预算 / 真实余额 / 本月已花 + 本身份的订阅窗口 + 范围用量表 |
| P3 整页 | 全部家当 + 怎么配？ | 按量计价、订阅套餐、范围与明细、设置与数据管理 |

不重复原则：同一事实只在一个层级承担"主展示"；下层补增量，不原样复读。v3.0 起取消双 tab：浮层只讲当前模型，整页讲全部家当。

| 信息 | P1 | P2 浮层 | P3 整页 |
|---|---|---|---|
| 当前 provider 名称 | 否（只有模式徽标） | 是（顶行） | 是（每行一个） |
| 预算 % / 已用总额 | 环 + % | 环 + % + 已用/预算 | 月度预算 · 已用 · 计划余额 · 真实余额 |
| 本月已花 / 今日 | 今日 | 本月已花 | 否（按量列已用金额） |
| 账户余额 | 是（开关控制） | 是（第三列「真实余额」） | 是（按量表「真实余额」） |
| 范围费用 / Tokens | 否 | 两格卡 + 四列用量表 | 两格卡 + 八列明细表 |
| 按模型明细 | 否 | 四列（模型/Tokens/请求/命中，无费用） | 八列（含费用（API 计价估算）） |
| 订阅窗口 | 是（当前） | 当前 provider 的 1–3 窗 | 全部订阅 provider |

## 2. 全局视觉（cc-switch 托盘面板语言）

| 项 | 规格 |
|---|---|
| 面板宽 | P2 **内容自适应** `fit-content`（280–480），贴 pill 上方 8px、右缘不足向左翻转、最大高 `min(70vh, pillTop-16)`；P3 用宿主中栏整宽（1280 视口下实测 1000px） |
| 字号阶梯 | 见 §2.6：P1 `--td-fs-pill`（12px，对齐底栏胶囊）；P2 / P3 `--td-fs-body`（13px，对齐消息正文）；括号 12px；仅「总费用 / 真实 Tokens」17px / 600 |
| 主色 | `var(--dsw-alias-state-business-primary, #6ea8ff)` |
| 警告 / 超支 | `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary`；tile 金额强调 `var(--td-accent)`（主蓝）；回退 `#f0a020` / `#e05a5a` |
| 文字色 | 标题/数值 `--dsw-alias-label-primary`；副行/标签 `--dsw-alias-label-secondary`；弱提示 `--dsw-alias-label-tertiary`；不再用 opacity 模拟 muted |
| 色彩纪律 | 蓝用于按钮、选中、焦点和 MiniBar；amber 警告、green 金额、红超支；**卡片/分区仍灰阶**；分区不靠色相区分 |
| 按钮 | 默认 DSH 蓝：`--td-accent: var(--dsw-alias-state-business-primary, #6ea8ff)`；背景 `color-mix(in srgb, var(--td-accent) 16%, transparent)`、边框 32%、文字/图标 accent；hover 背景 24% / 边框 48%；active 28% / 64%；头部图标按钮、日志、订阅刷新、检查更新都同款；`segmented` 选中项例外 |
| 控件尺寸 | 全部 `box-sizing:border-box`；header 图标按钮 **22×22**（图标 12–13px）、圆角 6；文字按钮 `height:22`；行内 `ⓘ` 用 20×20 命中区但无按钮底；禁止只设 `width/height` 而保留 `minHeight` 覆盖 |
| 按钮状态 | disabled：`opacity:.5` + `cursor:not-allowed`，不改色；loading：图标旋转，按钮禁用；不新增第二种填充色 |
| 明细说明 | 模型行不再逐行放 `ⓘ`；P2 只在 `真实 Tokens` 标题右侧放一个 `ⓘ`，tooltip 只说明 `输入 / 缓存 / 输出` 顺序；Tokens 后直接用 `[输入/缓存/输出]` 数值，不写中英文标签 |
| 输入 | 背景 `color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent)`；边框 `--dsw-alias-border-l3`；focus 边框 `--dsw-alias-state-business-primary`；错误边框 `--dsw-alias-state-error-primary` |
| 危险操作 | 仅“清空日志/删除类”用 error 色；当前 v2 不做清空，不引入红色主按钮 |
| segmented 主题 | 轨道 `var(--dsw-alias-bg-module-platform, rgba(127,127,127,.10))`；选中 `var(--dsw-alias-button-elevated-fill, #fff)` + `box-shadow: var(--dsw-shadow-lv1, 0 2px 4px rgba(0,0,0,.08))`；选中文字 `--dsw-alias-label-primary`；未选中 `--dsw-alias-label-secondary`，hover `--dsw-alias-interactive-bg-hover`；暗色由宿主 `body[data-ds-dark-theme]` 自动切换，不硬编码白底 |
| 底框层级 | P2 为 `Panel → Section`；**P3 无 Panel**，`Section` 直接铺在中栏。Section 圆角 10、padding 12、区间 gap 16；两格卡用 Tile（圆角 8、1px `border-l3`、padding 12、elevated 背景）；亮/暗自动跟随 token |
| 描边纪律 | Section 不描边；行内靠间距/1px 弱分隔；描边只给输入框、胶囊、focus；禁止“底框 + 外框”重复包裹 |
| 环 ProgressRing | 见 §2.5.1：描边 donut，P1 14×14、P2 20×20，弧按状态取 `label-primary` / `error`。MiniBar 组件保留但看板不再使用 |
| 状态表达 | API 预算 80–100% 只染数字 amber、≥100% 环与数字同红；订阅 ≥90% 环与数字同红；空环 = 未设置 |
| 布局网格 | P2 主区四列 `auto 1fr 1fr 1fr`（环 / 已用·预算 / 真实余额 / 本月已花）；订阅行同构（环 / 剩余 / 倒计时 / 绝对时间）；P3 用表格，列宽自适应 |
| 行高 / 间距 | 信息行 py 6px；组间 gap 10px；区内行间 gap 2px；面板 padding 12 |
| 分隔线 | 1px `--dsw-alias-border-l2`、左右缩进 8px、上下 margin 6px |
| tooltip | 独立 `Tooltip` 固定浮层（跳出面板 `overflow`），背景 `--dsw-alias-tooltip-bg`、文字 `--dsw-alias-toast-label`、11px；`width:max-content`、`maxWidth:min(220px, 100vw-16px)`；默认向上，水平中心对齐触发按钮；上方空间不足才向下翻转；左右钳制；滚动/resize 关闭 |
| segmented | **cc-switch 胶囊同款、主题 token 化**：容器高 28、`p-[2px]`、圆角 8、轨道 `--dsw-alias-bg-module-platform`；子项 `flex:1`、高 24、圆角 6、11px/500、`px-2`；选中 `--dsw-alias-button-elevated-fill` + `--dsw-shadow-lv1`、文字 `--dsw-alias-label-primary`；未选中 `--dsw-alias-label-secondary`、hover `--dsw-alias-interactive-bg-hover`；150ms 颜色过渡，不做滑块/下划线 |
| segmented 宽度 | 范围 `当天/7天/30天/全部` 撑满可用宽、子项等分；P3 刷新间隔同样式但固定 **168px**，`flex:0 1 168px`、`minWidth:0`；标签 `white-space:nowrap`，不按文字长度跳宽 |
| 圆角 | Pill 999；卡片 10；浮层 12；控件 6 |
| 主题 | 跟随宿主 CSS 变量；暗色由 `body[data-ds-dark-theme]` 切换；必须给回退值；**不写死白底/黑字** |
| 焦点 | `outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))`；offset 2px；Tab 顺序 = 视觉顺序 |
| 动效 | 非必要不加；`prefers-reduced-motion` 下关闭 |

预算状态不能只靠颜色：百分比数字 + 状态色 + 文案共同表达。

## 2.5 公共组件（P0）

> 三件先于页面落地：环、重置时间、用量表。组件内零 hex、零主题判断，全走宿主语义 token。<br>
> 形态以 [`tools/preview/templates/`](../tools/preview/templates/) 的 HTML 原型为准；本文只定规格与状态，不回写像素。

### 2.5.1 ProgressRing

| 项 | 规格 |
|---|---|
| 用途 | P1 预算与订阅窗口（14/2）、P2 订阅窗口（20/2.5）、P3 卡片 Gauge（40/4，按量与订阅共用同一个组件） |
| 几何 | `viewBox="0 0 ${size} ${size}"`、`r = (size - stroke) / 2`、`strokeDasharray = C*p/100 C`、`rotate(-90 size/2 size/2)`、`strokeLinecap="round"`；`percent = 0` 与 `empty` 都不画弧 |
| 形态 | **描边 donut，中间透明**，不是实心饼 |
| 颜色 | 轨道 `--dsw-alias-border-l3`；弧 `normal → --dsw-alias-label-primary`、`critical → --dsw-alias-state-error-primary`、`empty` 不画弧；**数字与弧同色**：normal 前景色、warn 只染数字 amber、critical 红、empty 用 `label-tertiary` |
| 阈值 | 由调用方给：订阅 `≥90` → critical；API 预算 `≥100` → critical（80–100 只染数字，不染环） |
| 无障碍 | 装饰用法 `aria-hidden`，数值由相邻文本承担；独立使用时 `role="progressbar"` |

- 全量状态（6 态、3 组阈值边界、3 档尺寸、3 种环心）见 [`tools/preview/templates/ring.html`](../tools/preview/templates/ring.html)。

### 2.5.2 ResetClock

| 项 | 规格 |
|---|---|
| 输出 | `{ relative, absolute }`；`ts` 非有限值或 ≤0 时两者均为 `null` |
| 相对 | `<60 分钟` → `{n} 分钟后`（最小 1）；`<1440` → `{n} 小时后`；否则 `{n} 天后` |
| 绝对 | `MM-DD HH:mm`，月日时分补零，本地时区 |
| 用途 | P2 分两列排版；P3 只用 `absolute`；P1 不使用（已定不显示重置） |

### 2.5.3 TokenTable

| 项 | 规格 |
|---|---|
| 列模板 | `minmax(0,1fr) auto auto auto`（模型 / Tokens / 请求 / 命中），**除模型列外全按内容自适应** |
| Tokens 单元格 | 两段 flex：总量右对齐 + `[输入/缓存/输出]` 左对齐，间距 4 |
| 对齐基线 | 以**「单位」与 `[` 的交界**为对齐线，所有行的 `[` 落在同一竖线 |
| 单位 | 复用 `fmtTokens`：`<1000` 整数、`k` / `M` / `B`，保留 1 位小数并去尾随 `.0` |
| 行数 | 最多 5 行，超出内部滚动；空态 `范围内暂无消耗`，不渲染表头 |
| 费用 | 不含；P3 在末尾追加一列「费用（API 计价估算）」 |

## 2.6 字号与数字

| token | 默认值 | 用于 |
|---|---|---|
| `--td-fs-pill` | `calc(var(--dsh-content-font-size-secondary, 13px) - 1px)` → **12px** | P1 全部文字与数字 |
| `--td-fs-body` | `var(--dsh-content-font-size-secondary, 13px)` → **13px** | P2 / P3 正文、表格、数字 |
| `--td-fs-micro` | `calc(--td-fs-body - 1px)` → **12px** | P2 表格括号 `[x/y/z]` |
| `--td-lh-pill` | `calc(20px + var(--dsh-content-font-delta-secondary, 0px))` → **20px** | P1 |
| `--td-lh-body` | `calc(24px + var(--dsh-content-font-delta, 0px))` → **24px** | P2 / P3 正文 |
| `--td-lh-tight` | **20px** | P2 表格行、底部状态行 |

- 唯一字号例外：P3「总费用」「真实 Tokens」两个 KPI 用 **17px / 600**。
- 数字一律 `font-variant-numeric: tabular-nums`；金额 `¥12.68`，`/` 两侧各 1 空格；空值统一 `—`。
- 禁止写死 px 字号、禁止用 `opacity` 模拟弱化、禁止等宽字体族。

## 3. P1 Pill

```text
API    [API] 预算 ◔ 25.4% · 今日 ¥11.37 · 余额 ¥8.74 ⌃
订阅   [订阅] GLM 5h ◔ 42% 周 ◕ 18% ⌃
窄屏   [API] ◔ 25.4% · ¥11.37 · ¥8.74 ⌃
```

- 两处槽位：首页工作区行；会话活动行左侧。都不撑开输入框。
- 两态：API / 订阅；判定不了默认 `[API]`；无任何 provider 时 `[API] ◌ --`，不隐藏 Pill。
- 环：所有百分比前都带**描边环**（14×14、`r=5.5`、`stroke 2`、`rotate(-90 7 7)`），弧为前景色（暗色≈白 / 亮色≈黑），不写死 `#fff`。
- 常态：环与数字同用前景色（暗色≈白 / 亮色≈黑），**不再用业务蓝**，随主题自动反转。
- 临界：订阅 ≥90%、API 预算 ≥100% 时环与数字同红；API 80–100% 只染数字；未设置画空环。
- API 段：预算环 + 百分比 · 今日 · 余额；金额按 provider 币种。
- 订阅段：`名称 + 短标签(5h/周/月) + 环 + 百分比`，最多 3 窗；**不显示重置时间**（重置只在 P2 / P3）。
- 取值三级兜底：会话内 `modelSelection` 投影 `next ?? lastUsed` → 首页默认模型 → 账本 `currentProviderId`；都不命中时 `[API] ◌ --`，Pill 不隐藏。
- 尺寸：高 24、圆角 999、水平 padding 8、段间距 6；字号 12px（与 DSH 底栏状态胶囊同款）、`tabular-nums`。
- Enter / Space 展开，`aria-expanded` 同步；`aria-label` 为全量文本。
- 加载 / 刷新失败：保留上次值，无值显示 `--`，不弹 toast。
- stale：超过 2 个刷新周期加 `~`，颜色不变。

## 4. P2 浮层（当前模型）

### 4.1 结构

```text
当前模型                                    ⓘ   ⟳   ×
────────────────────────────────────────────────────────
DeepSeek                                   [ 按量 API ]
◔ 25%   ¥12.68 / ¥50.00   真实余额 ¥8.74   本月已花 ¥12.68
────────────────────────────────────────────────────────
[ 当天 | 近7天 | 近30天 | 全部 ]（胶囊）

模型                 Tokens                   请求   命中
DeepSeek-V4.1-F…    12.5k [12.3k/0/195]      1      0%
────────────────────────────────────────────────────────
更新于 12:30                              [ 全量看板 ]
```

订阅 provider 时，中间区换成窗口行（最多 3 行）：`5h ◔ 42% 剩余 58% 3 小时后 11-03 20:15`。

### 4.2 尺寸与定位

- 宽 **`fit-content`**，`min 280` / `max min(480px, 100vw - 16px)`，由最宽一行决定；不再固定 360。
- 高 `max(200, min(70vh, pillTop - 16))`；贴 pill 上方 8px；宽度变化 120ms 过渡 + `ResizeObserver` 重定位。
- 取消「用量 / 设置」双 tab；取消预算进度条；取消刷新间隔 / 余额开关。

### 4.3 主区四列

- `grid-template-columns: auto 1fr 1fr 1fr`，`column-gap: 8px`：环+百分比 / 已用·预算 / 真实余额 / 本月已花。
- 字号 13px；数值 600、标签 400、标签色 `label-tertiary`。
- `title`：余额=「账户真实余额，不受预算影响」；已花=「本月累计消耗，等于已用/预算 的分子」。
- 可用宽度 <320px 时末列整体换行，不截断金额。

### 4.4 订阅行

- 四段均分：`标签 + 环(20) + 百分比` / `剩余 N%` / 倒计时 / 绝对时间。
- 时间两段统一由 `resetParts(ts)` 产出，不会互相矛盾；缺失窗口 `◌ —` + 三段 `—`。
- ≥90% 时环与数字同红（与 P1 同规则）。

### 4.5 范围与用量表

- 范围胶囊：当天 / 近7天 / 近30天 / 全部，默认「当天」，只影响下方表格。
- 表格四列：模型 / Tokens / 请求 / 命中，**不含费用**；最多 5 行，超出内部滚动。
- Tokens 形如 `12.5k [12.3k/0/195]`：左段右对齐、右段左对齐，以「单位 / `[`」交界为对齐线。
- 空态：`范围内暂无消耗`；切换范围保留旧数据直到新数据到达。

### 4.6 底部

- 左「更新于 HH:mm」（12px tertiary）；右「**全量看板**」蓝色文字按钮。
- 按钮样式复用现有蓝色按钮（accent 文字 + 16% 底色 + 32% 边框，hover 24%/48%）。
- 点击直接 `ctx.get('layout').selectPanel('token-dash')`（实测可行）。

### 4.7 P2 状态

| 状态 | 表现 |
|---|---|
| 首屏加载 | 保留上次值；无值时空环 + 四列 `—`，不用骨架屏 |
| 刷新失败 | 头部下方 1 行 error strip + `重试` |
| 未配置凭据 | strip 文案改 `未配置凭据` |
| 无 provider | `未检测到已配置供应商` + 逐条原因 |
| 范围切换 / 取数失败 | 保留旧数据；范围旁出现 `⟳` 重试 |
| 窗口缺失 | 空环 + `—` |
| stale | `⟳` 加 4px amber 点 |
| 窄屏 ≤520 | `left/right: 12`、`width: auto`、限高 `min(100vh - 96px, 72vh)` |
| 关闭中 | `opacity` + `translateY(4px)` 120ms 后卸载，焦点归还 Pill |

## 5. P3 整页面板

### 5.1 入口

- `main` 槽注册整页，`key = token-dash`；`sidebar.panellist` 同 `id`、`order: 6`。
- 必须 `slots.inject` 后再 `register`；入口 label 来自注册参数，当前接受语言切换重启后生效（不引入 dispose / 重注册）。
- 实测：侧栏「插件」分组出现入口，点击切中栏整页；`selectPanel` 亦可直达。

### 5.2 结构

单页滚动，四段：**按量计价** → **订阅套餐** → **范围与明细** → **设置与数据管理**；无页签、无二级导航。

```text
Token 看板                                              ★ 1.2k
数据来自本机会话记录 · 更新于 12:30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
按量计价（按供应商）   名称 / 月度预算 / 已用 / 计划余额 / 真实余额
订阅套餐（按供应商）   名称 / 5h / 周 / 月（每窗两行）
时间范围（胶囊）+ 两格卡 + 模型明细表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
设置与数据管理         刷新 / 账户余额 / 日志与数据 / 价格表与版本
```

### 5.3 按量计价（按供应商）

- **每个 provider 一张卡**：`repeat(auto-fit, minmax(220px, 1fr))` + gap 12；卡内 padding 14、圆角 8、1px `border-l3`。
- 卡顶：供应商名 + `[ 按量 API ]`；上部左右分栏：左 `QuotaGauge(40)`（环心「已用」、环下百分比），右「月度预算」输入框（常显，币种前缀 + 数字，空 = 未设置）。
- 卡内三行：计划余额（预算 − 已用，可为负）/ 真实余额 / 本月已花；不再单列「已用 / 预算」。
- 改预算后环、状态、计划余额即时重算：80–100 只染数字，≥100 环与数字转红。
- 只列 `billingMode === 'api'`；计费模式只读（自动侦测）；`billingModes = hide` 的 provider 不出现。
- 原型：[`tools/preview/templates/cards-api.html`](../tools/preview/templates/cards-api.html)。

### 5.4 订阅套餐（按供应商）

- **每个 provider 一张卡**（与 5.3 同一套网格与卡片容器）；卡顶：供应商名 + `[ 订阅 ]`。
- 卡内 `5h / 周 / 月` 一排等分，每列一个 `QuotaGauge(40)`：环心周期 → 环下已用% → 剩余% → 倒计时 → 绝对时间。
- 按实际窗口数出列（1–3）：没有「月」就只出两列，不显示 `月 —`；完全没有窗口的 provider 整卡不出现。
- 原型：[`tools/preview/templates/cards-sub.html`](../tools/preview/templates/cards-sub.html)。

### 5.5 范围与明细

- 时间范围胶囊，默认「全部」；影响两格卡与明细表。
- 明细表的 Tokens 列沿用 §2.5.3 的「单位 / `[` 交界」对齐基线。
- 两格卡各自用卡片容器（圆角 8 / 1px `border-l3` / padding 12 / elevated 背景），并排 gap 12，与表格间距 16。
- 明细表：模型 / Tokens / 输入 / 缓存 / 输出 / 请求 / 命中 / 费用（API 计价估算）；只列范围内有消耗的模型。

### 5.6 预算编辑

- 按量卡右侧**常显输入框**（`月度预算` 标签 + 币种前缀 + 数字，空 = 未设置），不再用 `✎` 入口。
- Enter / 失焦提交，Esc 回原值；提交后环、状态、计划余额即时重算。
- 只改预算数字；允许空（= 未设置）或 ≥0 十进制，拒绝负数 / 科学计数法 / 货币符号。
- 交互原型：[`tools/preview/templates/cards-api.html`](../tools/preview/templates/cards-api.html)。

### 5.7 设置与数据管理

| 行 | 内容 |
|---|---|
| 1 | `⟳` 立即刷新 + 刷新间隔 segmented；账户余额 toggle |
| 2 | 打开日志文件夹 / 导出日志 / 导出数据 / 导入数据 |
| 3 | 价格表时间 · 版本 · 来源；`⤓` 检查更新 |

### 5.8 锚定

- 胶囊 `position: sticky; bottom: 12px`；页面末尾 `padding-bottom: 96px`。
- 实测：宿主中栏滚动容器为 `overflow: hidden`（`scrollHeight 1389 / clientHeight 900`），sticky 仍生效（`bottom = 视口高 − 12`）。
- 退化：视口高 <480 / 胶囊高 >40vh / 宽 <760 时改 `static`。

### 5.9 P3 状态

| 状态 | 表现 |
|---|---|
| 首屏加载 | 各区块 muted 占位；两格卡 `—` |
| 刷新中 | 保留旧数据；`⟳` 旋转禁用 |
| 全量失败 | 头部 error strip + `重试`，保留旧数据 |
| 范围失败 | 两格卡与明细提示失败 + `重试` |
| 无消耗 | 明细不渲染表头 |
| 未配置凭据 | 该 provider 不进表，原因只在空态卡 |
| 只有一类 provider | 另一类区块整体不渲染 |

## 6. 交互与可访问性

- Pill：`role=button`、`tabIndex=0`、Enter/Space、`aria-expanded`、完整 aria-label。
- Panel：`role=dialog`；tab 用 `role=tablist/tab`，范围选择器用 `role=tablist`；键盘可完成全部切换。
- Segmented：每项 `role=tab`、`aria-selected`，roving tabindex；←/→/Home/End 移动，Enter/Space 选择。
- Toggle：`role=switch`、`aria-checked`；Space/Enter 切换；关闭后不改变焦点位置。
- 关闭入口有三个：右上角 `×`、点击面板外部、`Esc`；P3 为整页，用侧栏切回会话即离开；关闭后尽力归还焦点。
- `Esc` 由 `document` 级 keydown 监听，面板打开时按下即关闭，不要求焦点在面板内。
- tooltip（`ⓘ`）：`aria-describedby` 关联；hover、focus、触屏点按都可展示；Esc/失焦/滚动/resize/点击外部关闭；使用独立 `Tooltip` fixed 浮层，不随面板裁剪；header 支持范围与 `真实 Tokens` 说明两个触发点均默认向上、中心对齐按钮；P3 不显示支持范围图标。
- header `ⓘ` / `⟳` / `×` / `⤓` 的点击区均 22×22；行内 `ⓘ` 20×20 命中区；图标本身 12–14px，焦点环 2px。
- 刷新、保存、导出、检查更新结果用 `aria-live=polite`；错误用 `role=alert`。
- 语言：不提供 P3 语言切换；所有用户可见文案通过 `ctx.locale` 读取 DSH 当前语言（zh/en），跟随宿主自动切换；缺失词条回退英文或中文基线，不混排。
- 对比度正文 ≥4.5:1；预算状态不只靠颜色。
- i18n 使用 `token-dash` 命名空间；`zh` / `en` 词条用占位符拼装，不拼整句；跟随 DSH locale，不提供 P3 语言开关。

## 7. 文案与空态

| 场景 | 文案 |
|---|---|
| 无预算 | `预算 未设置` |
| 预算行 | `25%   ¥12.68 / ¥50.00` |
| 订阅失败 | `套餐查询失败` |
| 未定价 | `未定价`（近似价加 `≈`） |
| 空明细 | 组行/模型行不渲染；两格卡显示 `¥0.00` |
| 空订阅 | 订阅段整体隐藏 |
| 无 provider | `未检测到已配置供应商`；P1 显示 `[API] --` |
| 更新成功 | `已更新到 X.Y.Z，重启 DSH 后生效` |
| 更新失败 | `更新失败（原因）` + 复制命令 |
| 支持范围 | `目前支持 DeepSeek / Kimi / GLM / OpenRouter / Qwen API Key` |
| 刷新失败 | `刷新失败，保留上次数据` |
| 范围失败 | `范围数据加载失败` |
| 设置加载失败 | `设置加载失败` |
| 预算非法 | `请输入 0 或正数` |
| 保存失败 | `保存失败：原因` |
| 日志打开失败 | `无法打开，已复制路径` |
| 日志导出失败 | `日志导出失败` |
| 数据已导出 | `数据已导出` |
| 数据导出失败 | `数据导出失败` |
| 导入中 | `导入中…` |
| 导入成功 | `已导入 {month} 数据` |
| 导入失败 | `导入失败：{reason}` |

### 7.1 格式规则

| 类型 | 规则 |
|---|---|
| Tokens | `<1k` 整数；`1k–999.9k` 1 位小数；`≥1M` 1 位小数；去掉末尾 `.0`；示例 `999` / `1.08k` / `319.4M` |
| 金额 | 2 位小数，带币种符号；CNY `¥12.68`、USD `$19.00`；不跨币种合计 |
| 百分比 | 1 位小数，整数时去掉 `.0`；最大显示 `999%`；无分母显示 `--`；超支仍显示实际值 |
| 时间 | 本地 `HH:mm`；价格表 `YYYY-MM-DD HH:mm`；stale 后缀 `~` |
| 0 值 | 按已知币种分行显示 `¥0.00` / `$0.00`；无已知币种显示 `¥0.00` |

### 7.2 预算输入

- 允许空值（保存为 `0`，表示未设置）或 `>= 0` 的十进制数，不接受负数、科学计数法、货币符号；未填写时输入框显示默认 `100`（provider 币种），一旦保存即按保存值计算。
- 输入中不格式化；失焦/Enter 后保存并格式化为 2 位小数。
- 非法值：红边 + 行内 `请输入 0 或正数`，不提交，不覆盖旧预算。
- 保存失败：红边 + `保存失败，请重试`，保留输入；成功短暂显示 `已保存`。

## 8. 响应式与溢出

- P2 宽 `fit-content`（280–480），贴近窗口右缘时向左翻转；P3 用宿主中栏整宽（1280 视口下实测 1000px）；都不产生页面横向滚动。
- P2 最大高 `max(200, min(70vh, pillTop-16))`；P3 由宿主中栏滚动（实测 `overflow:hidden` 容器内 sticky 生效）。
- provider / 模型名称单行截断 `text-overflow:ellipsis`；金额、百分比、币种不截断。
- 价格链接已从 P3 移除（只保留价格表时间与来源）；查价走 P2 的 `ⓘ`。
- tooltip 最大宽 220px；默认向上，上方空间不足时向下翻转；右侧不足时向左对齐，不超出面板。
- 长错误文案最多 2 行；超出截断，完整内容放 title/aria-label。

## 9. 明确不做

- 不做 OS 悬浮窗、右下角挂件、显示位置设置。
- 不做趋势图、热力图、请求日志页、逐条明细（v2 范围决策 D-09）。
- 不做价格编辑、汇率换算、自定义币种。
- 不做日志自动上传。
- 不做分页、不做独立路由、不做二级导航；"看全部"由左侧常驻入口 + 中栏整页承载（v3.0 起，取代原 BND-02 的否决）。
