# UI 参考 checklist（改造后形态 · 归档）

> 状态：已归档（2026-11-04，方案已落地并回写 `ui-design.md` v3.1）<br>
> 参考档案：[`invisiblesirius-dsh-quota-dashboard.md`](../../reference/invisiblesirius-dsh-quota-dashboard.md)、[`shy3130-dsh-quota.md`](../../reference/shy3130-dsh-quota.md)、[`2026heshao-dsh-armory.md`](../../reference/2026heshao-dsh-armory.md)<br>
> 视觉真源：`docs/ui-design.md` v3.1（本文件只保留结论与取舍，细则以设计文档为准）<br>
> 后续：新问题记录在 [`board-visual-review-checklist.md`](board-visual-review-checklist.md)（已归档）

## 0. 页面分层

| 层 | 名称 | 载体 | 职责 |
|---|---|---|---|
| P0.5 | ProgressRing / resetParts / TokenTable | `client.js` 内部组件 | 三页共用，先于页面落地 |
| P1 | Pill | `conversation.hero.agentPreset` + `conversation.composer.dock` | 当前模型一眼扫：预算环或订阅窗口环 |
| P2 | 浮层 | 输入框上方，宽度自适应 280–480 | 只剩当前模型：四列主区 + 范围胶囊 + 用量表 + 全量看板 |
| P3 | 整页面板 | 中栏 `main` + 左侧 `sidebar.panellist` | 全量数据 + 就地编辑 + 底部设置胶囊 |

> 命名沿用旧称：P2 曾为「用量 tab」，P3 曾为「设置 tab」；本轮 P2 只留当前模型。

## 0.5 公共组件

| 组件 | 规格要点 | 落地 |
|---|---|---|
| ProgressRing | 描边 donut、中间透明；`percent / state / size / stroke`；阈值由调用方给；零 hex | `client.js` `ProgressRing` |
| resetParts / ResetLabel | 拆 `relative` + `absolute`；`<60min` 分钟、`<1440min` 小时、其余天；P3 不带「重置」 | `client.js` `resetParts` / `ResetLabel` |
| TokenTable | `minmax(0,1fr) auto auto auto`；Tokens 两段以「单位 / `[` 交界」对齐；不含费用列 | `client.js` `TokenTable`（P3 明细另用 8 列） |

- 环尺寸：P1 14/2、P2 20/2.5、P3 14/2；`empty` 不画弧。
- 阈值：订阅 `≥90` 转红；API 预算 `≥100` 转红；80–100 只染数字。
- 表格列对齐：模型左对齐，数值右对齐，表头同向；行数超限内部滚动。

## 0.6 字号

| token | 值 | 用于 |
|---|---|---|
| `--td-fs-pill` | 12px | P1 |
| `--td-fs-body` | 13px | P2 / P3 |
| `--td-fs-micro` | 12px | 括号 `[x/y/z]` |
| `--td-lh-pill` / `--td-lh-body` / `--td-lh-tight` | 20 / 24 / 20 | P1 / 正文 / 表格 |

- 数字统一 `tabular-nums`；百分比 1 位小数去 `.0`；空值一律 `—`。
- 只读宿主语义 token，禁止 hex 与 `@media (prefers-color-scheme)`。

## 1. P1 Pill

```text
API     [API] 预算 ◔ 25.4% · 今日 ¥11.37 · 余额 ¥8.74 ⌃
订阅    [订阅] GLM 5h ◔ 42% 周 ◕ 18% ⌃（最多 3 窗）
缺窗    [订阅] GLM 5h ◔ 42% 周 ◌ -- ⌃
```

| 项 | 规格 |
|---|---|
| 尺寸 | 高 24、圆角 999、padding 8、段距 6 |
| 字号 | 12px、`tabular-nums`；数值 600、标签 400 |
| 订阅段 | 名称 + 短标签 + 环 + 百分比；≤520px 只留首窗；**不显示重置时间** |
| 配色 | 弧 = 前景色；数字常态蓝 / 80–100 amber / ≥100（订阅 ≥90）红 |
| 状态 | 未设置 = 空环 + 「未设置」；全缺失 = 套餐查询失败；不补 0% |
| 交互 | Enter / Space 展开；`aria-expanded`；`aria-label` 为全量文本 |

## 2. P2 浮层

```text
当前模型                         ⓘ ⟳ ×
DeepSeek                         [ 按量 API ]
◔ 91.9%   ¥91.90 / ¥100.00   真实余额 ¥87.66   本月已花 ¥91.90
[ 当天 | 近7天 | 近30天 | 全部 ]
模型 / Tokens / 请求 / 命中
更新于 12:30                    [ 全量看板 ]
```

| 项 | 规格 |
|---|---|
| 宽度 | `fit-content`，280–480；触顶截断模型名，不出横向滚动 |
| 高度 | `max(200, min(70vh, pillTop - 16))`；贴 pill 上方 8px |
| 主区 | `auto 1fr 1fr 1fr` + gap 8：环+% / 已用·预算 / 真实余额 / 本月已花 |
| 订阅主区 | 每窗四段：`标签+环(20)+%` / `剩余 N%` / 倒计时 / 绝对时间 |
| 用量表 | 四列，无费用列；最多 5 行；`[` 落同一竖线；范围切换保留旧数据 |
| 底部 | 左「更新于」；右纯文字「全量看板」 |
| 关闭 | `×` / 点外部 / `Esc`；120ms 淡出后卸载，焦点回 Pill |
| 设置 | **不提供任何开关**；设置只在 P3 胶囊 |

## 3. P3 整页

```text
Token 看板                                    ★
数据来自本机会话记录 · 更新于 12:30
按量计价（按供应商）  名称 / 月度预算 / 已用 / 计划余额 / 真实余额
订阅套餐（按供应商）  每窗两行：环+%+剩余 / 倒计时 · 绝对时间
时间范围 + 两格卡 + 八列明细
设置与数据管理（sticky 胶囊）
```

| 项 | 规格 |
|---|---|
| 注册 | `main.key` = `sidebar.panellist.id` = `token-dash`；先 inject 再 register |
| 按量表 | 名称 / 月度预算（行内编辑）/ 已用（环+%）/ 计划余额（预算−已用）/ 真实余额 |
| 订阅表 | 只列有窗口的 provider；缺窗按位占位；≥90% 环与数字同红 |
| 两格卡 | 圆角 8 / 1px border-l3 / padding 12；两卡 gap 12、与表 16；总费用多币种同行 |
| 明细表 | 模型 / Tokens / 输入 / 缓存 / 输出 / 请求 / 命中 / 费用（API 计价估算） |
| 编辑 | 点数值或 `✎` 进入；Enter / 失焦保存，`Esc` 取消；同时只允许一行 |
| 胶囊 | 三行：刷新与间隔+余额开关 / 日志四按钮 / 价格表与版本+检查更新；sticky + 96px 留白 |
| 空态 | 某类为空整块不渲染；两类都空显示原因；范围无消耗只替换明细 |

## 4. 改造点索引

| # | 改造点 | 结果 |
|---|---|---|
| F1 | 三路关闭 | 已落地（`Esc` 为 document 级） |
| F2 / F3 | 可见性暂停 / 打开补刷新 | 已落地（共用 `usePolling`） |
| F4 | 取值三级兜底 | 已落地（投影 / 默认模型缺失时降级账本） |
| F5 | 空态逐条原因 | 待后端 `probe`（B5） |
| F6 / F7 | 进出动画 / 状态行 | 已落地 |
| F8 | 窄屏断点 | 已落地（P1 520 / P2 铺满 / P3 表格滚动） |
| F9 | 状态聚合函数化 | 不做（可选） |
| F10 | P1 应用环 | 已落地 |
| F11 | P3 整页 | 已落地 |
| F12 / F13 / F14 | 三个公共组件 | 已落地 |

## 5. 不采纳

| # | 项目 | 原因 |
|---|---|---|
| N1 | 15 套配色 + 全局字体覆盖 | 越界改宿主排版 |
| N2 | 面板内主题令牌覆盖 | 与只读 token 契约冲突 |
| N3 | 触发器多状态点 | P1 以单 provider 聚合 |
| N4 | 偏好存 localStorage | 统一走 host prefs |
| N5 | 设置区「测试」按钮 | provider 自动探测 |
| N6 | 订阅 pill 用百分比条 | 改用环 + 数字 |
| N7 | 整页三栏列表/详情 | 我们是聚合表 |
| N8 | 设置独立页 / 平级 tab / 页尾折叠 | 就地编辑 + 底部胶囊 |
| N9 | 右上角 `⋯` 收设置 | 与胶囊重复 |

## 6. 决策（归档时保留）

| # | 决策 |
|---|---|
| D1 | P2 宽度自适应 280–480 |
| D2 | P2 删进度条 |
| D3 | P3 只改预算数字，计费模式只读 |
| D4 | 胶囊 sticky + 96px 留白，矮/窄视口退化 static |
| D5 | 时间范围 P2 / P3 各自独立（P2 当天、P3 全部） |
| D6 | 计划余额 = 月度预算 − 已用，可为负 |
| D7 | 订阅表只列能取到窗口的 provider |
| D8 | P2 首屏空环 + 四列 `—`，不用骨架屏 |
| D9 | 浮层可直达整页（`selectPanel`，需先判 `hasMainPanel`） |
| D10 | 整页宽度基准：1280 视口下中栏 1000px |

## 7. 迭代记录（压缩）

2026-11-03 → 11-04 共 58 轮：结构定稿（P2 收敛 + P3 整页）→ 环/重置/表格三个公共组件 → 字号与数字规则 → 按量表四列与两格卡分行 → 实测回填整页机制 → 回写 `ui-design.md` v3.1 与 `design.md`。逐轮差异见 git 历史，不再保留在本文件。
