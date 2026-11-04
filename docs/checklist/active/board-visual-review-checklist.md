# 看板视觉走查 checklist（设计定稿）

> 状态：**设计定稿**（2026-11-04 第五轮），待写实现 plan；本轮只改文档，未动 `client.js`。<br>
> 依据：[`feature_fullpage_board.md`](../../plan/archived/dsh/feature_fullpage_board.md)（已实施，`1.2.0-local.2`）<br>
> 预览：`npm run preview ring` / `inline-ring` / `cards-sub` / `cards-api` / `page-p1` / `page-p2` / `page-p3`<br>
> 生命周期：plan 批准 → 建施工 checklist；实现完成后归档到 `docs/checklist/archived/`。

## 一、定稿摘要

| 页面 | 形态 | 关键点 |
|---|---|---|
| P1 | 底栏 Pill，内联环 | `InlineRing` 14/2；环与数字同色；最多 3 窗；箭头改 SVG |
| P2 | 浮层，两形态 | `fit-content` 280–480；按量四列主区；订阅窗口两行；表格补表头线与行分隔 |
| P3 | 整页，卡片网格 | 每 provider 一卡；按量竖排、订阅窗口一排；摘要带 + 明细底框；三行设置胶囊 |

## 二、决策记录

| # | 问题 | 定案 |
|---|---|---|
| D1 | 截图与预览产物 | 设计迭代只看 `.tmp/preview/*.html`（IDE 预览）；README 定稿图由 `npm run shots` 单独生成到 `docs/pic/`，两套互不复用 |
| D2 | P2 用量表样式 | 表头 12px/500 + `label-tertiary` + 1px 下边线（不做底色块）；行高 28；行间 `color-mix(label-primary 6%)` 细线；单元格左右内边距 4；数值列右对齐 |
| D3 | P3 两区布局 | 每 provider 一张卡；页宽 `100%; max-width: 952`；订阅区 `repeat(auto-fit, minmax(220px, 1fr))`（1000 四张 229 / 760 三张 / 520 两张）；按量区 flex、上限 260、末行居中；gap 12；圆角 8 / 1px `border-l3` / padding 14 |
| D4 | 卡内控件与字号 | 订阅与按量都复用 `QuotaGauge`：环 40 / stroke 4、环心 12px、环下百分比 16px / 600、辅助 11px；按量卡环心「已用」，订阅卡环心周期 |
| D5 | 按量卡内容 | 竖排居中：环 → 环下百分比 → `月度预算` 标签 → 输入框；其下 `计划余额` / `真实余额` / `本月已花` 三行；不显示「已用 / 预算」行；改预算即时重算 |
| D6 | 订阅卡内容 | `5h / 周 / 月` 横向一排、等分；每列一个 `QuotaGauge`：环心周期 → 环下已用% → 剩余% → 倒计时 → 绝对时间；按实际窗口数出列，没有「月」只出两列 |
| D7 | 预算编辑入口 | 常显输入框，不再放 `✎`：`月度预算` 标签 + 币种前缀 + 数字（空 = 未设置）；Enter / 失焦提交，Esc 回原值 |
| D8 | 明细表归属 | 模型名前加 provider 徽标；列距 12；表头「费用」+ `title` |
| D9 | 层级策略 | 按量 / 订阅用卡；时间范围 + 摘要带 + 明细合并为一个底框（1px / 圆角 10 / padding 12–14），三层容器不叠加加重 |
| D10 | 必测回归 | 暗色 / 亮色各一眼；订阅卡 1000=4 / 760=3 / 520=2 列；P2 在 320px 铺满可用宽度、不横向滚动（min-width 可降到 260） |
| D11 | 三色语义 | 环与数字同色：normal 低饱和绿（`--td-state-ok`）、warn 黄、critical 红；语义固定、色值走 token，不写死业务 hex |
| D12 | 金额配色 | 金额改前景色 + 600，负数 / 超支仍红；green 只表示「正常状态」，不再表示金额 |
| D13 | 辅助文字 | 卡片辅助三行（剩余% / 倒计时 / 绝对时间）用 `label-secondary`（约 68%），与环心同色；不用状态色，避免时间被误读为告警 |
| D14 | 范围与明细底框 | 时间胶囊、摘要带、模型明细共用一个底框；框内 10px 分区 + 1px 分隔线；不再各自加外框 |
| D15 | 总计展示 | 整宽摘要带：左右两半 + 1px 竖线，两半内容水平居中；总费用与多币种同字号同字重 26px / 600（10px 间距）、Tokens 26px / 600 + 11px 拆分；范围胶囊与「共 N 个模型 · 更新于」同行、整行左对齐（16px 间距） |
| D16 | 单币种居中 | 摘要带只有一个币种时，该金额在左半栏居中；多币种作为一组整体居中，不左偏 |
| D17 | 设置胶囊 | 三行带 40px 行标签（刷新 / 日志 / 版本），行间 1px 分隔线；仅「立即刷新」用主按钮底色，其余 ghost；版本行只留 `vX.Y.Z · 价格表 日期` |
| D18 | P2 宽度 | `width: fit-content` + 280–480；宽度由摘要 / 窗口行 + 数值列决定，模型名 `max-width: 190px` + 省略号，不驱动面板变宽 |

## 三、组件契约

> 环只画几何，数字与文案由组合层承担；**不给 `ProgressRing` 加数字槽位**，布局差异由两个组合层分别表达。

| 组件 | 职责 | 不负责 |
|---|---|---|
| `ProgressRing` | 弧长、描边、尺寸：`{ percent, state, size, stroke }` | 任何文字 |
| `PercentValue` | `0.425 → 42.5%`、`null → —`、按状态上色：`{ percent, state }` | 位置与间距 |
| `InlineRing` | 环 + 右侧数字（P1 / P2）：`{ percent, state, size, stroke, text? }` | 拼词条（`text` 由调用方给） |
| `QuotaGauge` | 环心标签 + 环下数字 + 三行辅助（P3）：`{ label, percent, state, remaining, relative, absolute, size, stroke }` | 解析数值 |

- 公共件：`stateOf(percent, critical)` 判状态、`percentText(percent)` 格式化；P1 / P2 / P3 共用。
- `InlineRing` 不传 `text` 时内部用 `PercentValue`；需要 `—` 或自定义文案时再传。

### 3.1 QuotaGauge 结构

```text
┌ 环 40 × 40（stroke 4，中间透明）
│   └ 环心：label 12px / 600 / label-secondary
├ 间距 3px
├ percent 16px / 600（normal 绿 / warn 黄 / critical 红 / empty 弱）
├ 间距 4px
├ remaining 11px / secondary（68%）
├ relative 11px / secondary（68%）
└ absolute 11px / secondary（68%）
```

- 容器 `flex-direction: column; align-items: center; gap: 4px; min-width: 0`。
- `InlineRing`：`inline-flex; align-items: center; gap: 4px`，环 14/2 或 20/2.5，数字 12px / 600，与环同色。
- 辅助三行与环心同色（68%），不用状态色；按量卡字段标签同样 68%，值前景色 + 600。
- 环绘制共用一套几何（P1 14/2、P2 20/2.5、P3 40/4，阈值 warn 80 / API 100 / 订阅 90）；`percent = 0` 与 `empty` 都不画弧。

### 3.2 状态与配色

| 状态 | 弧 | 百分比 | 环心标签 | 辅助行 |
|---|---|---|---|---|
| normal | 低饱和绿 `--td-state-ok` | 同绿 | `label-secondary`（不随状态变色） | secondary |
| warn（80–100） | 黄 `state-warn-primary` | 同黄 | 同上 | secondary |
| critical（订阅 ≥90 / API ≥100） | 红 `state-error-primary` | 同红 | 同上 | secondary |
| empty | 不画弧（仅轨道） | `—` | 同上 | `—` |

- 颜色只走 token，不散落业务 hex；normal 用低饱和绿，避免整页「全绿看板」。
- 色盲提示：绿 / 红组合对红绿色弱不友好，百分比与弧长是主线索，颜色只加速识别。
- 金额：前景色 + 600，负数 / 超支红（D12）。

### 3.3 卡内尺寸

- 订阅卡 229px → 内容 199px；窗口列宽 3 窗 61 / 2 窗 96 / 1 窗 199；环 40 在 61px 列内左右各留约 10px。
- 按量卡上限 260px（3 家一行 3 张、末行居中），卡高约 280px。
- 摘要带：整宽、1px / 圆角 8，两半各 padding 12–14、中间 1px 竖线；高约 76px；≤560 上下堆叠。
- 设置胶囊：三行、40px 行标签、1px 行分隔；主按钮仅「立即刷新」。

## 四、页面规格摘要

**P1 · Pill**

- `InlineRing` 14/2，环在数字左侧；环与数字同色；`[API]` / `[订阅]` 标签 12px。
- 订阅最多 3 窗，用 `·` 分隔；无窗口 provider 不出现；展开箭头用 SVG（不用文本字形）。
- 空态：`[API] ◌ --`，不隐藏 Pill。

**P2 · 浮层（280–480，fit-content）**

- 头部：当前模型 + ⓘ / ⟳ / ×。
- 按量：四列主区（InlineRing 20 + 已用 / 预算 + 真实余额 + 本月已花）→ 范围胶囊 → 四列用量表 → 更新于 + 全量看板。
- 订阅：供应商名 + `[订阅]` → 窗口行（每窗两行：`5h` + 环 + % / `剩余 N% · X 后`）→ 范围胶囊 → 用量表 → 底部。
- 表格：表头 12px/500 + 1px 下边线，行高 28，行间 6% 细线，单元格左右 4。
- 模型名 `max-width: 190px` + 省略号，不驱动面板宽度。

**P3 · 整页**

- 页宽 `100% / max-width 952`；两区卡片网格：订阅 `auto-fit minmax(220px, 1fr)`，按量 flex 上限 260、末行居中。
- 按量卡：名称 + `[按量 API]` → `QuotaGauge`（环心「已用」）→ 月度预算输入 → 计划 / 真实 / 本月三行。
- 订阅卡：名称 + `[订阅]` → 窗口一排，每列 `QuotaGauge`（环心周期），缺窗不出列。
- 范围与明细底框：范围胶囊 + `共 N 个模型 · 更新于` 同行左对齐 → 摘要带（两半居中）→ 1px 分隔 → 8 列明细（窄屏内部滚动）。
- 设置胶囊：刷新 / 日志 / 版本三行，40px 标签对齐，立即刷新为主按钮。

## 五、验收用例

| 用例 | 结果 | 证据 |
|---|---|---|
| P2 表头 1px 下边线、行高 ≥28、aria role 完整 | 待执行 | 截图 + DOM 断言 |
| P2 320px 不出横向滚动、宽度 ≤480 | 待执行 | `scrollWidth === clientWidth` |
| P2 实测宽度按量 365 / 订阅 349；长模型名省略 | 待执行 | 截图量宽 |
| P2 订阅窗口两行：环行 + `剩余 N% · X 后` | 待执行 | 订阅浮层截图 |
| 订阅卡列数 1000=4 / 760=3 / 520=2，无横向滚动 | 待执行 | 三档截图量列数 |
| 订阅两窗 provider 不出「月」列 | 待执行 | Kimi / Command Code |
| 按量 3 家 1000 一行 3 张、520 两行（2+1） | 待执行 | 两档截图 |
| 按量与订阅 Gauge 环直径均 40，环心分别「已用」/ 周期 | 待执行 | 截图量环 |
| 百分比在环下 16px、辅助 11px / 68% | 待执行 | 目检字号层级 |
| 按量卡竖排预算输入，改值后环与计划余额即时更新 | 待执行 | 预览改值 |
| 摘要带单币种居中、多币种成组居中；顶部行左对齐 | 待执行 | 目检两态 |
| 胶囊三行标签对齐、仅「立即刷新」主按钮 | 待执行 | 目检 |
| `npm run shots` 不写 `docs/pic`；`--publish` 才写 | 待执行 | 对比目录时间 |
| 亮色 / 暗色边框与分隔线可见 | 待执行 | 两主题截图 |

## 六、plan 回写清单

1. 新建实现 plan：`docs/plan/active/dsh/feature_board_cards_redesign.md`（组件拆分、P1/P2/P3、脚本、测试）。
2. `ui-design.md` 升 v3.2：§2.5 四组件、§2.6 配色、§3 P1、§4 P2 两形态、§5.3/5.4 卡片、§5.6 预算、§5.7 胶囊、§8 响应式。
3. `design.md` 架构段：`client.js` 新增 `PercentValue` / `InlineRing` / `QuotaGauge`，数据流不变。
4. 施工 checklist：`docs/checklist/active/board-redesign-build-checklist.md`（plan 批准后）。
5. 实现后：`README.md` / `README.en.md` 图片与文字、`CHANGELOG.md`、`npm run shots` 重出图。

## 七、执行日志

| 时间 | 轮次 | 结果 |
|---|---|---|
| 2026-11-04 | 首轮 ~ 四轮 | 截图分析 → P2 表格 / P3 卡片 → 每供应商一卡 → `QuotaGauge` 环 40 |
| 2026-11-04 | 工具迁移 | 预览与草图工具迁入 `tools/preview/`；临时产物统一 `.tmp/preview/` |
| 2026-11-04 | 配色 | normal 去蓝 → 前景色 → 低饱和绿；warn 环数字同黄；金额去绿（D12） |
| 2026-11-04 | 组件分层 | `ProgressRing` / `PercentValue` / `InlineRing` / `QuotaGauge`；环不加数字槽位 |
| 2026-11-04 | 整页模板 | page-p1/p2/p3 设计稿；P2 两形态；P3 卡片 + 摘要带 + 胶囊 |
| 2026-11-04 | 响应式 | 页宽 max-width 952；订阅 1000/760/520 = 4/3/2；明细内部滚动 |
| 2026-11-04 | 摘要带 | 两格卡 → 整宽摘要带；单币种居中；顶部行左对齐 |
| 2026-11-04 | 胶囊 | 三行标签化，主 / ghost 按钮分层 |
| 2026-11-04 | 设计冻结 | 决策 D1–D18 收口，进入 plan 编写 |
| 2026-11-04 | 施工落地 | 按 plan S0–S4 完成：四组件、三色环、P1/P2/P3 卡片化、摘要带与三行胶囊；e2e 通过，README 截图重出 |
