# Token 看板 UI 设计

> 唯一 UI 设计真源：视觉、信息层级、文案与交互以本文件为准。<br>
> **当前版本：v3.2（2026-11-04 卡片化与三色环定稿）**——四组件分层（ProgressRing / PercentValue / InlineRing / QuotaGauge）；P3 两区改为每 provider 一张卡，新增摘要带、明细底框与三行设置胶囊；P2 支持按量 / 订阅两形态；环改低饱和绿 / 黄 / 红三色语义。<br>
> 底框层级：`Panel → Section`；P3 用「卡片网格 + 摘要底框」，分区不靠色相，状态色只给环、百分比与超支。<br>
> 架构与数据流见 [design.md](design.md)；本轮迭代的需求与实施细节见 [UI 迭代计划](plan/archived/feature_ui_refresh.md)。

## 变更记录（里程碑）

> 只保留影响结构与口径的里程碑；逐版细节见 `git log -- docs/ui-design.md`。状态按当前代码回填。

| 日期 | 版本 | 变更 | 状态 |
|---|---|---|---|
| 2026-11-04 | **v3.2** | **卡片化与三色环**：四组件分层；P3 每 provider 一卡（按量竖排 / 订阅窗口一排）、摘要带、明细底框、三行胶囊；P2 两形态；环改绿 / 黄 / 红；响应式 4/3/2 列 | 待实施 |
| 2026-11-04 | v3.1 | **组件与字号定稿**：新增 §2.5（ProgressRing 14/20、ResetClock 拆 relative+absolute、TokenTable 全自适应 + `[` 交界基线）与 §2.6（`--td-fs-*` / `--td-lh-*` 六个 token） | 已实现（1.2.0-local.2） |
| 2026-11-04 | v3.0 | **结构重构**：P3 改左侧常驻 + 中栏整页（`main` + `sidebar.panellist`）；P2 只留当前模型、宽度自适应、去进度条与设置开关；P1 订阅段加环；关闭入口加 Esc | 已实现（1.2.0-local.2） |
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
| 预算 % / 已用总额 | 环 + % | 环 + % + 已用/预算 | 卡片：月度预算输入 · 计划余额 · 真实余额 · 本月已花 |
| 本月已花 / 今日 | 今日 | 本月已花 | 否（按量列已用金额） |
| 账户余额 | 是（开关控制） | 是（第三列「真实余额」） | 是（按量表「真实余额」） |
| 范围费用 / Tokens | 否 | 摘要带 + 四列用量表 | 摘要带 + 八列明细表 |
| 按模型明细 | 否 | 四列（模型/Tokens/请求/命中，无费用） | 八列（含费用（API 计价估算）） |
| 订阅窗口 | 是（当前） | 当前 provider 的 1–3 窗 | 全部订阅 provider |

## 2. 全局视觉（cc-switch 托盘面板语言）

| 项 | 规格 |
|---|---|
| 面板宽 | P2 **内容自适应** `fit-content`（280–480），贴 pill 上方 8px、右缘不足向左翻转、最大高 `min(70vh, pillTop-16)`；P3 内容宽 `100% / max-width 952`（随中栏收缩） |
| 字号阶梯 | 见 §2.6：P1 `--td-fs-pill`（12px）；P2 / P3 正文 13px；括号 12px；P3 摘要带「总费用 / 真实 Tokens」**26px / 600** |
| 主色 | `var(--dsw-alias-state-business-primary, #6ea8ff)`；仅用于按钮、选中、焦点、链接 |
| 警告 / 超支 | 环与百分比：warn `--dsw-alias-state-warn-primary`、critical `--dsw-alias-state-error-primary`；金额用前景色，负数 / 超支红 |
| 文字色 | 标题/数值 `--dsw-alias-label-primary`；副行/标签/环心 `label-secondary`（约 68%）；弱提示 `label-tertiary`；不用 opacity 模拟 muted |
| 色彩纪律 | 蓝只给交互；**环三态：低饱和绿（正常）/ 黄（接近阈值）/ 红（超支）**，环与数字同色；**green 只表示正常状态，不再表示金额**；卡片/分区仍灰阶 |
| 按钮 | 默认 DSH 蓝：`--td-accent: var(--dsw-alias-state-business-primary, #6ea8ff)`；背景 `color-mix(in srgb, var(--td-accent) 16%, transparent)`、边框 32%、文字/图标 accent；hover 背景 24% / 边框 48%；active 28% / 64%；头部图标按钮、日志、订阅刷新、检查更新都同款；`segmented` 选中项例外 |
| 控件尺寸 | 全部 `box-sizing:border-box`；header 图标按钮 **22×22**（图标 12–13px）、圆角 6；文字按钮 `height:22`；行内 `ⓘ` 用 20×20 命中区但无按钮底；禁止只设 `width/height` 而保留 `minHeight` 覆盖 |
| 按钮状态 | disabled：`opacity:.5` + `cursor:not-allowed`，不改色；loading：图标旋转，按钮禁用；不新增第二种填充色 |
| 明细说明 | 模型行不再逐行放 `ⓘ`；P2 只在 `真实 Tokens` 标题右侧放一个 `ⓘ`，tooltip 只说明 `输入 / 缓存 / 输出` 顺序；Tokens 后直接用 `[输入/缓存/输出]` 数值，不写中英文标签 |
| 输入 | 背景 `color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent)`；边框 `--dsw-alias-border-l3`；focus 边框 `--dsw-alias-state-business-primary`；错误边框 `--dsw-alias-state-error-primary` |
| 危险操作 | 仅“清空日志/删除类”用 error 色；当前 v2 不做清空，不引入红色主按钮 |
| segmented 主题 | 轨道 `var(--dsw-alias-bg-module-platform, rgba(127,127,127,.10))`；选中 `var(--dsw-alias-button-elevated-fill, #fff)` + `box-shadow: var(--dsw-shadow-lv1, 0 2px 4px rgba(0,0,0,.08))`；选中文字 `--dsw-alias-label-primary`；未选中 `--dsw-alias-label-secondary`，hover `--dsw-alias-interactive-bg-hover`；暗色由宿主 `body[data-ds-dark-theme]` 自动切换，不硬编码白底 |
| 底框层级 | P2 为 `Panel → Section`；P3 为「卡片网格 + 摘要底框（范围 + 摘要带 + 明细）+ 设置胶囊」。卡片圆角 8 / 1px `border-l3` / padding 14；底框圆角 10 / padding 12–14；亮暗跟随 token |
| 描边纪律 | 卡片与底框不重复包裹；行内靠间距 / 1px 弱分隔；描边只给卡片、输入框、胶囊、focus |
| 环 | 见 §2.5.1：描边 donut，P1 14/2、P2 20/2.5、P3 40/4；弧与数字同色（绿 / 黄 / 红）；MiniBar 保留但看板不再使用 |
| 状态表达 | 环与百分比同色：80–100% 黄、API ≥100% / 订阅 ≥90% 红；空环 = 未设置；金额不用状态色，超支负数红 |
| 布局网格 | P2 主区四列 `auto 1fr 1fr 1fr`（环 / 已用·预算 / 真实余额 / 本月已花），订阅为三窗两行；P3 两区均为 `auto-fit` 卡片网格，明细 8 列 |
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
| 颜色 | 轨道 `--dsw-alias-border-l3`；**弧与数字同色**：normal 低饱和绿（`--td-state-ok`，回退 `--dsw-alias-state-success-primary`）、warn 黄（`--dsw-alias-state-warn-primary`）、critical 红（`--dsw-alias-state-error-primary`）、empty 不画弧 + 数字 `label-tertiary`；语义固定，色值走 token、不写死 hex |
| 阈值 | 由调用方给：订阅 `≥90` → critical；API 预算 `≥100` → critical；80–100 为 warn，**环与数字同时变黄** |
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

### 2.5.4 PercentValue

| 项 | 规格 |
|---|---|
| 输入 | `{ percent, state }`；`percent` 0–100 或 `null` |
| 输出 | `42.5%` / `—`，`tabular-nums` |
| 颜色 | 与环同色：normal `--td-state-ok`、warn `state-warn-primary`、critical `state-error-primary`、empty `label-tertiary` |
| 职责 | 只负责格式化与颜色；位置、字号、间距由外层决定 |

### 2.5.5 InlineRing

| 项 | 规格 |
|---|---|
| 结构 | `ProgressRing` + `PercentValue` 同一行，`inline-flex`，gap 4 |
| 尺寸 | P1 14/2 + 12px；P2 20/2.5 + 12px |
| 参数 | `{ percent, state, size, stroke, text? }`；`text` 省略时用 `PercentValue` |
| 职责 | 内联排版；不拼词条，`text` 由调用方给 |
| 用途 | P1 预算 / 订阅窗口；P2 订阅窗口 |

### 2.5.6 QuotaGauge

| 项 | 规格 |
|---|---|
| 结构 | 环 40/4 → 环心标签 12px → 3px → 百分比 16px / 600 → 4px → 三行辅助 11px |
| 参数 | `{ label, percent, state, remaining, relative, absolute, size = 40, stroke = 4 }` |
| 颜色 | 环与百分比同色（绿 / 黄 / 红）；环心与辅助用 `label-secondary`，不参与告警色 |
| 用途 | P3 按量卡（环心「已用」）与订阅卡（环心周期） |

## 2.6 字号与数字

| token | 默认值 | 用于 |
|---|---|---|
| `--td-fs-pill` | `calc(var(--dsh-content-font-size-secondary, 13px) - 1px)` → **12px** | P1 全部文字与数字 |
| `--td-fs-body` | `var(--dsh-content-font-size-secondary, 13px)` → **13px** | P2 / P3 正文、表格、数字 |
| `--td-fs-micro` | `calc(--td-fs-body - 1px)` → **12px** | P2 表格括号 `[x/y/z]` |
| `--td-lh-pill` | `calc(20px + var(--dsh-content-font-delta-secondary, 0px))` → **20px** | P1 |
| `--td-lh-body` | `calc(24px + var(--dsh-content-font-delta, 0px))` → **24px** | P2 / P3 正文 |
| `--td-lh-tight` | **20px** | P2 表格行、底部状态行 |

- 唯一字号例外：P3 摘要带「总费用」「真实 Tokens」用 **26px / 600**，多币种同字号、10px 间距。
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
- 环：所有百分比前都带**描边环**（`InlineRing` 14/2、`r=6`、`rotate(-90 7 7)`），环与数字同色，不写死 `#fff`。
- 常态：环与数字同为**低饱和绿**（`--td-state-ok`，回退 `--dsw-alias-state-success-primary`），不用业务蓝。
- 临界：订阅 ≥90%、API 预算 ≥100% 时环与数字同红；API 80–100% 环与数字同黄；未设置画空环。
- 展开箭头用内联 SVG（12px），不用 `⌃` 文本字形。
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

订阅 provider 时，中间区换成窗口行：`5h / 周 / 月` 三列等分，每列两行——`周期 + 环 + 百分比` / `剩余 N% · X 后`；无「月」不出第三列。

### 4.2 尺寸与定位

- 宽 **`fit-content`**，`min 280` / `max min(480px, 100vw - 16px)`，由摘要行 / 窗口行与数值列决定；模型名 `max-width: 190px` + 省略号，不驱动宽度。
- 高 `max(200, min(70vh, pillTop - 16))`；贴 pill 上方 8px；宽度变化 120ms 过渡 + `ResizeObserver` 重定位。
- 取消「用量 / 设置」双 tab；取消预算进度条；取消刷新间隔 / 余额开关。

### 4.3 主区四列

- `grid-template-columns: auto 1fr 1fr 1fr`，`column-gap: 8px`：环+百分比 / 已用·预算 / 真实余额 / 本月已花。
- 字号 13px；数值 600、标签 400、标签色 `label-secondary`（与卡片字段标签一致）。
- `title`：余额=「账户真实余额，不受预算影响」；已花=「本月累计消耗，等于已用/预算 的分子」。
- 可用宽度 <320px 时末列整体换行，不截断金额。

### 4.4 订阅行

- 三列等分（1–3 窗），每列两行：`标签 + InlineRing(20/2.5) + 百分比` / `剩余 N% · X 后`（11px secondary）。
- 时间由 `resetParts(ts)` 产出；缺失窗口整列不渲染，不显示 `月 —`。
- 环与数字同色：≥90% 红、80–100% 黄（与 P1 同规则）。
- 原型：[`tools/preview/templates/page-p2.html`](../tools/preview/templates/page-p2.html)（订阅浮层）。

### 4.5 范围与用量表

- 范围胶囊：当天 / 近7天 / 近30天 / 全部，默认「当天」，只影响下方表格。
- 表格四列：模型 / Tokens / 请求 / 命中，**不含费用**；最多 5 行，超出内部滚动。
- 表头 12px/500 + `label-tertiary` + 1px 下边线（不做底色块）；行高 28；行间 `color-mix(label-primary 6%)` 细线；单元格左右内边距 4；数值列右对齐。
- Tokens 形如 `12.5k [12.3k/0/195]`：左段右对齐、右段左对齐，以「单位 / `[`」交界为对齐线。
- 补 `role="table" / row / columnheader / cell`；空态 `范围内暂无消耗`，切换范围保留旧数据。

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
按量计价（按供应商）   卡片网格：名称 + QuotaGauge + 预算输入 + 三行
订阅套餐（按供应商）   卡片网格：名称 + 5h/周/月 窗口一排
┌ 范围与明细 ─────────────────────────────────────────────┐
│ 时间范围 + 共 N 个模型 · 更新于                          │
│ 摘要带（总费用 / 真实 Tokens）                            │
│ 模型 / Tokens / 输入 / 缓存 / 输出 / 请求 / 命中 / 费用   │
└──────────────────────────────────────────────────────────┘
设置与数据管理         刷新 / 日志 / 版本 三行
```

原型：[`page-p3.html`](../tools/preview/templates/page-p3.html)。

### 5.3 按量计价（按供应商）

- **每个 provider 一张卡**：flex 布局，卡宽上限 260（3 家一行 3 张、末行居中），gap 12；卡内 padding 14、圆角 8、1px `border-l3`。
- 卡顶：供应商名 + `[ 按量 API ]`；卡内**竖排居中**：`QuotaGauge(40)`（环心「已用」）→ 环下百分比 → `月度预算` 标签 → 输入框。
- 卡内三行：计划余额（预算 − 已用，可为负）/ 真实余额 / 本月已花；不再单列「已用 / 预算」。
- 改预算后环、状态、计划余额即时重算：80–100% 环与数字同黄，≥100% 同红；金额不用状态色，负值红。
- 只列 `billingMode === 'api'`；计费模式只读；`billingModes = hide` 的 provider 不出现。
- 原型：[`cards-api.html`](../tools/preview/templates/cards-api.html)。

### 5.4 订阅套餐（按供应商）

- **每个 provider 一张卡**：`repeat(auto-fit, minmax(220px, 1fr))`，1000 宽 4 张 229 / 760 三张 / 520 两张；卡顶：供应商名 + `[ 订阅 ]`。
- 卡内 `5h / 周 / 月` 一排等分，每列一个 `QuotaGauge(40)`：环心周期 → 环下已用% → 剩余% → 倒计时 → 绝对时间；辅助三行 11px `label-secondary`。
- 按实际窗口数出列（1–3）：没有「月」就只出两列，不显示 `月 —`；完全没有窗口的 provider 整卡不出现。
- 环与数字同色：≥90% 红、80–100% 黄；环心与辅助不参与告警色。
- 原型：[`cards-sub.html`](../tools/preview/templates/cards-sub.html)。

### 5.5 范围与明细

- 时间范围胶囊、摘要带、模型明细共用一个底框（1px / 圆角 10 / padding 12–14），框内 10px 分区 + 1px 分隔线。
- 顶部行：范围胶囊与「共 N 个模型 · 更新于」同行、**整行左对齐**（16px 间距）。
- 摘要带：整宽、左右两半 + 1px 竖线；总费用与多币种 26px / 600（10px 间距）、真实 Tokens 26px / 600 + 11px 拆分；两半内容水平居中，单币种金额居中。
- 明细表：模型 / Tokens / 输入 / 缓存 / 输出 / 请求 / 命中 / 费用（API 计价估算），8 列；Tokens 沿用「单位 / `[` 交界」基线；窄屏内部横向滚动（`min-width: 720px`）。
- 只列范围内有消耗的模型；模型名前加 provider 徽标，列距 12。

### 5.6 预算编辑

- 按量卡**数字下方**常显输入框（`月度预算` 标签 + 币种前缀 + 数字，空 = 未设置），不再用 `✎` 入口。
- Enter / 失焦提交，Esc 回原值；提交后环、状态、计划余额即时重算。
- 只改预算数字；允许空（= 未设置）或 ≥0 十进制，拒绝负数 / 科学计数法 / 货币符号。
- 交互原型：[`tools/preview/templates/cards-api.html`](../tools/preview/templates/cards-api.html)。

### 5.7 设置与数据管理

| 行 | 标签 | 内容 |
|---|---|---|
| 1 | 刷新 | `⟳ 立即刷新`（主按钮）+ 刷新间隔 segmented；右端账户余额 toggle |
| 2 | 日志 | 打开日志文件夹 / 导出日志 / 导出数据 / 导入数据（ghost 按钮） |
| 3 | 版本 | `vX.Y.Z · 价格表 YYYY-MM-DD`；右端 `⤓ 检查更新`（ghost） |

- 行标签固定 40px，三行控件左对齐成列；行间 1px 6% 分隔线。
- 主按钮仅「立即刷新」（浅底 + 边框），其余 ghost（透明底 / 透明边框），避免按钮同权。

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
- Panel：`role=dialog`；范围选择器用 `role=tablist`（roving tabindex）；P2 无 tab。
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

- P2 宽 `fit-content`（280–480），贴近窗口右缘时向左翻转；320px 视口铺满可用宽度、不横向滚动。
- P3 内容宽 `100% / max-width 952`，页面不产生横向滚动；卡片列数 1000=4 / 760=3 / 520=2，明细表窄屏内部滚动（`min-width: 720px`）。
- P2 最大高 `max(200, min(70vh, pillTop-16))`；P3 由宿主中栏滚动。
- provider / 模型名称单行截断 `text-overflow:ellipsis`（P2 模型列上限 190px）；金额、百分比、币种不截断。
- 价格链接已从 P3 移除（只保留价格表时间与来源）；查价走 P2 的 `ⓘ`。
- tooltip 最大宽 220px；默认向上，上方空间不足时向下翻转；右侧不足时向左对齐，不超出面板。
- 长错误文案最多 2 行；超出截断，完整内容放 title/aria-label。

## 9. 明确不做

- 不做 OS 悬浮窗、右下角挂件、显示位置设置。
- 不做趋势图、热力图、请求日志页、逐条明细（v2 范围决策 D-09）。
- 不做价格编辑、汇率换算、自定义币种。
- 不做日志自动上传。
- 不做分页、不做独立路由、不做二级导航；"看全部"由左侧常驻入口 + 中栏整页承载（v3.0 起，取代原 BND-02 的否决）。
