# Token 看板 UI 迭代：用量/设置双 tab 与时间范围

> 状态：**待验收**（v2.21 实施完成；L1 61/61、L3 E2E 通过；桌面视觉待用户启动 DSH 验证）<br>
> 创建时间：2026-11-02<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[UI 设计 v2（视觉真源）](../../ui-design.md)、[token-dash 主计划（已归档）](../archived/feature_token_dash.md)、[Provider 边界计划（已归档）](../archived/feature_provider_boundary.md)<br>
> 说明：本文件是下一版 UI 的实施计划，只保留实施细节与注意事项；框线图与显示规格见 ui-design.md v2.21。

## 〇、前置依赖 / 代码探查事实

### 已明确

- 现状：P2 是单页浮层（看板），P3 是独立的设置视图（带"← 返回"）；`client.js` 只消费 `SummaryVM`。
- VM 现状：`buildSummary` 输出今日/本月/按模型聚合，没有任意时间范围；预算按**本月**计算。
- 数据基础：`src/store.js` 的 `state.days` 已按天保存 provider/model 的 token 与费用，`months/YYYY-MM.json` 为月度账本；**增加时间范围不需要改存储格式**。
- 预算口径：`src/core.js` 中 `budget.remaining = max(0, amount - used)`、`percent = min(9.99, used / amount)`，与时间范围无关。
- 订阅：`ProviderSnapshot.windows` 是账户级 5h/周/月窗口，与时间范围无关。
- 币种：`apiTotals` 按 CNY / USD 分组，禁止跨币种合计。
- 参考实现：`reference/third-party/cc-switch`（最新 main，2026-11-02 拉取）。托盘面板（`src/tray-panel/`）设计语言：**320px 面板 / segmented 胶囊 tab / 信息行三列网格（名称+副行|右侧状态）/ QuotaBlock 额度网格（文字|4px 迷你条|重置时间）/ Stat 卡（label 11px + 值 17px + detail 10.5px 副行）/ 字号阶梯 13-11-10.5 / 色彩克制（蓝选中 amber 警告 green 金额其余灰阶）**；本计划借鉴信息层级与密度语言，不借原生窗口/玻璃/趋势图（BND-01）。

### 待对齐

（无——已随 v2.21 定稿对齐：范围聚合走独立 `/usage` 路由、字段形状见 §2.2；"全部"起点 = 最早 `state.days` 日、聚合 <100ms 必要时缓存；订阅行用 QuotaBlock 网格，320 面板内不换行。）

## 一、需求

| ID | 优先级 | 需求 / 边界 / 风险 | 成功信号 |
|---|---|---|---|
| REQ-01 | P0 | P2/P3 收进同一浮层的 `用量 / 设置` 双 tab，用量在前；设置页保留六类内容并改为 5.1/5.2/5.3/5.4，去掉“← 返回” | 打开浮层默认用量；切 tab 不丢范围选择 |
| REQ-02 | P0 | 时间范围 `当天 / 近7天 / 近30天 / 全部`，与顶部 tab 同一套 segmented 胶囊（28 高 / 2px 内衬 / 8px 圆角 / DSH 主题选中块 + shadow / 11px / 等分），默认当天，本地记忆 | 切换后卡片/明细同步变化；范围不是普通 tab/下划线 |
| REQ-03 | P0 | 固定区放在范围选择器上方：本月预算（每 API provider 一行：% + **48×4 蓝色 MiniBar** + 已用/总额 + **右端账户余额**）+ 订阅套餐（每订阅 provider 一行：5h/周 + 同款 MiniBar + 重置时间 + `⟳` 图标）；两者不随范围变 | 切换范围时固定区不动；余额恒显示（#31）；所有条同规格；订阅刷新只查 quota、不显示文字 |
| REQ-04 | P0 | 两格卡（砍请求/命中率格——明细副行已有）：总费用（多币种分行）、真实 Tokens（detail 小字：入/出）；只统计范围内有消耗的 provider/model | 当天/全部口径正确，0 消耗不计入 |
| REQ-05 | P0 | 明细改**行卡片**（合并原费用表/用量表）：provider 组行（13px semibold）→ 模型行（名称左 + **费用右对齐**）→ 用量副行（三列网格：`Tokens` / `请求` / `命中`，无点分隔）；`ⓘ` 紧跟 Tokens，tooltip 展示输入/缓存/输出；订阅行不显示费用；费用按 provider 币种；随范围切换；只列有消耗的行；不设"查看全部" | 价格在模型右侧；Tokens/请求/命中三列对齐；tooltip 内容准确；多 provider 组行正确 |
| REQ-06 | P0 | 预算剩余 = 本月总额 − 已用；余额 = 账户余额；两者文案不得混用 | 卡片/预算行/文案一致 |
| REQ-07 | P0 | 空态：无 API 消耗时两格卡显示 `¥0.00`、明细组行/模型行不渲染（v2 行卡片无表头占位）；无订阅隐藏订阅段；无预算显示"预算未设置" | 各空态不白屏 |
| REQ-08 | P0 | 范围聚合只读 `state.days`；预算仍本月；订阅不参与范围聚合 | 不改存储格式、不改预算算法 |
| REQ-09 | P0 | 可访问性：tab 用 `role=tablist/tab`，范围用 tablist；`ⓘ`/`⟳`/`×`/`⤓` 可聚焦；焦点可见；单位/币种随 provider | 键盘可完成切换、查支持和更新 |
| REQ-10 | P0 | P1 结构与内容不变（模式、预算 %、今日、余额 / 订阅窗口） | 桌面 P1 无可见变化 |
| REQ-11 | P0 | 全局视觉 token：MiniBar 固定 48×4、主题 token 填充；Segmented 统一胶囊（28 高 / 2px 内衬 / 8px 圆角 / 主题选中块 + shadow / 11px / 等分） | 所有进度条与切换器同规格；亮暗主题不出现硬编码白底；warning/over 只改文字色 |
| REQ-12 | P0 | P2/P3 右上角固定刷新 `⟳` + 关闭 `×`；关闭 X 两个 tab 都常驻；点击外部仍可辅助关闭 | 无“只能点外部关闭”；刷新/关闭均可达 |
| REQ-13 | P0 | P2/P3 用中性底框分区：`Panel → Section → Tile` 最多两层；P2 固定区/范围区、P3 五个分区各一块；分区不靠色相，行内透明 | 分区清晰、无满屏描边卡、无嵌套三层底框 |
| REQ-14 | P0 | P3“价格与版本”补全：五家价格页链接与标签同一行、价格表 `updatedAt/source`、版本/检查更新状态（更新用 `⤓` 图标）；VM 暴露 `catalog` 元数据 | 不缺 OpenRouter/Qwen；标签+链接单行不换行；更新图标不與刷新混淆；流程完整 |
| REQ-15 | P0 | P2 不显示底部“本机估算 / 刷新时间”底注；刷新状态只由标题栏 `⟳` 表达 | 浮层底部无冗余说明行 |
| REQ-16 | P0 | P2 头部 `⟳` 左侧增加 `ⓘ`，hover/focus/点按显示支持范围：`目前支持 DeepSeek / Kimi / GLM / OpenRouter / Qwen API Key`；P3 不显示 | 不占常驻行；键盘可达；tooltip 不溢出 |
| REQ-17 | P0 | P3 按 P2 同构：5.1 结构 / 5.2 分区与行 / 5.3 交互与状态 / 5.4 状态；补动态数量、空态、预算保存、日志/价格/版本状态 | P3 文档结构与 P2 一致；空态/保存/更新均有定义 |
| REQ-18 | P0 | 按钮默认 DSH 蓝：`--dsw-alias-state-business-primary`，bg 16% / border 32%；头部图标/日志/订阅刷新/检查更新同款；segmented 选中用主题 token | 按钮颜色统一；卡片仍是中性底框 |
| REQ-19 | P0 | 状态完整性：P1/P2/P3 覆盖加载、刷新失败、局部失败、stale、无 provider；状态用文案 + `aria-live`，不只靠颜色 | 保留旧数据；错误可见可重试；不白屏 |
| REQ-20 | P0 | 格式与校验：Tokens/金额/百分比/时间统一；预算只允许空或 `>=0` 十进制；非法/保存失败有行内错误 | 同一数据跨页格式一致；非法输入不落库 |
| REQ-21 | P0 | 响应式：面板 `min(320, 100vw-16)`；名称截断、金额不截断；价格链接单行可横向滚动；tooltip 不溢出 | 320 与窄窗口均无横向页面滚动/遮挡 |
| BND-01 | 边界 | 不做趋势图/热力图；不引入图表库 | 无新增依赖 |
| BND-02 | 边界 | 不做"查看全部"/独立明细页/分页；明细行卡片全量展示，靠面板滚动 | 无分页控件 |
| BND-03 | 边界 | 不改价格算法、存储格式、订阅 adapter、provider 边界 | 相关测试不动 |
| BND-04 | 边界 | 不跨币种合计；总费用按币种分行 | CNY/USD 独立 |
| BND-05 | 边界 | 设置页保留预算、订阅、显示、日志、价格、更新六类内容；改为 P3 5.1/5.2/5.3/5.4 结构；不引入价格编辑/诊断/手动模式 | 设置不再混用旧单页布局 |
| RSK-01 | 风险 | 范围聚合在"全部"下遍历天数过多 | 单次 <100ms（本机数据）；必要时缓存 |
| RSK-02 | 风险 | 月度预算与范围金额混读 | 固定区与范围区视觉分离、文案带"本月/范围" |
| RSK-03 | 风险 | 多币种卡片与明细口径不一致 | 两格卡按币种分行；明细费用随 provider 组行（币种唯一） |
| RSK-04 | 风险 | 预算/订阅行在 320 面板下换行挤压 | 迷你条固定 48×4，不参与弹性；名称可截断；明细为行卡片，无列宽溢出问题 |

## 二、设计方案

### 2.1 结构

```text
[client 用量 tab]
   ├─ 固定区：summary.providers → 本月预算行 / 订阅套餐行
   └─ 范围区：range → GET /usage?range=... → 两格卡 + 明细行卡片
                                   │
                          [buildUsage(state, range, now)]
                                   │
                          state.days（按天 provider/model 聚合）
```

**视觉与交互规格（框线图、显示细节、文案空态）的唯一真源：[ui-design.md](../../ui-design.md)（v2.21 定稿版）**——本计划只保留实施细节与注意事项。

### 2.2 关键签名 / 字段

| 层 | 名称 | 备注 |
|---|---|---|
| core | `buildUsage(state, range, now)` | 纯函数；返回 `{ range, startAt, endAt, totals, models }` |
| core | `summary.catalog` | `{ version, updatedAt, source }`；P3 显示价格表新鲜度，失败显示“—” |
| core | `totals[currency]` | `cost / requests / input / output / cacheRead / cacheCreate / hitRate`；币种独立 |
| core | `models[]` | `providerId / providerName / modelId / displayName / currency / requests / input / cacheRead / output / hitRate / cost`（share 已删——v2 明细无占比列） |
| route | `GET /token-dash/api/usage?range=today\|7d\|30d\|all` | 非法 range → 400 `invalid-range`；默认 `today` |
| client | `usageRange` | `today / 7d / 30d / all`；localStorage 记忆 |

### 2.3 数据与口径

- 范围：当天=本地 0 点起；近 7/30 天=本地日历回看（含今天）；全部=最早 `state.days` 日；结束=当前。
- 真实 Tokens = 输入 + 命中 + 输出（与明细行同口径；缓存写入如非 0 一并计入）。
- 明细行：模型行左侧名称、右侧费用；下一行三列 `Tokens 319.4M ⓘ` / `请求 1.08k` / `命中 99.4%`；`ⓘ` 的 hover/focus tooltip 展示 `输入 1.88M · 缓存 316.39M · 输出 1.12M`（tabular-nums）——零宽度成本。
- 总费用：按币种分行；无任何消耗时显示 `¥0.00`。
- 价格表元数据：`summary.catalog = { version, updatedAt, source }`；P3 显示 `价格表 YYYY-MM-DD · 社区 / 内置兜底`，缺失显示“—”，不写死日期。
- 格式：Tokens `<1k` 整数、`1k–999.9k` 一位小数、`≥1M` 一位小数；金额 2 位 + 币种；百分比一位、无分母 `--`；时间本地 `HH:mm`。
- 预算输入：空值删除预算；否则只接受 `>=0` 十进制；负数/科学计数法/货币符号拒绝；非法值红边 + `请输入 0 或正数`，不覆盖旧值。
- 明细只列范围内有消耗的行；不再补"配置即可见"的 0 值默认行（该行为属于旧看板的月度视图）。
- 预算固定本月：`budget.remaining` 取 VM 值，超支显 `¥0.00` + 红色状态；无预算显示"预算未设置"+ 满格中性条。

### 2.4 关键陷阱

| 项 | 约束 |
|---|---|
| 月度预算 vs 范围金额 | 固定区与范围区必须视觉分区；文案写"本月预算""统计范围" |
| 订阅不随范围 | 订阅段标注"账户级"，不参与 `buildUsage` |
| 多币种 | 卡片分行、费用表分组，禁止合计 |
| 0 值补行 | 范围视图不补；空态两格卡显 `¥0.00`、明细行不渲染（v2 无表头占位） |
| 宽度体系 | 面板 **320**（cc-switch 同款）；明细为行卡片（无表头无列宽）；字号阶梯 13/11/10.5；MiniBar 全局固定 48×4、填充主蓝、不随内容拉伸；warning/over 只改百分比文字色；副行缩进与组行层级用 padding 表达 |
| 胶囊宽度 | 顶部 tab 与范围使用同一套 segmented 胶囊，撑满可用宽、子项等分；P3 刷新间隔同一胶囊样式、容器 224；不按文字长度跳宽 |
| 底框层级 | `Panel → Section → Tile` 最多两层；Section 中性灰（亮 3% / 暗 4%），Tile 仅两格统计卡；行内透明；Section 不描边、不按分区换色 |
| 头部动作 | P2：`ⓘ` 支持范围 → `⟳` 全局刷新 → `×` 关闭；P3：`⟳` + `×`；检查更新用 `⤓`，不与刷新共用 |
| P3 结构 | 5.1 结构 / 5.2 分区与行 / 5.3 交互与状态 / 5.4 状态；动态 provider、空态、预算保存、日志、价格/版本状态必须覆盖 |
| 状态矩阵 | P2 初次加载/刷新/全量失败/局部失败/stale；P3 prefs 加载失败/保存中/保存失败/日志失败/更新状态；均保留旧数据、可重试 |
| 响应式 | 面板 `min(320,100vw-16)`；名称截断，金额不截断；价格链接单行可横向滚动；tooltip 翻转不溢出 |
| 全部范围 | 从最早日期起，不能按 0 铺满；必要时缓存 |
| 时区 | 本地日历日切，不用 UTC 直接减 24h |

### 2.5 日志与观测

- `[TD:vm] usage range=7d start=… days=N models=M`（每次聚合一条）
- `[TD:ui] range switch range=30d`（客户端切换）
- 失败：`[TD:vm] usage.fail range=… reason=…`

## 三、实现要点（待实施）

### 3.0 开发改动总览（计划）

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01 | 修改 | `client.js` | Panel 改双 tab 壳；P2/P3 共用头部；设置视图改为 tab 内容，去掉"← 返回" |
| CHG-02 | 修改 | `client.js` | 用量 tab 固定区：预算行 + 订阅套餐行 + `⟳` 图标；P2 加 `ⓘ` 支持范围 |
| CHG-03 | 修改 | `client.js` | 范围 segmented、两格卡、明细行卡片（价格右/Tokens 下行/三列/ⓘ）；范围切换重取 `/usage` |
| CHG-04 | 修改 | `src/core.js` | 新增 `buildUsage` 纯聚合（范围、币种、模型、命中率）；summary 暴露 `catalog` 元数据 |
| CHG-05 | 修改 | `index.js` | 新增 `/usage` 路由与日志；参数校验 |
| CHG-06 | 修改 | `test/unit/*.test.mjs`、`scripts/e2e.mjs` | 范围边界、币种、空态、tab/范围、动态 provider、P3 结构断言 |
| CHG-07 | 修改 | `docs/ui-design.md` | ✅ 已完成（v2.21 定稿回写：P2/P3/全局视觉/状态/格式/变更记录） |
| CHG-08 | 修改 | `client.js` | 图标与头部：内联 Lucide `RefreshCw/Download`；P2 `ⓘ`/⟳/×，P3 ⟳/×/⤓；订阅局部 ⟳ |
| CHG-09 | 修改 | `client.js` | P3 5.1/5.2/5.3/5.4：动态数量/空态、预算保存、日志、价格/版本状态；无手动模式/诊断/本月 Token |
| CHG-10 | 修改 | `client.js` | P1/P2/P3 加载/错误/stale、格式统一、预算校验、窄屏溢出与 tooltip 翻转 |

### 3.1 改动清单（待实施）

- `src/core.js` · `buildUsage`：按范围过滤 `state.days`，按币种/模型聚合；返回 `range/startAt/endAt/totals/models`；不改变预算算法。
- `index.js` · `/usage`：校验 `range`，非法返回 `400 invalid-range`，调用 `buildUsage` 并记录 `[TD:vm]`。
- `client.js` · `Panel`：P2/P3 双 tab；共用头部结构；P2 有 `ⓘ/⟳/×`，P3 有 `⟳/×`；不注册 `settings.section`。
- `client.js` · `UsageTab`：固定区（预算/订阅/局部 `⟳`）、范围胶囊、两格 tile、明细行；空 provider 显示空态。
- `client.js` · `Settings`：按 5.1/5.2/5.3/5.4；预算保存、订阅刷新、显示、日志、价格/版本；不显示未配置 provider；无诊断/模式下拉/本月 Token。
- `client.js` · 图标：内联 Lucide `RefreshCw`/`Download`，不用文本 `⟳`；aria-label/tooltip 完整。
- `client.js` · 状态：P2 保留旧数据 + 错误条/局部错误/stale 点；P3 prefs 加载失败/保存中/失败/日志失败；P1 `--`/`~`。
- `client.js` · 格式/校验：统一 `formatTokens/Money/Percent/Time`；预算空值删除、非法值红边、失败保输入；窄屏 clamp/截断/tooltip 翻转。
- `scripts/e2e.mjs`：默认当天、切 7d、空数据、多币种、动态 provider、P3 结构、日志/更新图标、错误/stale、暗色 token、窄屏。
- 已实施：`buildUsage` + `/usage`、P2 固定/范围/明细、P3 五分区、主题 token、状态/格式/校验、E2E 矩阵。

## 四、不改动 / 边界

- P1 Pill 的结构、字段与交互不变。
- 不改 `src/pricing.js` 计价、`src/store.js` 存储格式、`src/adapters.js` 订阅解析。
- 不做趋势图、热力图、请求日志页、分页/"查看全部"。
- 不做跨币种合计、汇率换算、自定义币种。

## 五、验收要点（待验证）

| 项 | 来源 | 验证方式 | 结果 |
|---|---|---|---|
| 双 tab 与默认用量 | REQ-01 | L3：打开浮层、切设置再切回，范围保持 | 待验证 |
| 四个范围口径 | REQ-02/08 | L1：当天/7d/30d/all 边界、跨月、最早日 | 待验证 |
| 固定区不随范围 | REQ-03 | L3：切范围后预算/订阅文本不变 | 待验证 |
| 两格卡口径 | REQ-04/06 | L1 + L2：币种分行、0 消耗不计、剩余/余额区分 | 待验证 |
| 明细行卡片随范围 | REQ-05/D-12 | L3：模型名左/价格右；Tokens/请求/命中三列对齐、无点分隔；tooltip 准确；行集变化 | 待验证 |
| 迷你条全局统一 | REQ-11/D-10 | L3：预算/5h/周所有条均 48×4、填充主蓝、不随内容拉伸；warning/over 只改文字色 | 待验证 |
| 胶囊全局统一 | REQ-02/11/D-11 | L3：顶部 tab、范围、刷新间隔同高/圆角/主题选中块/等分；范围不是下划线 tab | 待验证 |
| 头部刷新 / 关闭 | REQ-12/D-13 | L3：P2/P3 都有 `⟳` 与 `×`；X 关闭；点击外部也可关闭 | 待验证 |
| 订阅刷新语义 | REQ-03/D-07/D-17 | L3：订阅区 `⟳` 只触发 quota；不刷新预算/范围；无文字；有旋转/禁用态；tooltip 正确 | 待验证 |
| 支持范围提示 | REQ-16/D-18 | L3：P2 `ⓘ` hover/focus 显示五家；P3 无此图标；tooltip 不溢出 | 待验证 |
| P3 同构 | REQ-17/D-19 | 文档 5.1/5.2/5.3/5.4 齐全；动态数量/空态/保存/更新有定义 | 待验证 |
| P3 动态 / 空态 | REQ-17 | L3：只渲染已检测 provider；空 API/空订阅隐藏；全空显示空态 | 待验证 |
| P3 预算保存 | REQ-17 | L3：Enter/失焦保存；失败保留输入并提示；成功状态行 | 待验证 |
| P3 日志 / 价格 / 版本 | REQ-14/17 | L3：固定目录、导出、五家链接单行、价格表日期/来源、`⤓` 更新状态、状态行 | 待验证 |
| 分区底框层级 | REQ-13/D-14 | L3：P2/P3 有 section 底框；两格卡有 tile；行内透明；无三层嵌套/无彩色分区 | 待验证 |
| 图标语言 | D-21 | L3：刷新为 `⟳`、检查更新为 `⤓`；图标同 stroke/尺寸；无新增图标依赖 | 待验证 |
| 按钮颜色 | REQ-18/D-22 | L3：按钮默认蓝底/蓝边/蓝字；卡片无蓝底 | 待验证 |
| 胶囊主题 | D-23 | L3：亮/暗主题切换后，轨道/选中/文字跟随 DSH token，无硬编码白底 | 待验证 |
| P2 无底部底注 | REQ-15/D-16 | L3：底部无“本机估算/刷新时间”；刷新只由 header ⟳ 表达 | 待验证 |
| 空态 | REQ-07/17 | L3：无消耗、无订阅、无预算、无 provider；P1 `[API] --` | 待验证 |
| 加载 / 错误 / stale | REQ-19 | L3：P2 首次加载、全量失败、局部失败、stale；P3 prefs/保存/日志失败 | 待验证 |
| 格式 / 预算校验 | REQ-20 | L1+L3：Token/金额/%/时间一致；非法预算不落库 | 待验证 |
| 响应式 / 溢出 | REQ-21 | L3：320/窄屏、长名称、价格链接、tooltip 不越界 | 待验证 |
| 与 P1 不冲突 | REQ-10 | L3：P1 文本/位置不变，仅新增无 provider 兜底 | 待验证 |
| 桌面走查 | REQ-01..21 | 320 面板（v2.21 宽度）+ 窄屏（pill 靠边时面板钳制） | 待验证 |

### 5.1 分层

| 层 | 内容 | 方式 |
|---|---|---|
| L1 | `buildUsage` 范围/币种/命中率 | `node --test` |
| L2 | `/usage` 路由与参数校验 | 临时 `DSH_HOME` |
| L3 | tab/范围/两格卡/明细行/tooltip/动态 provider/P3 结构/图标/加载错误/窄屏 | Playwright + mock |
| L4 | 不适用（不涉及 adapter） | N/A |

### 5.2 E2E 用例

> 本轮 `scripts/e2e.mjs` 已覆盖 01–07、09–15 的主路径；08 的 1 家配置分支由动态 provider 逻辑与手工走查补足。

| ID | 层 | 场景 | 断言 |
|---|---|---|---|
| E2E-UI-01 | L2 | `/usage` 路由 | `today/7d/30d/all` 200；非法 range 400 `invalid-range`；返回 `totals/models` |
| E2E-UI-02 | L3 | 双 tab 默认 | 打开默认“用量”；切“设置”再切回，range 仍保留 |
| E2E-UI-03 | L3 | P2 固定区 | 预算/订阅文案、`已检测 N`、余额、蓝色 48×4 MiniBar 正确；切范围不变 |
| E2E-UI-04 | L3 | P2 范围与明细 | 两格卡、模型名左/费用右、Tokens/请求/命中三列；切 7d 后行集变化 |
| E2E-UI-05 | L3 | 胶囊与图标 | tab/range/刷新间隔同款主题胶囊；刷新 `⟳`、检查更新 `⤓`；选中块非透明 |
| E2E-UI-06 | L3 | 支持范围 | P2 `ⓘ` hover/focus 显示五家；P3 无 `ⓘ`；tooltip 不越出面板 |
| E2E-UI-07 | L3 | P3 分区 | 五个 section 存在；无诊断/清空/本月 Token；无计费模式下拉 |
| E2E-UI-08 | L3 | P3 动态/空态 | 配置 2/1/0 家时只渲染对应数量；空区隐藏；无 provider 显示空态 |
| E2E-UI-09 | L3 | P3 预算保存 | 合法值 Enter/失焦保存；非法值红边 + `请输入 0 或正数`；空值删除预算 |
| E2E-UI-10 | L3 | P3 日志/价格/版本 | 打开目录失败降级；导出触发下载；五家链接同一行；`⤓` 检查更新 |
| E2E-UI-11 | L3 | 刷新/局部失败 | 刷新保留旧数据并显示 `刷新失败，保留上次数据`；`/usage` 失败显示 `范围数据加载失败` |
| E2E-UI-12 | L3 | stale | 超过 2 个周期显示刷新按钮 amber 点；不新增底部说明 |
| E2E-UI-13 | L3 | 窄屏 | 360px 视口面板不超出；长名称截断；金额不截断；无页面横向滚动 |
| E2E-UI-14 | L3 | 主题 | 亮/暗 `body[data-ds-dark-theme]` 下胶囊轨道/选中/文字取 DSH token |
| E2E-UI-15 | L3 | P1 兜底 | 无 provider 显示 `[API] --`；P1 文本/槽位不被面板遮挡 |

## 六、运行与安全

- 只读 `state.days` / summary / prefs；不修改存储格式，不写回 session 内容。
- 不读取、不记录 API Key、Authorization、Cookie、prompt、完整响应 body；日志脱敏规则沿用主计划。
- 不自动上传日志；导出文件由用户自行处理。
- L5 真实订阅 Key 不覆盖；自动测试只用 fixture，不购买测试 Key。
- 不自动 commit / push / 安装更新；更新动作只展示命令并等待用户确认。
- UI 不引入新的外联：价格页仅 `window.open` 官方页面，插件不抓取。

## 七、日志速查

- LogCategory：`TokenDash`
- 前缀：`[TD:vm]` / `[TD:ui]` / `[TD:update]`
- UI 事件：range switch、tab switch、info tooltip、budget save、subscription refresh、log export、update check；不记点击全文。
- 事件见 §2.5。

## 八、决策记录

| # | 问题 | 定案 |
|---|---|---|
| D-01 | 导航 | `用量 / 设置` 双 tab，用量在前；P3 保留预算/订阅/显示/日志/价格/更新六类内容，按 5.1/5.2/5.3/5.4 组织 |
| D-02 | 范围 | 当天/近7天/近30天/全部；默认当天；只作用于两格卡与明细行卡片 |
| D-03 | 固定区 | 本月预算 + 订阅套餐放在范围上方，不随范围变 |
| D-04 | 卡片 | 只保留总费用与真实 Tokens 两格（请求/命中率在明细副行已有，汇总卡不重复） |
| D-05 | 明细 | 费用表/用量表合并为**行卡片**：provider 组行 → 模型行（名称左 + 费用右）→ 用量副行（`Tokens 319.4M ⓘ` / `请求 1.08k` / `命中 99.4%` 三列网格，无点分隔）；全量、无"查看全部"；cc-switch 托盘面板同款语言（320 面板 / 13-11-10.5 字号阶梯 / 48×4 迷你条） |
| D-06 | 补行 | 范围视图不补 0 值默认行 |
| D-07 | 订阅 | 账户级行 + 迷你条 + 重置时间 + `⟳` 图标；局部刷新不带文字，靠位置和 tooltip 区分标题栏全局 ⟳ |
| D-08 | 多币种 | 总费用两格卡按币种分行；明细费用随 provider 组行（币种唯一，无跨币种行）；不合计 |
| D-09 | 趋势图 | 不做 |
| D-10 | 迷你条 | 全局固定 48×4；预算行与 QuotaBlock 同宽；填充统一主蓝，warning/over 仅改百分比文字色；不随内容拉伸、不做满宽条 |
| D-11 | 胶囊 | 参考 cc-switch `UsageTab` 的 `Segmented`：28 高、2px 内衬、8px 圆角、DSH 主题选中块 + shadow、11px、子项等分；顶部 tab/范围/P3 刷新统一 |
| D-12 | 明细优先级 | 模型行右侧放费用（主比较指标）；用量下一行用 `Tokens / 请求 / 命中` 三列网格（`1fr auto auto`，后两列右对齐）；订阅行右侧留空 |
| D-13 | 关闭交互 | 撤销“只能点外部关闭”；右上角固定刷新 + 关闭 X；点击外部保留为辅助关闭 |
| D-14 | 分区底框 | 学习 cc-switch：`Panel → Section → Tile` 最多两层；P2 固定区/范围区、P3 五分区各一块；行内透明，分区不靠色相 |
| D-15 | 价格与版本 | 五家价格页全列，标签与链接同一行；显示 `价格表 updatedAt · source`；版本/更新状态同区；检查更新用 `⤓` 图标；`catalog` 元数据由 VM 提供 |
| D-16 | P2 底注 | 去掉“本机估算 / 刚刚刷新”底部说明；刷新状态只靠 header `⟳`，不再占一行 |
| D-17 | 刷新语义 | 标题栏 `⟳` = 全局刷新；订阅区 `⟳` = 只重查订阅 quota；两者同图标，靠位置 + tooltip/aria-label 区分，不显示文字 |
| D-18 | 支持范围提示 | P2 头部 `ⓘ` 替代常驻提示行；tooltip 固定五家支持范围；P3 不显示 |
| D-19 | P3 文档结构 | P3 采用与 P2 相同的 5.1/5.2/5.3/5.4 结构；动态 provider、空态、交互状态必须显式写明 |
| D-20 | P3 计费模式 | 模式由自动侦测决定；P3 不提供手动覆盖下拉，不显示未配置 provider |
| D-21 | 图标来源 | 刷新统一 Lucide `RefreshCw`；检查更新用 Lucide `Download`（`⤓`）；本项目零构建内联 SVG path，不新增图标依赖 |
| D-22 | 按钮颜色 | 默认复用 DSH 主蓝 token（bg 16% / border 32%）；segmented 选中用主题 elevated + shadow；卡片保持中性 |
| D-23 | 胶囊主题 | 轨道 `--dsw-alias-bg-module-platform`、选中 `--dsw-alias-button-elevated-fill`、文字 `--dsw-alias-label-*`；暗色由 `body[data-ds-dark-theme]` 自动切换，不写死白底 |
| D-24 | 状态与格式 | P2 保留旧数据 + 错误条/局部错误/stale；P3 prefs/保存/日志/更新状态齐全；Token/金额/百分比/时间统一格式 |
| D-25 | P3 显示取舍 | P3 `显示` 只保留账户余额；移除“本月 Token”和计费模式下拉；模式由侦测决定 |

## 九、自测反馈台（活跃期）

> 尚无 Issue；开工后按 plan skill 追加。
