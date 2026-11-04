# 看板视觉走查 checklist（假数据截图）

> 状态：待批准（2026-11-04 第四轮：环三色语义 + 金额去绿；仅文档决策，`ui-design.md` 与代码待模板定稿后执行）<br>
> 依据方案：[`feature_fullpage_board.md`](../../plan/active/dsh/feature_fullpage_board.md)（已实施，`1.2.0-local.2`）<br>
> 证据来源：`npm run shots` 假数据截图；分析跑输出 `.tmp/shots/`，`docs/pic/` 只放 README 定稿图<br>
> 生命周期：回写 plan 后归档到 `docs/checklist/archived/board-visual-review-checklist.md`

## 一、阶段总览

| 批次 | 范围 | 顺序 | 状态 |
|---|---|---|---|
| V1 | P2 浮层：用量表样式 + 分隔与图标 | 先做（影响面小） | 待批准 |
| V2 | P3 整页：按量卡片 + 订阅卡片 + 明细表 | 次做（结构变动大） | 待批准 |
| V3 | P1 细节、暗色 / 320 回归、截图脚本 | 收尾 | 待批准 |

## 二、决策记录

| # | 问题 | 定案 |
|---|---|---|
| D1 | 分析截图存哪 | 脚本默认写 `.tmp/shots/`；`npm run shots -- --publish` 才覆盖 `docs/pic/`，publish 前清理旧图 |
| D2 | P2 用量表样式 | 表头 12px/500 + `label-tertiary` + 1px 下边线（不做底色块）；行高 28；行间 `color-mix(label-primary 6%)` 细线；单元格左右内边距 4；数值列右对齐 |
| D3 | P3 两区布局 | **每个 provider 一张卡**：宽度 `minmax(220px, 260px)`（上限 260，避免 3 家时被拉到 309）+ gap 12；订阅区一行 4 张，按量区一行 3 张、**末行居中**；卡顶为供应商名 + 计费 chip；圆角 8 / 1px `border-l3` / padding 14 |
| D4 | 卡内控件与字号 | 订阅与按量都复用 **`QuotaGauge`**：环 40 / stroke 4、环心 12px、环下百分比 16px / 600、辅助 11px；**按量卡环心写「已用」**，订阅卡环心写周期 |
| D5 | 按量卡内容 | 上部**竖排居中**：环 → 环下百分比 → `月度预算` 标签 → 输入框，整列水平居中（不再左右分栏，避免圆与横条对齐）；其下三行 `计划余额` / `真实余额` / `本月已花`。**不再显示「已用 / 预算」行**；改预算后环、状态、计划余额即时重算 |
| D6 | 订阅卡内容 | `5h / 周 / 月` **横向一排、等分**；每列一个 `QuotaGauge`：环心周期 → 环下已用% → 剩余% → 倒计时 → 绝对时间；**按实际窗口数出列，没有「月」就只出两列**（预览与实现一致，不留空列，也不显示 `月 —`） |
| D7 | 预算编辑入口 | **用常显输入框，不再放 `✎`**：`月度预算` 标签 + 币种前缀 + 数字输入（空值 = 未设置）；Enter / 失焦提交，`Esc` 回原值；提交后环、状态、计划余额即时重算 |
| D8 | 明细表归属 | 模型名前加 provider 徽标；列距 12；表头「费用」+ `title` |
| D9 | 层级策略 | 按量 / 订阅都用卡，但卡内密度不同；两格卡与设置胶囊不再加重，避免整页都在描边 |
| D10 | 必测回归 | 暗色 / 亮色各一眼；1000px 下卡片列数 = 4 / 760px = 3 / 520px = 2；P2 在 320px 不顶 480、不出横向滚动 |
| D11 | 三色语义 | 环与数字同色：normal 低饱和绿（`--td-state-ok`）、warn 黄、critical 红；语义固定、色值走 token，不写死业务 hex |
| D12 | 金额配色 | **金额改前景色 + 600，负数/超支仍红**；green 只表示「正常状态」，不再表示金额。`ui-design.md` §2.6 与 `client.js` 的改动排到模板定稿后 |
| D13 | 辅助文字 | 卡片内辅助三行（剩余% / 倒计时 / 绝对时间）用 `label-secondary`（约 68%），**与环心同色**；不用状态色，避免时间被误读为告警 |

## 三、截图证据

| 图 | 覆盖 | 观察 |
|---|---|---|
| `panel-api.png` / `panel-sub-2/3.png` | P2 三种形态 | 用量表只有裸 grid：无表头线、无行分隔、无内边距 |
| `settings.png` | P3 整页 | 订阅区四块松散连排、环 14 过小、右侧大片空白 |
| `pill-api.png` / `pill-sub.png` | P1 | 箭头为文本字形，小字号下有裁切风险 |

## 四、改进项

| # | 位置 | 现象 | 建议 | 优先级 | 落点 |
|---|---|---|---|---|---|
| UI-15 | P2 用量表 | 无表头线、无行分隔、无内边距，像裸文本 | 按 D2 补表格样式；补 `role="table" / row / columnheader / cell` | **P0** | `TokenTable` / `styles.table` |
| UI-16 | P3 按量区 | 名称列吸收全部宽度，数值挤右；四列横排与页面宽度不匹配 | 按 D3 / D5 改「每供应商一张卡：左 Gauge + 右预算输入 + 三行字段」 | **P0** | `BudgetTable` |
| UI-17 | P3 订阅区 | 每窗一行、环 14，四块平铺、右侧空 | 按 D3 / D4 / D6 改「每供应商一张卡 + 窗口一排 + `QuotaGauge`（环 40）」 | **P0** | `QuotaTable` / `QuotaGauge` |
| UI-02 | P3 订阅卡 | 缺窗渲染四个占位 | 按 D6 缺窗不出列；provider 完全无窗口则整卡不出现 | P1 | `QuotaCell` |
| UI-05 | P3 明细表 | 同名模型来自不同 provider 无法区分 | 按 D8 加 provider 徽标、列距 12、费用表头缩短 | P1 | `DetailTable` |
| UI-06 | P3 按量卡 | 预算编辑入口是 `✎`，不明显且字形会回退 | 按 D7 改为**右侧常显预算输入框**（币种前缀 + 数字 + 空值占位「未设置」），去掉 `✎` | P1 | `BudgetTable` |
| UI-07 | P3 按量卡 | 已用金额只隐含在比例里 | 保留环下百分比；预算金额由输入框承担，不再单列「已用 / 预算」行 | P2 | `BudgetTable` |
| UI-08 | P3 设置胶囊 | 第 2 行左右分置 | 四按钮同组左对齐 | P2 | `SettingsRows` |
| UI-09 | P2 浮层 | 主区与范围胶囊无分隔 | 1px 分隔线或间距 10 | P2 | `Panel` |
| UI-11 | P2 订阅态 | 窗口行与表头贴太近 | 表前 8px 或分隔线 | P2 | `Panel` |
| UI-10 | P2 头部 | 22px 实心图标压过 13px 标题 | 图标 12–13px 或按钮背景透明 | P3 | `PanelHeader` |
| UI-12 | P1 Pill | 箭头用文本字形 | 改旋转 SVG / CSS 三角 | P3 | `Pill` |
| UI-13 | 截图脚本 | 分析图混入 `docs/pic`；P3 截图底部留白 | 按 D1 加 `--publish`；按内容高度 `clip` | P1 | `tools/mock/shots.mjs` |
| UI-14 | 截图脚本 | 缺单窗订阅形态 | 补 `panel-sub-1`（分析图进 `.tmp/shots`） | P3 | `fixtures.mjs` / `shots.mjs` |
| UI-18 | 回归 | 新增卡边框 / 表头线在亮色下易发灰 | 统一 `color-mix(label-primary 6–8%)`；两主题各截一张对比 | P1 | 走查项，无代码落点 |
| UI-19 | P3 金额 | 费用列与两格卡金额用 green，与「环 normal 绿」语义重叠 | 按 D12 改前景色 + 600，负数/超支保留红；green 只表示正常状态 | P2 | `DetailTable` / 两格卡 / `fmtMoney` 调用处 |

## 五、阶段详情（批准后执行）

**V1 · P2（先做）**

1. `TokenTable` 补表头线、行分隔、行高、内边距；补 aria role。
2. 主区 / 胶囊、窗口行 / 表头之间补分隔。
3. 320px 视口复测宽度与横向滚动。

**V2 · P3（次做）**

1. `BudgetTable` 改卡片网格：每 provider 一卡，左 `QuotaGauge`（环 40、环心「已用」）+ 右预算输入框 + 三行 label-value。
2. `QuotaTable` 改卡片网格：卡内 5h/周/月 一排等分，每列用新控件 `QuotaGauge`（环 40、环心周期、环下百分比），缺窗不出列。
3. 明细表加 provider 徽标、列距 12、费用表头缩短。
4. **金额去绿**：明细费用列与两格卡金额改前景色 + 600，负数/超支红（D12 / UI-19）。

**V3 · 收尾**

1. `shots.mjs` 加 `--out` / `--publish`；分析图进 `.tmp/shots`。
2. 补单窗形态；P1 箭头改 SVG。
3. 暗色 / 亮色各出一张对比图。

**你收尾**

1. 目检 `.tmp/shots/` 新图：卡片列数、环尺寸、窗口一排是否成立。
2. 回复暗号：`截图已确认，开始回写`。

## 六、测试 / 走查

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| P2 表头有 1px 下边线、行高 ≥28 | 待执行 | 截图量行高 |
| P2 320px 不出横向滚动、宽度 ≤480 | 待执行 | `scrollWidth === clientWidth` |
| P3 卡片列数：1000px=4 / 760=3 / 520=2 | 待执行 | 三档截图量列数 |
| 订阅卡窗口列数 = 实际窗口数（两窗不出「月」列） | 待执行 | Kimi / Command Code 各一张 |
| 状态页覆盖 6 / 4 / 6 / 5 态 | 待执行 | IDE 预览 ring / inline-ring / cards-sub / cards-api |
| 按量与订阅 Gauge 环直径均 = 40，环心分别为「已用」与周期 | 待执行 | 截图量环与中心文字 |
| 百分比在环下 16px、剩余/时间 11px | 待执行 | 目检单卡字号层级 |
| 按量卡左 Gauge、右预算输入框；改预算后环与计划余额即时更新 | 待执行 | 预览中改值目检 |
| `npm run shots` 不写 `docs/pic`；`--publish` 才写 | 待执行 | 对比目录文件时间 |
| 亮色 / 暗色边框与分隔线可见 | 待执行 | 两主题截图 |

## 七、plan 回写候选

1. REQ-06 补 P2 用量表样式最小规格（表头线 / 行高 28 / 分隔 6%）。
2. REQ-07 补按量卡片形态（每供应商一卡、左环右预算输入、三行字段）。
3. REQ-08 补订阅卡片形态（窗口一排、按实际窗口数出列、缺窗不出列）与 `QuotaGauge` 控件要求（§九）。
4. `ui-design.md` §2.5 增补 `QuotaGauge`（环 40 / 环心周期 / 环下百分比），与 `ProgressRing` 并列但不合并。
5. 文档约定：分析截图进 `.tmp/shots`，`docs/pic` 仅定稿图。
6. 待模板定稿后一次性回写 `ui-design.md`：§2.5.1 三色语义与辅助行 `secondary`、§2.6 金额去绿、§3 P1 配色、§5.3 卡片宽度上限 260（D11 / D12 / D13）。

## 八、执行日志

| 时间 | 轮次 | 结果 |
|---|---|---|
| 2026-11-04 | 首轮截图分析 | 提出 UI-01 ~ UI-14 |
| 2026-11-04 | 反馈定案 | 新增 UI-15 / UI-16；D1–D6 |
| 2026-11-04 | 二轮评审 | 按量表改均分、`✎` 常驻、缺窗口径修正；补 D9 / D10 与 UI-17 |
| 2026-11-04 | 三轮评审 | 推翻「一整张大卡」：改**每供应商一张卡**；按量卡字段竖排、订阅卡窗口一排、环 28；草图重绘 |
| 2026-11-04 | 四轮评审 | 确认 `QuotaGauge`：环 40、环心周期、环下百分比；新增 §九 控件要求；用临时 HTML 生成真实比例预览并目检 |
| 2026-11-04 | 工具迁移 | 预览与草图工具迁入 `tools/preview/`（spec / render / ascii / templates），临时产物统一 `.tmp/preview/`；AGENTS.md 增加三层约定 |
| 2026-11-04 | 预览修正 | 两窗订阅不再画空「月」列；补按量卡模拟（环 28、字段竖排、超支负值转红） |
| 2026-11-04 | 预览拆分 | 三张独立图（gauge / cards-sub / cards-api）；卡片带真实供应商名；按量卡改用同款 Gauge（环 40 + 环心「已用」） |
| 2026-11-04 | 预算入口 | 按量卡去掉「已用 / 预算」行与 `✎`，改左环右输入框；改预算实时重算环、状态与计划余额；删除 ASCII 草图章节与对应生成脚本 |
| 2026-11-04 | 目录规范 | 新增 `tools/preview/drafts/` 与四层约定（templates / drafts / .tmp / docs.pic）；手写 HTML 禁入 `.tmp`；`ui-design` §5.3/§5.4/§5.6 按原型回写 |
| 2026-11-04 | 环状态图 | 抽出 `_ring.js` 统一四份模板的环绘制；新增 `ring.html`（6 态 + 3 组边界 + 3 档尺寸 + 3 种环心）；0% 不再画点 |
| 2026-11-04 | 配色收敛 | normal 数字改前景色（去业务蓝）；环心文字改 12px/600 `label-secondary`；warn 只染 amber、critical 环与数字同红 |
| 2026-11-04 | 三色语义 | 环与数字同色：normal 低饱和绿（`--td-state-ok`）/ warn 黄 / critical 红；语义固定、色值走 token；ui-design §2.5.1/§2.6/§3 与预览同步 |
| 2026-11-04 | 金额决策 | D12：金额改前景色 + 600、负数红，green 只表示正常状态；`ui-design.md` 与 `client.js` 的改动延到模板定稿后统一做（本轮仅文档） |
| 2026-11-04 | 预览精简 | 删除 `gauge.html` / `gauge.png`（与 `ring` + `cards-sub` 重复）；状态图收敛为 ring / cards-sub / cards-api 三张；README、清单与 mock 规则同步 |
| 2026-11-04 | 组件分层 | 环不加数字槽位：`ProgressRing`（几何）+ `PercentValue`（文本/颜色）+ `InlineRing`（P1/P2）+ `QuotaGauge`（P3）；新增 `inline-ring.html` 与 4 态预览 |
| 2026-11-04 | 辅助文字 | 卡片三行辅助文字 45% → 68%（`label-secondary`），与环心同色；不用状态色（D13） |
| 2026-11-04 | 预览流程 | 默认只生成 `.tmp/preview/<name>.html` 在 IDE 预览，不再默认截图；`--png` 才出图，publish 仍写 `docs/pic/` |
| 2026-11-04 | 卡片宽度 | 上限 260px（3 家不再拉到 309），按量区末行居中；环与预算改居中成组（gap 20） |
| 2026-11-04 | 按量对齐 | 放弃「圆对横条」的左右分栏，改竖排居中：环 → 百分比 → `月度预算` → 输入框；字段标签 45%→68% |
| 2026-11-04 | 页面预览 | 新增 `preview:pages`：真机导出 P1/P2/P3 的真实 DOM + 宿主 token 到 `.tmp/preview/*.html`；与 templates 的新设计分开看 |
| 2026-11-04 | 状态矩阵 | 预览改为「状态穷举」：Gauge 5 / 订阅 4 / 按量 5；新增 `tools/mock/AGENTS.md` 定义假数据覆盖规则 |

## 九、环与组合层控件要求（P1 / P2 / P3 共用）

> 环只画几何，数字与文案由组合层承担；**不给 `ProgressRing` 加数字槽位**，布局差异由两个组合层分别表达。

### 9.1 组件分层与签名

| 组件 | 职责 | 不负责 |
|---|---|---|
| `ProgressRing` | 弧长、描边、尺寸：`{ percent, state, size, stroke }` | 任何文字 |
| `PercentValue` | `0.425 → 42.5%`、`null → —`、按状态上色：`{ percent, state }` | 位置与间距 |
| `InlineRing` | 环 + 右侧数字（P1 / P2）：`{ percent, state, size, stroke, text? }` | 拼词条（`text` 由调用方给） |
| `QuotaGauge` | 环心标签 + 环下数字 + 三行辅助（P3） | 解析数值 |

- 公共件：`stateOf(percent, critical)` 判状态、`percentText(percent)` 格式化；P1 / P2 / P3 共用，不各写一份。
- `InlineRing` 不传 `text` 时内部用 `PercentValue`；需要 `--` 或自定义文案时再传。

#### QuotaGauge（P3）

```js
QuotaGauge({
  label,          // 环心文案：订阅 '5h' / '周' / '月'，按量 '已用'
  percent,        // 0–100；null → 空环 + '—'
  state,          // 'normal' | 'warn' | 'critical' | 'empty'
  remaining,      // 已格式化，如 '剩余 58%'
  relative,       // '3 小时后'
  absolute,       // '22:51'
  size = 40,
  stroke = 4,
})
```

#### InlineRing（P1 / P2）

```js
InlineRing({
  percent,        // 0–100；null → 空环 + '—'
  state,          // 'normal' | 'warn' | 'critical' | 'empty'
  size = 14,      // P1 14 / P2 20
  stroke = 2,     // P1 2 / P2 2.5
  text,           // 可选；默认 percentText(percent)
})
```

### 9.2 QuotaGauge 结构与尺寸

```text
┌ 环 40 × 40（stroke 4，中间透明）
│   └ 环心：label 12px / 600 / label-secondary
├ 间距 3px
├ percent 16px / 600（normal 低饱和绿 / warn 黄 / critical 红 / empty 弱）
├ 间距 4px
├ remaining 11px / secondary（68%）
├ relative 11px / secondary（68%）
└ absolute 11px / secondary（68%）
```

- 容器 `display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0`。
- `InlineRing`：`display:inline-flex; align-items:center; gap:4px`，环 14/2 或 20/2.5，数字 12px / 600，与环同色。
- 辅助三行（剩余 / 倒计时 / 绝对时间）用 `label-secondary`（约 68%），与环心标签同色，形成「标签层」；**不用状态色**，避免时间被误读为告警。
- 按量卡三行字段标签（计划余额 / 真实余额 / 本月已花）同样用 `label-secondary`（68%），值用 `label-primary` + 600，避免标签过淡。
- 按量卡布局：**竖排居中**（`flex-direction: column; align-items: center`），顺序为环 → 百分比 → `月度预算` 标签 → 输入框，gap 6 / 4；不做左右分栏，避免"圆对横条"的错位。
- 文本 `white-space:nowrap`；列宽 61px 时 `剩余 58%` 与 `22:51` 均不换行。
- **环绘制与 P1 / P2 共用同一套几何**（P1 14/2、P2 20/2.5、P3 40/4，阈值 warn 80 / API 100 / 订阅 90）；`QuotaGauge` 只是「环 + 环心 + 下方数字」的组合层，不再写第二套弧算法。
- `percent = 0` 与 `empty` 都不画弧（round linecap 会在 0 处留一个点），只保留轨道。

### 9.3 状态与配色

| 状态 | 弧 | 百分比 | 环心标签 | 辅助行 |
|---|---|---|---|---|
| normal | 低饱和绿 `--td-state-ok` | 同绿（与弧同色） | `label-secondary`（**不随状态变色**） | tertiary |
| warn（80–100） | 黄 `state-warn-primary` | 同黄 | 同上 | tertiary |
| critical（订阅 ≥90 / API ≥100） | 红 `state-error-primary` | 同红 | 同上 | tertiary |
| empty | 不画弧（仅轨道） | `—` | 同上 | `—` 或整块只留百分比 |

- 轨道 `border-l3`；颜色只走 token（`--td-state-ok` / `--dsw-alias-state-warn-primary` / `--dsw-alias-state-error-primary`），不散落业务 hex；中心标签不参与告警色，避免整块糊红。
- 语义固定（绿=正常 / 黄=接近阈值 / 红=超支），色值随主题调亮度但保持色相；normal 用低饱和绿，避免整页「全绿看板」。
- 空态只在 `percent` 为 `null` 时出现；窗口缺失不渲染列，不产生空态列。
- 色盲提示：绿/红组合对红绿色弱不友好，**百分比数字与弧长才是主线索**，颜色只用于加速识别；不得用颜色替代阈值文案。
- 已定（D12）：金额改前景色 + 600，负数/超支红；green 只表示正常状态。`ui-design.md` §2.6 与代码改动待模板定稿后执行。

### 9.4 卡内约束

- 订阅卡 229px → 内容 199px；窗口列宽 3 窗 61 / 2 窗 96 / 1 窗 199。
- 环 40 在 61px 列内左右各留约 10px；`42.5%` 16px 约 42px，不换行。
- 窗口数 = `provider.windows.length`（1–3），不补空列；卡内顺序为「名称行 → 10px → 窗口行」。
- 按量卡上限 260px（3 家一行 3 张、末行居中）：名称行 → 竖排居中（环 / 百分比 / `月度预算` / 输入框）→ 三行 label-value；环心「已用」，卡高约 280px。

### 9.5 无障碍

- 外层 `role="group"`，`aria-label` 形如 `5h 已用 42.5%，剩余 58%，3 小时后重置`；SVG `aria-hidden`。
- `InlineRing` 同理：环 `aria-hidden`，可读文本由 `PercentValue` 承担（`[API] 预算 12.3%`）。
- 空态 `aria-label` 形如 `5h 暂无数据`。
- 百分比不是唯一载体：剩余% 与时间同时可读。

### 9.6 落点

- `client.js` 新增 `PercentValue`、`InlineRing`、`QuotaGauge`，都放在 `ProgressRing` 之后；`stateOf` / `percentText` 与它们同层。
- `Pill`（P1 预算与订阅窗口）与 `WindowRow`（P2）改用 `InlineRing`，不再手写「环 + span」。
- `QuotaCell`（订阅）与 `BudgetTable` 的已用列（按量）调用 `QuotaGauge`。
- E2E：`token-dash-quota-gauge-<providerId>-<key>`，断言环 40、中心文字为周期或「已用」、百分比在环下；P1/P2 断言 `InlineRing` 的内联结构（环与数字同一行）。

### 9.7 预览方式（本轮已验证）

- 四个状态页（默认只生成 HTML，**在 IDE 里直接预览**；需要静态图时加 `--png`）：
  - `npm run preview ring` → `.tmp/preview/ring.html`：环的全量状态（6 态矩阵 + API/订阅 3 组阈值边界 + P1/P2/P3 三档尺寸 + 无标签/周期/「已用」三种环心）。
  - `npm run preview inline-ring` → `.tmp/preview/inline-ring.html`：InlineRing 4 态 × P1/P2 两档尺寸，附「预算」「订阅窗口」组合示例。
  - `npm run preview cards-sub` → `.tmp/preview/cards-sub.html`：订阅卡 6 态（三窗 ×2 / 两窗无月 / 两窗 critical / 单窗 / 含空窗），卡顶为真实供应商名。环 + 三行辅助信息的组合只在这里看，不再单独出 Gauge 状态图。
  - `npm run preview cards-api` → `.tmp/preview/cards-api.html`：按量卡 5 态（normal / warn / over / 预算未设置 / 余额不支持）；右侧预算输入框可改，环与计划余额即时重算，卡下 caption 跟随状态。
- 页面级预览：`npm run preview:pages` → `.tmp/preview/p1-pill-*.html` / `p2-panel-*.html` / `p3-board.html`，是**当前实现**的真实 DOM + 宿主 token；与 `templates/` 的新设计分开看，不能当验收依据。
- 状态覆盖口径见 [`tools/mock/AGENTS.md`](../../../tools/mock/AGENTS.md) §2：组件有 N 种状态就出 N 个样本，不合并。
- 尺寸来源：[`tools/preview/spec.mjs`](../../../tools/preview/spec.mjs)；模板在 [`tools/preview/templates/`](../../../tools/preview/templates/)，公共样式在 `_base.css`。
- 探索稿放 `tools/preview/drafts/`（入库，可粗糙），定稿时接 `spec.mjs` 再移入 `templates/`；手写 HTML 不落 `.tmp/`。
- 只有会被 README / 设计文档引用的图才 `npm run preview:publish <name>`；分析图一律留在 `.tmp/preview/`。
- 定稿后把尺寸 / 状态写回本清单与 `ui-design.md`。
