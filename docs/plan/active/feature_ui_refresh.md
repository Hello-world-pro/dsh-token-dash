# Token 看板 UI 迭代：用量/设置双 tab 与时间范围

> 状态：草案<br>
> 创建时间：2026-11-02<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[UI 设计（当前已发布版）](../../ui-design.md)、[token-dash 主计划（已归档）](../archived/feature_token_dash.md)、[Provider 边界计划（已归档）](../archived/feature_provider_boundary.md)<br>
> 说明：本文件是下一版 UI 的实施计划；视觉规格已定稿并回写 `docs/ui-design.md`（v2），本文件只保留实施细节与注意事项。

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

- 范围聚合放独立 `/usage` 路由还是并入 `/summary`；返回字段形状。
- "全部"的起点与缓存策略。
- 订阅行在 380px 窄屏下的换行方式。

## 一、需求

| ID | 优先级 | 需求 / 边界 / 风险 | 成功信号 |
|---|---|---|---|
| REQ-01 | P0 | P2/P3 收进同一浮层的 `用量 / 设置` 双 tab，用量在前；设置页内容不变，去掉"← 返回" | 打开浮层默认用量；切 tab 不丢范围选择 |
| REQ-02 | P0 | 时间范围 `当天 / 近7天 / 近30天 / 全部`，segmented 切换，默认当天，本地记忆 | 切换后卡片/两表同步变化 |
| REQ-03 | P0 | 固定区放在范围选择器上方：本月预算（每 API provider 一行：剩余 / 已用 / 总额 / % + 细进度条）+ 订阅套餐（每订阅 provider 一行：5h/周 + 迷你条 + 重置时间 + 重新检测）；两者不随范围变 | 切换范围时固定区不动 |
| REQ-04 | P0 | 两格卡（砍请求/命中率格——明细副行已有）：总费用（多币种分行）、真实 Tokens（detail 小字：入/出）；只统计范围内有消耗的 provider/model | 当天/全部口径正确，0 消耗不计入 |
| REQ-05 | P0 | 明细改**行卡片**（合并原两表）：provider 组行（13px semibold）→ 模型行缩进（名称 + 右对齐 Tokens 总量 + `?` tooltip 展示输入/缓存/输出明细）→ 副行 10.5px（请求 · 命中率 · 费用）；费用按币种在组行级区分（provider 币种唯一，无跨币种行）；随范围切换；只列有消耗的行；不设"查看全部" | tooltip 内容准确；多 provider 组行正确；数据与卡片同源 |
| REQ-06 | P0 | 预算剩余 = 本月总额 − 已用；余额 = 账户余额；两者文案不得混用 | 卡片/预算行/文案一致 |
| REQ-07 | P0 | 空态：无 API 消耗时卡片为 0、两表保留表头 + 占位行；无订阅隐藏订阅段；无预算显示"预算未设置" | 各空态不白屏 |
| REQ-08 | P0 | 范围聚合只读 `state.days`；预算仍本月；订阅不参与范围聚合 | 不改存储格式、不改预算算法 |
| REQ-09 | P0 | 可访问性：tab 用 `role=tablist/tab`，范围用 tablist；焦点可见；单位/币种随 provider | 键盘可完成切换 |
| REQ-10 | P0 | P1 结构与内容不变（模式、预算 %、今日、余额 / 订阅窗口） | 桌面 P1 无可见变化 |
| BND-01 | 边界 | 不做趋势图/热力图；不引入图表库 | 无新增依赖 |
| BND-02 | 边界 | 不做"查看全部"/独立明细页/分页；两张表全量展示，靠面板滚动 | 无分页控件 |
| BND-03 | 边界 | 不改价格算法、存储格式、订阅 adapter、provider 边界 | 相关测试不动 |
| BND-04 | 边界 | 不跨币种合计；总费用按币种分行 | CNY/USD 独立 |
| BND-05 | 边界 | 设置页分区与交互保持现状（预算、订阅、显示、日志、价格、更新） | 仅入口改为 tab |
| RSK-01 | 风险 | 范围聚合在"全部"下遍历天数过多 | 单次 <100ms（本机数据）；必要时缓存 |
| RSK-02 | 风险 | 月度预算与范围金额混读 | 固定区与范围区视觉分离、文案带"本月/范围" |
| RSK-03 | 风险 | 多币种卡片与表格口径不一致 | 卡片分行、表格按币种分组 |
| RSK-04 | 风险 | 380px 窄屏下预算/订阅行换行挤压 | 行内允许换行；明细为行卡片，无列宽溢出问题 |

## 二、设计方案（草案）

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

**视觉与交互规格（框线图、显示细节、文案空态）的唯一真源：[ui-design.md](../../ui-design.md)（v2 定稿版）**——本计划只保留实施细节与注意事项。

### 2.2 关键签名 / 字段

| 层 | 名称 | 备注 |
|---|---|---|
| core | `buildUsage(state, range, now)` | 纯函数；返回 `{ range, startAt, endAt, totals, models }` |
| core | `totals[currency]` | `cost / requests / input / output / cacheRead / cacheCreate / hitRate`；币种独立 |
| core | `models[]` | `providerId / providerName / modelId / displayName / currency / requests / input / cacheRead / output / hitRate / cost / share` |
| route | `GET /token-dash/api/usage?range=today\|7d\|30d\|all` | 非法 range → 400 `invalid-range`；默认 `today` |
| client | `usageRange` | `today / 7d / 30d / all`；localStorage 记忆 |

### 2.3 数据与口径

- 范围：当天=本地 0 点起；近 7/30 天=本地日历回看（含今天）；全部=最早 `state.days` 日；结束=当前。
- 真实 Tokens = 输入 + 命中 + 输出（与明细行同口径；缓存写入如非 0 一并计入）。
- 明细行 Tokens：主行只显示总量 `319.4M`；输入/缓存/输出明细放模型行右侧 `?` 图标的 hover tooltip（`输入 1.88M · 缓存 316.39M · 输出 1.12M`，tabular-nums）——零宽度成本。
- 总费用：按币种分行；无任何消耗时显示 `¥0.00`。
- 明细只列范围内有消耗的行；不再补"配置即可见"的 0 值默认行（该行为属于旧看板的月度视图）。
- 预算固定本月：`budget.remaining` 取 VM 值，超支显 `¥0.00` + 红色状态；无预算显示"预算未设置"+ 满格中性条。

### 2.4 关键陷阱

| 项 | 约束 |
|---|---|
| 月度预算 vs 范围金额 | 固定区与范围区必须视觉分区；文案写"本月预算""统计范围" |
| 订阅不随范围 | 订阅段标注"账户级"，不参与 `buildUsage` |
| 多币种 | 卡片分行、费用表分组，禁止合计 |
| 0 值补行 | 范围视图不补；空态保留表头 + 占位行 |
| 宽度体系 | 面板 **320**（cc-switch 同款）；明细为行卡片（无表头无列宽）；字号阶梯 13/11/10.5；进度条 h-1 行内；副行缩进与组行层级用 padding 表达 |
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
| CHG-01 | 修改 | `client.js` | Panel 改双 tab 壳；设置视图改为 tab 内容，去掉"← 返回" |
| CHG-02 | 修改 | `client.js` | 用量 tab 固定区：本月预算行 + 订阅套餐行 + 重新检测 |
| CHG-03 | 修改 | `client.js` | 范围 segmented、两格卡、明细行卡片（组行/模型行/副行/tooltip）；范围切换重取 `/usage` |
| CHG-04 | 修改 | `src/core.js` | 新增 `buildUsage` 纯聚合（范围、币种、模型、命中率） |
| CHG-05 | 修改 | `index.js` | 新增 `/usage` 路由与日志；参数校验 |
| CHG-06 | 修改 | `test/unit/*.test.mjs`、`scripts/e2e.mjs` | 范围边界、币种、空态、tab/范围交互断言 |
| CHG-07 | 修改 | `docs/ui-design.md` | 定稿后回写 P2/P3 章节；未定稿不动 |

### 3.1 改动清单（待实施）

- `src/core.js` · `buildUsage`：按范围过滤 `state.days`，按币种/模型聚合。
- `index.js` · `/usage`：解析 `range`、调用 `buildUsage`、记日志。
- `client.js` · `Panel` / `UsageTab`：tab 壳、固定区、范围区、空态。
- `scripts/e2e.mjs`：默认当天、切 7d、全部、空数据、多币种。
- 具体 diff 待 §2 定稿后补；当前先锁改动面。

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
| 明细行卡片随范围 | REQ-05 | L3：组行/模型行/副行结构正确、tooltip 内容准确、行集变化 | 待验证 |
| 空态 | REQ-07 | L3：无消耗、无订阅、无预算 | 待验证 |
| 与 P1 不冲突 | REQ-10 | L3：P1 文本不变 | 待验证 |
| 桌面走查 | REQ-01..10 | 380 / 600 两档宽度 | 待验证 |

### 5.1 分层

| 层 | 内容 | 方式 |
|---|---|---|
| L1 | `buildUsage` 范围/币种/命中率 | `node --test` |
| L2 | `/usage` 路由与参数校验 | 临时 `DSH_HOME` |
| L3 | tab/范围/卡片/两表 | Playwright + mock |
| L4 | 不适用（不涉及 adapter） | N/A |

## 七、日志速查

- LogCategory：`TokenDash`
- 前缀：`[TD:vm]` / `[TD:ui]`
- 事件见 §2.5。

## 八、决策记录

| # | 问题 | 定案 |
|---|---|---|
| D-01 | 导航 | `用量 / 设置` 双 tab，用量在前；设置内容不变 |
| D-02 | 范围 | 当天/近7天/近30天/全部；默认当天；只作用于卡片与两表 |
| D-03 | 固定区 | 本月预算 + 订阅套餐放在范围上方，不随范围变 |
| D-04 | 卡片 | 只保留总费用与真实 Tokens 两格（请求/命中率在明细副行已有，汇总卡不重复） |
| D-05 | 明细 | 两表合并为**行卡片**：provider 组行 → 模型行缩进（名称 + Tokens 总量 + `?` tooltip 展示入/缓/出）→ 副行（请求 · 命中率 · 费用）；全量、无"查看全部"；cc-switch 托盘面板同款语言（320 面板 / 13-11-10.5 字号阶梯 / 4px 迷你条） |
| D-06 | 补行 | 范围视图不补 0 值默认行 |
| D-07 | 订阅 | 账户级行 + 迷你条 + 重置时间 + 重新检测 |
| D-08 | 多币种 | 总费用分行；表格按币种分组；不合计 |
| D-09 | 趋势图 | 不做 |

## 九、自测反馈台（活跃期）

> 尚无 Issue；开工后按 plan skill 追加。
