# 看板数据整合（P2 用量页 / P3 设置页）

> 状态：待验收<br>
> 创建时间：2026-11-02<br>
> 更新时间：2026-11-02（已实施 CHG-01~19；L1 74/74、L2/L3 e2e 全绿；本地包 1.1.0-local.6）<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[`UI 设计`](../../ui-design.md)、[`架构设计`](../../design.md)、[`UI 迭代计划（已归档）`](../archived/feature_ui_refresh.md)

## 硬约束（最高优先，先于本文其它条款）

> **禁止修改既有前端视觉；允许新增 P3「数据」分区的两个控件。**
>
> - 不得修改 `client.js` 的 `styles.*` 定义与取值、`T.*` 主题 token、任何内联 `style={{...}}` 内的既有数值。
> - 不得新增样式键、不得调整既有布局节点顺序、字号、字重、间距、圆角、颜色、图标尺寸、MiniBar / Segmented / Tile / Section 外观。
> - 占位、状态、`≈`、`—` 等只允许替换**渲染文本**，必须复用原有 `style` 表达式，不得为其新增配色或字号。
> - 结构变化仅两处允许：① `usage === null` 的占位新增一个文本节点，`style` 与同位置正常值**逐字相同**（CHG-07）；② P3 新增「数据」分区与「导出数据 / 导入数据」两个按钮（CHG-17），必须复用 `styles.section` / `styles.row` / `styles.button`，不新增样式键。
> - 违反任一条即视为超出本计划范围，需先改本文并重新确认。

## 〇、前置依赖 / 代码探查事实

### P2 用量页

- `buildUsage`（`src/core.js`）只输出 `totals`（按币种费用，`kind === 'api'` 过滤）与 `models`，**没有全模型聚合**；两格卡的 Tokens / 输入 / 输出都在 `client.js` 用 `reduce` 现算，违反"UI 不做业务计算"。
- `kind` 取自 `providerCache.data`（实时 `ProviderSnapshot`），快照缺该 provider 时默认 `'api'`：`src/core.js` · `buildUsage` · `add` 闭包。
- GLM / Kimi 配额查询失败时 adapter 把快照降级成 `kind: 'api'`：`src/adapters.js` · `glm`、`kimiCodingQuota`、`readSubscriptions`。同一份历史数据因此在"订阅 / 按量"之间切换，费用框数值随之跳动。
- 订阅模型在 `daily.json` 里带目录价 `cost`（`catalog.json` 有 `glm-*` / `kimi-*` 价目），被 `kind` 过滤后这笔费用不出现在任何 UI，也不进 `totals`。
- `models[].tokens.total` 含 `cacheWrite`，明细括号只显示 `input/cacheRead/output`，三数之和小于总数。
- `buildUsage` 行内无 `approximate`；`priceFor` 已返回该标记，设计 §4.3 要求的 `≈` 无法实现。
- `totals` 只在出现 api 行时才创建币种 key；订阅-only 或无消耗时 `Object.entries({})` 为空，总费用 tile 不渲染任何数字。
- 客户端 `loadUsage` 无请求序号 / 取消，快速切换范围时旧响应可覆盖新响应；`usage === null` 时两格卡先渲染 `¥0.00` / `0`。

### P3 设置页

- 配置只有 `$DSH_HOME/dsh-token-dash/prefs.json` 一份，8 个键全部定义在 `DEFAULT_PREFS`：`version / budget / budgets / billingModes / refreshMs / showBalance / showMonthTokens / logLevel`，其中 P3 只有 3 个控件对应 `budgets`、`refreshMs`、`showBalance`。
- `loadPrefs` 用 `...prefs` 全量合并，不做白名单、不校验 `refreshMs`；只要文件里出现 `refreshMs: 120000`，P3 三段胶囊无选中项，且任意一次保存都会因 `normalizePrefs` 抛 `invalid-refresh` 而 400。
- `budgetFor` 对未配置 provider 返回 `amount = 0`、`state = 'unset'`；只有 `deepseek-official` 会回退旧版 `prefs.budget`（默认 `3500`），其余 provider 恒为空 → P3 输入框空白，P2 只对 DeepSeek 显示预算。
- `core.test.mjs` 里"月汇总：预算、剩余、按模型请求数"的注释写明 legacy 预算是**有意的迁移**。但迁移只发生在内存计算里，P3 看不到；且 `budgets` 键删掉后仍会回退 3500，"清空预算"无法生效。
- P3 输入框初值来自 `GET /prefs` 的 `budgets[id].amount`，与 P2 实际使用的 `provider.budget.amount` 是两个来源。
- `budgetFor` 币种优先取 `budgets[id].currency`（保存时快照），provider 币种变化后不跟随。
- `showMonthTokens` 仅进 VM，`client.js` 全文无消费；`logLevel` 仅存于配置，`createLogger` 调用未传 `level`，写 `debug` 不生效。
- `billingModes`（`api` / `subscription` / `hide`）无界面入口，却决定 provider 是否出现、按量还是订阅判定。
- P3 的 provider 行、订阅窗口、版本、价格链接、价格表时间、日志目录、更新状态全部来自运行时，不在配置文件内；分区顺序与控件由 `client.js` 硬编码。
- `ui-design.md` §5.3 写"账户余额开关只控制 P2 余额显示"，与 §4.2（#31 定案，P2 恒显示）和代码实现相反：开关实际只影响 P1。
- 旧文件名 `feature_usage_aggregation.md` 已由本文件取代，仓库内无其它引用。

### 待对齐

- 默认预算统一为 **100**，旧用户同样按 100，除非 `budgets` 里已有显式配置（见 §八 D-08）。
- legacy `budget` 字段只做**读取兼容**：不再迁移、不参与计算，下次保存时自然从文件消失（见 §八 D-05）。
- 预算币种改以 provider 当前币种为准，历史 USD 预算在 provider 切换后按 CNY 解释（见 §八 D-06）。
- 导出只含设置与当月使用数据；订阅配额 / 余额这类可由 API 复得的运行态数据不进导出包（见 §八 D-09）。

## 一、需求

| ID | 页面 | 优先级 | 需求 / 边界 / 风险 | 成功信号 |
|---|---|---|---|---|
| REQ-01 | P2 | P0 | `buildUsage` 输出范围内"全部已使用模型"的聚合 `total`（tokens / input / cacheRead / cacheWrite / cache / output / requests / hitRate）；两格卡与副行只读该字段 | `client.js` 两格卡不再出现 `reduce`；单测断言 `total.tokens === Σ models.tokens.total` |
| REQ-02 | P2 | P0 | 费用框与 Tokens 框取同一集合：非计费模型 `billable = false` 且 `cost = 0`，`totals[c].cost === Σ models.cost`；`totals` 预置已检测 provider 的币种 0 桶，最差回退 `CNY` | 订阅-only / 无消耗显示 `¥0.00`；quota 抖动前后同一份数据金额不变 |
| REQ-03 | P2 | P0 | 计费形态固化为数据：快照新增 `mode`，`state.providerKinds` 只在 `mode` 确定时写入；`resolveProviderKind` 为 VM 唯一判定入口 | 断开 / 失败 quota 后 P1、P2、P3 的 api/订阅分类一致 |
| REQ-04 | P2 | P1 | Tokens 四桶闭合：明细括号与 tile 副行的"缓存"均为 `cacheRead + cacheWrite`，三数之和等于总数 | `cacheWrite > 0` 时 `input + cache + output === total` |
| REQ-05 | P2 | P1 | 数据真实性：首屏 / 失败不渲染伪 0；范围切换请求序号化，旧响应不得覆盖新范围 | 首次打开显示占位；连续切换后数据 `range` 与选中一致 |
| REQ-06 | P2 | P2 | 明细近似价显示 `≈`（VM 输出 `approximate`） | 命中 family 价的行带 `≈` |
| REQ-07 | P3 | P0 | 预算单一来源：P3 输入框初值取 VM 的 `provider.budget.amount`；legacy `budget` 只读取兼容、不迁移、不参与计算 | 同一 provider 两页数值相等；旧文件中的 `budget` 在下次保存后消失 |
| REQ-08 | P3 | P0 | 配置归一：`loadPrefs` 白名单化，`refreshMs` 非法值回落 60000 并记 warn，不得导致保存失败 | 手写非法 `refreshMs` 后 P3 胶囊有选中项且可保存 |
| REQ-09 | P3 | P1 | 死字段清理：`showMonthTokens` 从配置与 VM 移除，`logLevel` 从配置移除 | `grep showMonthTokens/logLevel` 只剩迁移注释 |
| REQ-10 | P3 | P1 | 预算币种以 provider 当前币种为准，不再读取保存时的 `budgets[id].currency` | provider 币种变化后 P3 标签与 P2 金额同币种 |
| REQ-11 | P3 | P0 | 默认预算 100：`budgets[id]` 缺失时 VM 返回 `amount = 100`（provider 币种），老用户同样适用，只有 `budgets` 已显式配置才沿用；显式清空写 `{ amount: 0 }`，不被默认值覆盖 | 未填写的 api provider 两页均为 100；清空后两页均为"未设置"且重启/刷新不回填 |
| REQ-12 | P3 | P0 | 导出：单 JSON 包，含 `prefs` + 当月日级数据 + 与 P2 时间选择同口径的四个范围派生视图（当天 / 7天 / 30天 / 当月全部）；不含订阅配额、余额、日志、价目表 | 导出文件可在另一台机器导入后 P2 数值一致 |
| REQ-13 | P3 | P0 | 导入：schema 与字段校验 → 备份现有文件 → 覆盖 `prefs` 与当月 `days` → 刷新缓存；重复导入同一文件结果不变 | 二次导入不产生翻倍数据；备份文件存在且可回滚 |
| REQ-14 | P3 | P1 | 入口：P3 新增「数据」分区，含「导出数据 / 导入数据」两个按钮，复用现有样式 | 分区位于日志之前，视觉与现有按钮一致 |
| BND-01 | 共用 | 硬约束 | 既有前端视觉不得改动；仅允许新增 P3「数据」分区两个控件（见文首硬约束） | `client.js` diff 中 `styles.*` 取值与 `T.*` 无改动 |
| BND-02 | 共用 | 边界 | 不改 `src/pricing.js` 算法、三层归属、采集与存储写入格式（仅新增可忽略字段） | 既有单测全绿 |
| BND-03 | 共用 | 边界 | `unknown` 且无已知前缀的模型保持不可见（与 `buildSummary` 一致） | 现有 `core.test.mjs` 用例保持 |
| BND-04 | P3 | 边界 | 除「数据」分区两个按钮外不新增控件（`billingModes` 维持手改配置） | 其它分区与行数不变 |
| RSK-01 | 共用 | 风险 | 旧 `daily.json` 无 `providerKinds`、旧 `prefs.json` 含已删字段 | 旧文件可读，行为与现状一致 |
| RSK-02 | P2 | 风险 | 非计费行 `cost` 归零后排序下沉 | 订阅组整体靠后，api 行相对顺序不变 |
| RSK-03 | P3 | 风险 | 老用户预算从 3500 变为 100（未显式配置时） | 变更写入 CHANGELOG，§八 D-08 留档 |
| RSK-04 | P3 | 风险 | 导入会覆盖本机当月数据 | 导入前自动备份，文档写明覆盖语义 |

## 二、设计方案

### 2.0 结构总览

| 层 | 文件 | P2 职责 | P3 职责 |
|---|---|---|---|
| 数据 | `daily.json` / `prefs.json`（`store.js`） | 新增 `providerKinds` | `loadPrefs` 白名单 + `refreshMs` 归一；删 `budget` / `showMonthTokens` / `logLevel` |
| 探测 | `src/adapters.js` | 快照新增 `mode` | 同左（`billingModes` 显式值优先） |
| 聚合 | `src/core.js` | `resolveProviderKind`、`stampProviderKinds`、`total`、0 桶、`billable` / `approximate` / `tokens.cache` | `budgetFor` 去回退、币种以 provider 为准；VM 去掉 `showMonthTokens` |
| 宿主 | `index.js` | provider 刷新收敛 + `stampProviderKinds` | `normalizePrefs` 收口、刷新枚举共享 |
| 展示 | `client.js` | 两格卡只读 VM；占位；序号守卫；括号用 `tokens.cache`；`≈` | 不改渲染，仅消费已归一的数据 |

### 2.1 第一章数据通路：P2 用量页

```text
[daily.json days.<day>.providers.<id>.models.<model>]  input/cacheRead/cacheWrite/output/requests/cost/priced
        │
        ▼
[buildUsage(state, prefs, range, now, snapshots)]
        │  ├─ kind = snapshots.kind，缺失默认 'api'                 ◄── 改动：resolveProviderKind(prefs > mode > providerKinds > kind)
        │  ├─ models[] cost 含订阅目录价                             ◄── 改动：billable=false 时 cost 归零
        │  ├─ totals[] 仅 api 行创建币种 key                         ◄── 改动：先按未 hide 的已检测 provider 预置 0 桶
        │  └─ 无全模型聚合                                           ◄── 改动：新增 total{ tokens/四桶/cache/requests/hitRate }
        ▼
[usage VM: range / totals / total / models]
        │
        ├─► P2 两格卡  总费用 = totals[c].cost；真实 Tokens = total.tokens
        │                                         ◄── 改动：UI 不再 reduce；usage===null 渲染占位文本
        └─► P2 明细行  Tokens [input/cacheRead/output]
                                                  ◄── 改动：读 tokens.cache（读+写），费用带 ≈
```

不变量：

- `total.tokens = Σ models.tokens.total`；`totals[c].cost = Σ models.cost`（非计费行为 0，故与"全部模型之和"等价）。
- 一个 provider 在单次 `buildUsage` 内只有一个 `kind`，不允许行级混判。
- `providerKinds` 只写不删；`mode === 'unknown'` 与 `billingModes === 'hide'` 不写入。

### 2.2 第二章数据通路：P3 设置页

```text
[prefs.json]
   │ loadPrefs：白名单 + refreshMs 归一 + 丢弃 legacy budget    ◄── 改动：不再全量合并；非法值回落并 warn
   ▼
[prefs: version / budgets / billingModes / refreshMs / showBalance]
   │
   ├─► P3 控件值（预算输入 / 刷新胶囊 / 余额开关）
   ├─► buildSummary.budget ──► P2 本月预算行、P1 预算 %
   │        ◄── 改动：删除 legacy 回退；未配置默认 100；币种 = provider 当前币种
   ├─► readProviders(billingModes) ──► provider 行与 api/订阅分类
   └─► /export、/import ──► 设置 + 当月 days + 四范围派生视图（详见 §2.6）

[client P3] ──PUT /prefs──► normalizePrefs（字段收口，枚举校验） ──► 写回 prefs.json
```

不变量：

- P3 输入框里的数字与 P1/P2 用于计算预算的数字来自同一字段 `budgets[id].amount`，不存在第二来源。
- `prefs` 对象只允许 `version` / `budgets` / `billingModes` / `refreshMs` / `showBalance` 五个键流入运行时。
- 默认 100 只存在于 VM 与渲染兜底，**不写盘**；显式 `{ amount: 0 }` 才表示"未设置"。
- 预算币种唯一来源是 `provider.currency`（registry / 快照），`budgets[id].currency` 只做落盘记录，不参与计算。

### 2.3 关键签名 / 字段

| 层 | 名称 | 契约 |
|---|---|---|
| VM | `usage.total` | `{ tokens, input, cacheRead, cacheWrite, cache, output, requests, hitRate }`，覆盖全部模型（含订阅） |
| VM | `usage.models[].billable` | `true` 仅当计费形态为 `api`；`false` 时 `cost === 0` |
| VM | `usage.models[].approximate` | 命中 family 级价目为 `true` |
| VM | `usage.models[].tokens.cache` | `cacheRead + cacheWrite`，括号与副行展示口径 |
| VM | `resolveProviderKind(state, prefs, providerId, meta)` | `billingModes` 显式值 > `meta.mode` > `state.providerKinds` > `meta.kind === 'subscription'` > `'api'` |
| VM | `stampProviderKinds(state, snapshots)` | 仅写 `mode` 确定项，返回是否有变化 |
| VM | `budgetFor(prefs, providerId, currency)` | 读 `budgets[id].amount`；缺失 → `DEFAULT_BUDGET = 100`；显式 `0` → `'unset'`；币种取入参 `currency` |
| VM | `DEFAULT_BUDGET` | `100`，provider 币种口径；只在 `budgets[id]` 缺失时生效，不写盘 |
| 快照 | `ProviderSnapshot.mode` | `'api' \| 'subscription' \| 'unknown'`；`unknown` 不覆盖历史 |
| 存储 | `state.providerKinds` | `{ [providerId]: 'api' \| 'subscription' }` |
| 存储 | `prefs` | `{ version: 1, budgets, billingModes, refreshMs, showBalance }` |
| 存储 | `REFRESH_OPTIONS` | `[30000, 60000, 300000]`，`loadPrefs` 与 `normalizePrefs` 共用 |

### 2.4 数据约束

- `totals` 币种：行内 `currency` 与 0 桶统一走 `usageCurrency`（快照币种 > registry）。
- `totals` 至少一个 0 桶：按未 hide 的已检测 provider 预置（订阅也占位），仍为空回退 `{ CNY: 0 }`；费用累加只收 `billable` 行。
- 舍入：行 `cost` 先 `round2`，`totals[c].cost` 再 `round2`，tile 等于明细可见费用之和。
- `total.hitRate` 分母为 `input + cacheRead + cacheWrite`，与行级同口径。
- `prefs.refreshMs` 只能是 `REFRESH_OPTIONS` 之一；非法值在加载期回落默认并记 `[TD:boot] prefs.normalize`。
- `prefs.budgets[id].amount` 允许 `0` 与空值；`0` 视为"未设置"，与 P3 空输入等价。
- 默认预算：`budgets[id]` 缺失 → `amount = 100`、`state = 'ok'`；显式 `{ amount: 0 }` → `amount = 0`、`state = 'unset'`。两者不得混淆，"未设置"只剩显式清空一种来源。
- 清空预算写 `{ amount: 0 }` 而不是删除键：删键会让默认 100 重新生效。
- P3 输入框初值 = `provider.budget.amount`（缺省即 100），不再直接读 `prefs.budgets`；用户改动后才以 `budgets` 为准。
- legacy 兼容：`budget` 字段只在读取时被忽略（不迁移、不计算），`loadPrefs` 返回值不含它，下次保存即从文件消失；`budgets` 里已有显式配置的 provider 不受影响。
- 已删除字段（`showMonthTokens` / `logLevel`）与未知键在 `loadPrefs` 被丢弃，不报错。

### 2.5 关键陷阱

| 项 | 约束 |
|---|---|
| 零样式 | 除 CHG-17 的两个新按钮外，任何改动不得落在 `styles.*` / `T.*` / 内联 style 数值上；占位与 `≈` 只换文本 |
| 排序 | 非计费行 `cost` 归零后自然沉底，不得改成按 tokens 排序 |
| 空桶渲染 | `totals` 有 key 但 `cost === 0` 时必须渲染 `¥0.00` |
| 旧数据 | 缺 `providerKinds` 退化现状；旧 `prefs.json` 多字段被丢弃但可读 |
| e2e 断言 | 括号仍 3 格（缓存合并读写），`[100k/200k/20k]` 不变；mock 需补 `total` |
| 首屏 | `usage === null` 只渲染 `—`，不显示 0，不改布局高度 |
| 范围切换 | 保留旧数据 + 序号守卫，不引入骨架屏 |
| VM 纯度 | `buildUsage` 不写 state；`stampProviderKinds` 只在宿主层调用 |
| 字段泄漏 | `mode` 属快照内部字段，`buildSummary` 解构必须剥离 |
| 预算 | 运行态单一来源是 `budgets`；legacy `budget` 只读取兼容，不得再参与计算 |
| 默认值 | `100` 只存在于 `budgetFor` 与 P3 渲染兜底，不得写进 `prefs.json` 造成"用户已设置"的假象 |
| 导入覆盖 | 导入按"覆盖当月 + 覆盖 prefs"处理，不能累加，否则重复导入会翻倍 |
| 导入校验 | schema / month / days 形状任一不合法则整包拒绝，不得部分写入 |

### 2.6 数据导出 / 导入（P3）

```text
[P3「数据」分区]  [导出数据] ──GET /export?month=YYYY-MM──► buildExport(state, prefs, now, snapshots)
                                                    │
                                                    ▼
                    { schema, exportedAt, pluginVersion, month,
                      prefs, providerKinds, days(当月), usage(四范围派生) }
                                                    │
                                                    ▼ 下载 dsh-token-dash-<YYYY-MM>.json

[P3「数据」分区]  [导入数据] ──读取本地文件──► POST /import
                                                    │ validateBundle（整包校验）
                                                    ▼
                    saveJson(prefs.json.import-backup-<ts>) + daily.json.import-backup-<ts>
                                                    │
                                                    ▼
                    prefs ← bundle.prefs（经 normalizePrefs）
                    state.days 当月 ← bundle.days（覆盖）
                    state.providerKinds ← 合并（导入值优先）
                    providerCache 失效 → 下一次请求重新侦测
```

包字段（`schema: 1`）：

| 字段 | 内容 | 用途 |
|---|---|---|
| `prefs` | `{ budgets, billingModes, refreshMs, showBalance }` | 设置恢复 |
| `month` | `YYYY-MM` | 限定导入月份 |
| `days` | 该月 `daily.json` 的 `providers/models` 结构 | 原始数据，导入真源 |
| `providerKinds` | `{ providerId: api \| subscription }` | 保持计费形态口径 |
| `usage` | `{ today, '7d', '30d', all }` 各含 `totals` / `total` / `models` | 与 P2 时间选择同口径的可读视图，导入时忽略 |

不导出：订阅窗口 / 配额 / 余额（API 可复得）、日志、社区价目、`.corrupt-*`。

包形态固定为**单个 JSON 文件**：不打包 zip、不拆多个文件。当月日级聚合约 150KB、加派生视图不足 500KB，压缩收益小于 zip 写入/解压的实现与失败成本；单文件还能自带 `schema` / `month` 做整包校验（D-11）。

### 2.7 日志设计

- `[TD:vm] usage`：增加 `total.tokens`、`billable` 行数、币种数。
- `[TD:provider] kind.stamp`：`stampProviderKinds` 返回变化时记 `{ ids }`。
- `[TD:boot] prefs.normalize`：`refreshMs` 被回落时记原值与使用值。
- `[TD:data] export` / `[TD:data] import`：记 `month`、`days` 条数、`models` 数、备份文件名；不记金额与文件内容。
- 错误分类沿用 `errorKind` / `httpStatus`。

## 三、实现要点（已实施）

### 3.0 开发改动总览（已实施）

| ID | 页面 | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|---|
| CHG-01 | P2 | 修改 | `src/core.js` | `buildUsage`：`add` 用 `resolveProviderKind`、写 `billable`、非计费行归零；`rows` 增 `tokens.cache` / `approximate`；`totals` 预置 0 桶；返回 `total` |
| CHG-02 | P2 | 修改 | `src/core.js` | 新增 `resolveProviderKind` / `stampProviderKinds` / `emptyTotals` / `usageCurrency`；`buildSummary` kind 改用前者并剥离 `mode` |
| CHG-03 | P2 | 修改 | `src/core.js` | `emptyState` 增加 `providerKinds: {}` |
| CHG-04 | P2 | 修改 | `src/store.js` | `loadState` 补齐 `state.providerKinds ??= {}` |
| CHG-05 | P2 | 修改 | `src/adapters.js` | `glm` / `kimiCodingQuota` / `kimi` 输出 `mode`；`toSnapshot` 归一透传 |
| CHG-06 | P2 | 修改 | `index.js` | provider 刷新收敛为 `refreshProviderCache`，刷新后 `stampProviderKinds` + `flusher.schedule()` |
| CHG-07 | P2 | 修改 | `client.js` | 两格卡只读 VM、占位文本、`tokens.cache`、`≈`（零样式） |
| CHG-08 | P2 | 修改 | `client.js` | `loadUsage` 请求序号守卫 |
| CHG-09 | P2 | 测试 | `test/unit/usage.test.mjs`、`core.test.mjs`、`providers-vm.test.mjs`、`scripts/e2e.mjs` | 聚合 / 口径 / kind 优先级 / 占位断言 |
| CHG-10 | P3 | 修改 | `src/store.js` | `DEFAULT_PREFS` 删 `budget` / `showMonthTokens` / `logLevel`；`loadPrefs` 白名单 + `refreshMs` 归一；导出 `REFRESH_OPTIONS` |
| CHG-11 | P3 | 修改 | `index.js` | `normalizePrefs` 同步收口（删 `budget` / `showMonthTokens` / `logLevel`、刷新枚举用共享常量） |
| CHG-12 | P3 | 修改 | `src/core.js` | `budgetFor` 删 legacy 回退、缺省 100、显式 `0` 判 unset、币种取 provider |
| CHG-13 | P3 | 修改 | `client.js` | 预算输入初值取 VM `budget.amount`；清空写 `{ amount: 0 }`（零样式） |
| CHG-14 | P3 | 修改 | `src/core.js` | `buildSummary` 移除 `showMonthTokens` 输出 |
| CHG-15 | P3 | 测试 | `test/unit/store.test.mjs`、`core.test.mjs`、`scripts/e2e.mjs` | 配置归一、默认 100、清空语义、币种、VM 字段 |
| CHG-16 | P3 | 修改 | `src/backup.js`（新增）、`index.js` | 导出包构建与导入校验：`buildExport` / `validateBundle` / `mergeImport`；新增 `/export`、`/import` 路由 |
| CHG-17 | P3 | 修改 | `client.js` | P3 新增「数据」分区：导出下载、导入文件选择与结果提示（复用现有样式） |
| CHG-18 | P3 | 测试 | `test/unit/backup.test.mjs`、`scripts/e2e.mjs` | 导出包字段、schema 校验、覆盖语义、二次导入幂等 |
| CHG-19 | P3 | 文档 | `docs/ui-design.md`、`docs/design.md`、`locale/*.json` | P3「数据」分区、默认预算 100、余额开关口径、配置字段表、词条 |

### 3.1 第一章：P2 用量页施工

#### CHG-01 · `src/core.js` · `buildUsage`

- `add` 闭包：kind 走统一入口，非计费行费用归零。

```diff
   const add = (providerId, modelId, row) => {
     if (hidden.has(providerId)) return
     const meta = info.get(providerId)
-    const kind = meta?.kind === 'subscription' || (meta?.kind === undefined && (meta?.windows ?? []).length > 0)
-      ? 'subscription'
-      : 'api'
+    const kind = resolveProviderKind(state, prefs, providerId, meta)
+    const billable = kind === 'api'
-    const currency = meta?.currency === 'USD' ? 'USD' : (meta?.currency === 'CNY' ? 'CNY' : providerCurrency(providerId))
+    const currency = usageCurrency(providerId, meta)
     const key = `${providerId}:${modelId}`
     const entry = models.get(key) ?? {
       providerId,
       providerName: meta?.name ?? providerLabel(providerId),
       modelId,
       displayName: modelLabel(modelId),
       kind,
       currency,
+      billable,
       // ↓ requests / input / cacheRead / cacheWrite / output / cost / priced 原样
     }
     // ↓ requests / input / cacheRead / cacheWrite / output 累加与 priced 归并原样
-    entry.cost += num(row.cost)
+    // 订阅模型按目录价算出的 cost 不是真实支出，VM 内归零，保证费用框与 Tokens 框同一集合
+    entry.cost += billable ? num(row.cost) : 0
     entry.kind = kind
     entry.currency = currency
```

- `rows`：补 `tokens.cache` 与 `approximate`。

```diff
   const rows = [...models.values()].map((entry) => {
     const total = entry.input + entry.cacheRead + entry.cacheWrite + entry.output
     const denominator = entry.input + entry.cacheRead + entry.cacheWrite
     return {
       ...entry,
-      tokens: { input: entry.input, cacheRead: entry.cacheRead, cacheWrite: entry.cacheWrite, output: entry.output, total },
+      tokens: {
+        input: entry.input,
+        cacheRead: entry.cacheRead,
+        cacheWrite: entry.cacheWrite,
+        output: entry.output,
+        cache: entry.cacheRead + entry.cacheWrite,
+        total,
+      },
       hitRate: denominator > 0 ? entry.cacheRead / denominator : null,
       cost: round2(entry.cost),
+      approximate: entry.billable && priceFor(entry.providerId, entry.modelId, now)?.approximate === true,
     }
   })
```

- `totals`：预置 0 桶，非计费行跳过。

```diff
+  // 已检测 provider 先占位 0 桶：范围无消耗（或只有订阅）时两格卡仍要显示 ¥0.00 而不是空白
+  for (const [providerId, meta] of info) {
+    if (hidden.has(providerId)) continue
+    totals[usageCurrency(providerId, meta)] ??= emptyTotals()
+  }
+  if (Object.keys(totals).length === 0) totals.CNY = emptyTotals()
   for (const row of rows) {
-    if (row.kind !== 'api') continue
-    const bucket = totals[row.currency] ?? { cost: 0, requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, hitRate: null }
+    if (row.billable !== true) continue
+    const bucket = totals[row.currency] ?? emptyTotals()
     // ↓ cost / requests / input / cacheRead / cacheWrite / output 累加与 hitRate 计算原样
   }
```

- 返回值：新增 `total`。

```diff
+  const total = rows.reduce((sum, row) => ({
+    tokens: sum.tokens + row.tokens.total,
+    input: sum.input + row.input,
+    cacheRead: sum.cacheRead + row.cacheRead,
+    cacheWrite: sum.cacheWrite + row.cacheWrite,
+    cache: sum.cache + row.tokens.cache,
+    output: sum.output + row.output,
+    requests: sum.requests + num(row.requests),
+  }), { tokens: 0, input: 0, cacheRead: 0, cacheWrite: 0, cache: 0, output: 0, requests: 0 })
+  total.hitRate = total.input + total.cacheRead + total.cacheWrite > 0
+    ? total.cacheRead / (total.input + total.cacheRead + total.cacheWrite)
+    : null
   return {
     range: selected,
     // ↓ startAt / endAt / startKey / endKey 原样
     totals,
+    total,
     models: rows,
   }
```

#### CHG-02 · `src/core.js` · 判定与口径工具

```js
const BILLING_MODES = new Set(['api', 'subscription'])

function emptyTotals() {
  return { cost: 0, requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, hitRate: null }
}

/** 行内与 0 桶共用：快照币种优先，缺失回退 registry，不写死 CNY。 */
function usageCurrency(providerId, meta) {
  if (meta?.currency === 'USD') return 'USD'
  if (meta?.currency === 'CNY') return 'CNY'
  return providerCurrency(providerId)
}

/** prefs 显式覆盖 > 快照确定的 mode > 历史固化值 > 快照 kind > api。 */
export function resolveProviderKind(state, prefs, providerId, meta) {
  const id = normalizeProvider(providerId)
  const explicit = prefs?.billingModes?.[id]
  if (BILLING_MODES.has(explicit)) return explicit
  if (BILLING_MODES.has(meta?.mode)) return meta.mode
  const stamped = state?.providerKinds?.[id]
  if (BILLING_MODES.has(stamped)) return stamped
  return meta?.kind === 'subscription' ? 'subscription' : 'api'
}

/** 只固化"探测确定"的形态；unknown 不覆盖历史，返回是否有变化。 */
export function stampProviderKinds(state, snapshots) {
  state.providerKinds ??= {}
  let changed = false
  for (const item of snapshots ?? []) {
    const id = normalizeProvider(item?.id ?? item?.provider)
    if (id === 'unknown' || !BILLING_MODES.has(item?.mode)) continue
    if (state.providerKinds[id] === item.mode) continue
    state.providerKinds[id] = item.mode
    changed = true
  }
  return changed
}
```

- `buildSummary` 同步换判定，并剥离快照 `mode`：

```diff
-    const { plans: legacyPlans, ...info } = item
+    const { plans: legacyPlans, mode: _mode, ...info } = item
     const id = normalizeProvider(info.id ?? info.provider)
     // ↓ name / canSubscribe / currency / usage / balance / windows 原样
-      kind: info.kind === 'subscription' || (info.kind === undefined && (info.windows ?? legacyPlans ?? []).length > 0)
-        ? 'subscription'
-        : 'api',
+      kind: resolveProviderKind(state, prefs, id, item),
```

> 第四参必须传原始 `item`（含 `mode`），不能传剥离后的 `info`。

#### CHG-03 / CHG-04 · 状态字段

```diff
 export function emptyState() {
-  return { version: 1, costVersion: 3, days: {}, watermarks: {}, headers: {}, currentProvider: null }
+  return { version: 1, costVersion: 3, days: {}, watermarks: {}, headers: {}, currentProvider: null, providerKinds: {} }
 }
```

```diff
   state.currentProvider ??= null
+  state.providerKinds ??= {}
```

#### CHG-05 · `src/adapters.js` · 快照 `mode`

- `glm`：显式 api 报 `api`，配额成功报 `subscription`，配额失败报 `unknown`（不覆盖历史口径）。

```diff
-  if (mode === 'api') return { id: 'zhipu', kind: 'api', currency: 'CNY' }
+  if (mode === 'api') return { id: 'zhipu', kind: 'api', mode: 'api', currency: 'CNY' }
   // 手动覆盖为订阅时，quota 失败/无窗口仍保留订阅卡（显示“套餐查询失败”），不回落 api。
-  const subscriptionFallback = mode === 'subscription' ? { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', currency: 'CNY', plans: [] } : null
+  const subscriptionFallback = mode === 'subscription'
+    ? { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', mode: 'subscription', currency: 'CNY', plans: [] }
+    : null
   try {
     const body = await requestJson(GLM_QUOTA, { authorization: key.value })
     const windows = parseGlmQuota(body)
-    if (windows.length > 0) return { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', currency: 'CNY', plans: windows }
+    if (windows.length > 0) return { id: 'zhipu', name: 'GLM Coding', kind: 'subscription', mode: 'subscription', currency: 'CNY', plans: windows }
     // 响应可解析但无窗口：解析问题（quota.parse），非网络错误
-    return { ...(subscriptionFallback ?? { id: 'zhipu', kind: 'api', currency: 'CNY' }), _quotaError: { kind: 'parse' } }
+    return { ...(subscriptionFallback ?? { id: 'zhipu', kind: 'api', mode: 'unknown', currency: 'CNY' }), _quotaError: { kind: 'parse' } }
   } catch (error) {
-    return { ...(subscriptionFallback ?? { id: 'zhipu', kind: 'api', currency: 'CNY' }), _quotaError: errorDetail(error) }
+    return { ...(subscriptionFallback ?? { id: 'zhipu', kind: 'api', mode: 'unknown', currency: 'CNY' }), _quotaError: errorDetail(error) }
   }
```

- `kimiCodingQuota` / `kimi`：只有配额成功报 `subscription`，走余额分支的 api 返回一律 `unknown`。

```diff
-    if (windows.length > 0) return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', currency: 'CNY', plans: windows } }
+    if (windows.length > 0) return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', mode: 'subscription', currency: 'CNY', plans: windows } }
-  if (mode === 'subscription') return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', currency: 'CNY', plans: [], _quotaError: quotaError } }
+  if (mode === 'subscription') return { state: 'ok', entry: { id: 'moonshot', name: 'Kimi Coding', kind: 'subscription', mode: 'subscription', currency: 'CNY', plans: [], _quotaError: quotaError } }
```

```diff
-  if (normal === undefined) return quota.state === 'no-key' ? null : { id: 'moonshot', kind: 'api', currency: 'CNY', _quotaError: quotaError }
+  if (normal === undefined) return quota.state === 'no-key' ? null : { id: 'moonshot', kind: 'api', mode: 'unknown', currency: 'CNY', _quotaError: quotaError }
     // ↓ 成功分支
-      id: 'moonshot', kind: 'api', currency: 'CNY', _quotaError: quotaError,
+      id: 'moonshot', kind: 'api', mode: 'unknown', currency: 'CNY', _quotaError: quotaError,
     // ↓ 失败分支
-    return { id: 'moonshot', kind: 'api', currency: 'CNY', _quotaError: quotaError, _error: errorDetail(error), balance: { ... } }
+    return { id: 'moonshot', kind: 'api', mode: 'unknown', currency: 'CNY', _quotaError: quotaError, _error: errorDetail(error), balance: { ... } }
```

- `toSnapshot`：归一后透传（未声明的 provider 一律 `unknown`，走 `kind` 回退）。

```diff
-    windows: Array.isArray(entry.windows) ? entry.windows : Array.isArray(entry.plans) ? entry.plans : [],
+    mode: entry.mode === 'subscription' || entry.mode === 'api' ? entry.mode : 'unknown',
+    windows: Array.isArray(entry.windows) ? entry.windows : Array.isArray(entry.plans) ? entry.plans : [],
```

#### CHG-06 · `index.js` · 刷新收敛与固化

```js
    const refreshProviderCache = async () => {
      const data = await readProviders(scoped, prefs)
      providerCache = { at: Date.now(), data }
      logAdapterEvents(logger, data)
      if (stampProviderKinds(state, data)) {
        logger.info('provider', 'kind.stamp', { ids: Object.keys(state.providerKinds) })
        flusher.schedule()
      }
    }
```

- `/summary`、`/usage` 的 `providerCache = {...}` 两处替换为 `await refreshProviderCache()`。
- `/providers/refresh` 合并 `subs` 后补 `if (stampProviderKinds(state, subs)) flusher.schedule()`。

#### CHG-07 · `client.js` · 两格卡与明细（零样式）

```diff
       const models = Array.isArray(usage?.models) ? usage.models : []
       // ↓ groups 原样
-      const totalTokenCount = models.reduce((sum, model) => sum + (model.tokens?.total ?? 0), 0)
-      const costEntries = Object.entries(usage?.totals ?? { CNY: { cost: 0 } })
+      const pending = usage === null
+      const total = usage?.total ?? null
+      const costEntries = Object.entries(usage?.totals ?? {})
       const hasUsage = usage !== null
```

```diff
             h('div', { style: styles.tile },
               h('div', { style: styles.tileLabel }, tr('总费用')),
               ...costEntries.map(([currency, value]) => h('div', { key: currency, style: { ...styles.tileValue, fontSize: 14, color: T.ok } }, fmtMoney(value.cost, currency))),
+              pending ? h('div', { key: 'pending', style: { ...styles.tileValue, fontSize: 14, color: T.ok } }, '—') : null,
               h('div', { style: styles.tileDetail }, tr('按币种'))),
```

```diff
               // ↓ 真实 Tokens 标题与 InfoTip 原样
-              h('div', { style: styles.tileValue }, fmtTokens(totalTokenCount)),
-              h('div', { style: styles.tileDetail }, tr('入 {input} · 出 {output}', { input: fmtTokens(models.reduce((sum, model) => sum + (model.input ?? 0), 0)), output: fmtTokens(models.reduce((sum, model) => sum + (model.output ?? 0), 0)) })))),
+              h('div', { style: styles.tileValue }, pending ? '—' : fmtTokens(total?.tokens ?? 0)),
+              h('div', { style: styles.tileDetail }, pending
+                ? '—'
+                : tr('入 {input} · 缓存 {cache} · 出 {output}', {
+                  input: fmtTokens(total?.input ?? 0),
+                  cache: fmtTokens(total?.cache ?? 0),
+                  output: fmtTokens(total?.output ?? 0),
+                })))),
```

```diff
-              h('span', { style: { ...styles.usageValue, color: T.muted } },
-                ` [${fmtTokens(model.input)}/${fmtTokens(model.cacheRead)}/${fmtTokens(model.output)}]`)),
+              h('span', { style: { ...styles.usageValue, color: T.muted } },
+                ` [${fmtTokens(model.tokens?.input ?? 0)}/${fmtTokens(model.tokens?.cache ?? 0)}/${fmtTokens(model.tokens?.output ?? 0)}]`)),
```

```diff
-              ? h('span', { style: styles.modelCost }, model.priced === false ? tr('未定价') : fmtMoney(model.cost, model.currency))
+              ? h('span', { style: styles.modelCost }, model.priced === false
+                ? tr('未定价')
+                : `${model.approximate === true ? '≈' : ''}${fmtMoney(model.cost, model.currency)}`)
```

> 三个 tile 节点的 `style` 表达式与改动前逐字一致，仅新增一处 `pending` 分支复用同一表达式；不新增颜色、字号或样式键。

#### CHG-08 · `client.js` · `loadUsage` 序号守卫

```diff
+      const usageSeq = useRef(0)
       const loadUsage = useCallback(async () => {
+        const seq = ++usageSeq.current
         setUsageLoading(true)
         setUsageError(false)
         try {
-          setUsage(await getJson(`/usage?range=${encodeURIComponent(range)}`))
+          const data = await getJson(`/usage?range=${encodeURIComponent(range)}`)
+          if (seq !== usageSeq.current) return
+          setUsage(data)
         } catch {
+          if (seq !== usageSeq.current) return
           setUsageError(true)
         } finally {
-          setUsageLoading(false)
+          if (seq === usageSeq.current) setUsageLoading(false)
         }
       }, [range])
```

#### CHG-09 · P2 测试

- `usage.test.mjs`：`total` 聚合等于行之和；订阅行 `billable === false && cost === 0`；仅订阅 / 无消耗时 `totals` 仍有 0 桶；`cacheWrite` 计入 `tokens.cache` 与 `total.tokens`；`approximate` 命中 family 价为 `true`。
- `usage.test.mjs` 契约变更：`hidden providers are excluded` 的 `totals.CNY === undefined` 改为"存在 0 桶且 `cost === 0`、`models` 无该 provider"。
- `core.test.mjs`：`resolveProviderKind` 五级优先级；`stampProviderKinds` 遇 `mode: 'unknown'` 不写、变化时返回 `true`。
- `providers-vm.test.mjs`：沿用"VM 不保留 `plans`"的写法补一条"VM 不保留 `mode`"。
- `scripts/e2e.mjs`：`usageFor` 补 `total`；断言两格卡金额等于 `totals` 和、Tokens 等于 `total.tokens`；首屏与范围切换不出现 `¥0.00` 伪值。

### 3.2 第二章：P3 设置页施工

#### CHG-10 · `src/store.js` · 配置收口

```diff
 export const DEFAULT_PREFS = {
   version: 1,
-  budget: { amount: 3500, currency: 'CNY' },
   budgets: {},
   billingModes: {},
   refreshMs: 60000,
   showBalance: true,
-  showMonthTokens: true,
-  logLevel: 'info',
 }
+
+/** 刷新间隔唯一枚举：loadPrefs 归一与 normalizePrefs 校验共用。 */
+export const REFRESH_OPTIONS = [30000, 60000, 300000]
```

```diff
 export async function loadPrefs(dir, logger) {
   const prefs = await readJson(join(dir, 'prefs.json'), DEFAULT_PREFS, (file, backup) => {
     logger?.warn('boot', 'state.corrupt', { file, backup })
   })
+  // legacy budget 只做读取兼容：不进 runtime prefs，下次保存即从文件消失
+  const rawRefresh = Number(prefs?.refreshMs)
+  const refreshMs = REFRESH_OPTIONS.includes(rawRefresh) ? rawRefresh : DEFAULT_PREFS.refreshMs
+  if (prefs?.refreshMs !== undefined && refreshMs !== rawRefresh) {
+    logger?.warn('boot', 'prefs.normalize', { field: 'refreshMs', value: prefs.refreshMs, used: refreshMs })
+  }
   return {
-    ...DEFAULT_PREFS,
-    ...prefs,
-    budget: { ...DEFAULT_PREFS.budget, ...(prefs?.budget ?? {}) },
-    budgets: { ...(prefs?.budgets ?? {}) },
+    version: 1,
+    budgets: { ...(prefs?.budgets ?? {}) },
     billingModes: { ...(prefs?.billingModes ?? {}) },
-    logLevel: prefs?.logLevel === 'debug' ? 'debug' : 'info',
+    refreshMs,
+    showBalance: prefs?.showBalance !== false,
   }
 }
```

> 返回对象即白名单：`budget` / `showMonthTokens` / `logLevel` 及未知键一律丢弃，下一次 `PUT /prefs` 落盘时从文件消失。

#### CHG-11 · `index.js` · `normalizePrefs` 收口

```diff
-import { createFlusher, dataDir, loadPrefs, loadState, logsDir, recoverState, resolveHome, saveJson, saveMonths } from './src/store.js'
+import { REFRESH_OPTIONS, createFlusher, dataDir, loadPrefs, loadState, logsDir, recoverState, resolveHome, saveJson, saveMonths } from './src/store.js'
```

```diff
 function normalizePrefs(input, base) {
   const prefs = {
     version: 1,
-    budget: { ...base.budget },
     budgets: { ...(base.budgets ?? {}) },
     billingModes: { ...(base.billingModes ?? {}) },
     refreshMs: base.refreshMs,
     showBalance: base.showBalance,
-    showMonthTokens: base.showMonthTokens !== false,
-    logLevel: base.logLevel === 'debug' ? 'debug' : 'info',
   }
-  if (input?.budget !== undefined) prefs.budget = budgetPatch(input.budget, prefs.budget)
   // ↓ budgets 校验分支原样（budgetPatch 仍用于逐 provider 校验）
   // ↓ billingModes 校验分支原样
   if (input?.refreshMs !== undefined) {
     const refresh = Number(input.refreshMs)
-    if (![30000, 60000, 300000].includes(refresh)) throw new Error('invalid-refresh')
+    if (!REFRESH_OPTIONS.includes(refresh)) throw new Error('invalid-refresh')
     prefs.refreshMs = refresh
   }
   if (input?.showBalance !== undefined) prefs.showBalance = input.showBalance === true
-  if (input?.showMonthTokens !== undefined) prefs.showMonthTokens = input.showMonthTokens === true
-  if (input?.logLevel !== undefined) prefs.logLevel = input.logLevel === 'debug' ? 'debug' : 'info'
   return prefs
 }
```

#### CHG-12 · `src/core.js` · `budgetFor` 默认值与币种

```diff
+/** 未填写时的默认预算，按 provider 币种；不写盘。 */
+export const DEFAULT_BUDGET = 100
+
 function budgetFor(prefs, providerId, currency) {
   const map = prefs?.budgets?.[providerId]
+  const explicitZero = map?.amount === 0
   let amount = num(map?.amount)
   let state = 'unset'
   if (map?.amount === 0) state = 'unset'
-  if (amount <= 0 && providerId === 'deepseek-official' && num(prefs?.budget?.amount) > 0) {
-    amount = num(prefs.budget.amount)
-  }
-  if (map?.amount === 0) amount = 0
+  // 未填写（含新装、新增 provider、老用户）统一按 100；显式 0 才是"未设置"
+  if (amount <= 0 && !explicitZero) amount = DEFAULT_BUDGET
+  if (explicitZero) amount = 0
   return {
     amount,
     used: 0,
     remaining: 0,
     percent: 0,
     state,
-    currency: map?.currency === 'USD' ? 'USD' : (currency ?? 'CNY'),
+    // 预算币种只跟 provider 当前币种，落盘的 budgets[id].currency 不参与计算
+    currency: currency === 'USD' ? 'USD' : 'CNY',
   }
 }
```

> legacy `budget` 回退一并删除：老用户未在 `budgets` 显式配置时同样落到 100（D-08），`core.test.mjs` 的 legacy 用例改为断言 100。
> `budgetFor` 返回的 `state` 仍由 `buildSummary` 依据 `amount` 重算（`amount <= 0` 才是 `unset`），因此缺省 100 会正常显示为 `ok`。

#### CHG-13 · `client.js` · 预算输入数据源（零样式）

```diff
       const loadPrefs = useCallback(async () => {
         try {
           const data = await getJson('/prefs')
           setPrefs(data)
           const next = {}
-          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = String(value.amount ?? '')
+          for (const [id, value] of Object.entries(data.budgets ?? {})) next[id] = value.amount > 0 ? String(value.amount) : ''
           setBudgetText(next)
```

```diff
-        if (text === '') {
-          delete budgets[provider.id]
+        if (text === '') {
+          // 显式 0：清空后不再被 DEFAULT_BUDGET 覆盖
+          budgets[provider.id] = { amount: 0, currency: provider.currency }
```

```diff
-              value: budgetText[provider.id] ?? '',
+              value: budgetText[provider.id] ?? String(provider.budget?.amount ?? ''),
```

> 只改取值与写入的数值，控件、`style` 与布局不变。

#### CHG-14 · `src/core.js` · VM 字段清理

```diff
   showBalance: prefs?.showBalance !== false,
-  showMonthTokens: prefs?.showMonthTokens !== false,
   updatedAt: now,
```

#### CHG-15 · P3 测试

- `store.test.mjs`：旧文件 `budget: 3500` 不再迁移，`loadPrefs` 返回值无 `budget` 键且 `budgets` 不被写入；`refreshMs: 120000` 回落 60000 并调用 `logger.warn('boot','prefs.normalize')`；`showMonthTokens` / `logLevel` / 未知键不进入返回值。
- `core.test.mjs`：删除 `showMonthTokens` 断言；`budgets` 缺失 → `budget.amount === 100`；`{ amount: 0 }` → `amount === 0 && state === 'unset'`；`budgets[id]` 显式 50 → 50（默认不覆盖）；`budgets[id].currency: 'USD'` + provider CNY → `budget.currency === 'CNY'`；原 legacy 3500 用例改为断言 100。
- `scripts/e2e.mjs`：P3 预算输入首次打开即等于 P2 预算行金额（100）；清空后 P2 显示"未设置"，刷新后仍为空。

#### CHG-16 · `src/backup.js`（新增）+ `index.js` · 导出/导入

- 新增文件 `src/backup.js`：打包与校验，纯函数、无 IO。

```text
// 新增文件
export const BACKUP_SCHEMA = 1

/** 设置 + 当月 days + 与 P2 同口径的四范围派生视图（派生视图仅供阅读，导入时忽略）。 */
export function buildExport(state, prefs, now, snapshots) {
  const month = localMonthKey(now)
  const days = Object.fromEntries(
    Object.entries(state.days ?? {}).filter(([dayKey]) => dayKey.startsWith(`${month}-`)),
  )
  const scoped = { ...state, days }
  const usage = {}
  for (const range of ['today', '7d', '30d', 'all']) {
    const view = buildUsage(scoped, prefs, range, now, snapshots)
    usage[range] = { totals: view.totals, total: view.total, models: view.models }
  }
  return { schema: BACKUP_SCHEMA, exportedAt: now, month, prefs, providerKinds: { ...(state.providerKinds ?? {}) }, days, usage }
}

/** 整包校验：schema / month / days 形状任一不合法返回 reason。 */
export function validateBundle(raw) {
  if (raw === null || typeof raw !== 'object') return { ok: false, reason: 'invalid-bundle' }
  if (raw.schema !== BACKUP_SCHEMA) return { ok: false, reason: 'unsupported-schema' }
  if (!/^\d{4}-\d{2}$/.test(String(raw.month ?? ''))) return { ok: false, reason: 'invalid-month' }
  if (raw.days === null || typeof raw.days !== 'object') return { ok: false, reason: 'invalid-days' }
  for (const [dayKey, bucket] of Object.entries(raw.days)) {
    if (!dayKey.startsWith(`${raw.month}-`)) return { ok: false, reason: 'month-mismatch' }
    if (bucket?.providers === undefined && bucket?.models === undefined) return { ok: false, reason: 'invalid-day' }
  }
  return { ok: true, bundle: raw }
}
```

- `index.js` 新增两条路由（放在 `/usage` 之后）：

```text
// GET /export：默认导出当前月
 const data = buildExport(state, prefs, Date.now(), providerCache.data)
 logger.info('data', 'export', { month: data.month, days: Object.keys(data.days).length })
 json(res, 200, { ok: true, data })

// POST /import：校验 → 备份 → 覆盖当月 → 合并 providerKinds → 缓存失效
 const checked = validateBundle(JSON.parse((await readBody(req)) || '{}'))
 if (!checked.ok) { json(res, 400, { ok: false, reason: checked.reason }); return }
 const stamp = Date.now()
 await saveJson(dir, `prefs.json.import-backup-${stamp}`, prefs)
 await saveJson(dir, `daily.json.import-backup-${stamp}`, state)
 prefs = normalizePrefs(checked.bundle.prefs ?? {}, prefs)
 const days = { ...state.days }
 for (const dayKey of Object.keys(days)) if (dayKey.startsWith(`${checked.bundle.month}-`)) delete days[dayKey]
 Object.assign(days, checked.bundle.days)
 state.days = days
 state.providerKinds = { ...(state.providerKinds ?? {}), ...(checked.bundle.providerKinds ?? {}) }
 providerCache = { at: 0, data: [] }
 flusher.schedule()
 json(res, 200, { ok: true, data: { month: checked.bundle.month, days: Object.keys(checked.bundle.days).length, backup: `daily.json.import-backup-${stamp}` } })
```

#### CHG-17 · `client.js` · P3「数据」分区

```text
// 新增状态与动作（与 openLogs / exportLogs 同风格）
const [importing, setImporting] = useState(false)
const fileRef = useRef(null)

const exportData = async () => {
  try {
    const data = await getJson('/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dsh-token-dash-${data.month}.json`
    link.click()
    URL.revokeObjectURL(url)
    flash(tr('数据已导出'))
  } catch { setStatus({ text: tr('数据导出失败'), error: true }) }
}

const importData = async (file) => {
  if (file === null || file === undefined) return
  setImporting(true)
  try {
    const bundle = JSON.parse(await file.text())
    const result = await postJson('/import', bundle)
    await load()
    flash(tr('已导入 {month} 数据', { month: result.month }))
  } catch (error) {
    setStatus({ text: tr('导入失败：{reason}', { reason: error.message }), error: true })
  } finally {
    setImporting(false)
    if (fileRef.current !== null) fileRef.current.value = ''
  }
}
```

```diff
         section(tr('日志'), ...),
+        section(tr('数据'), h('div', { style: styles.row },
+          h('span', null, tr('备份与恢复')),
+          h('span', { style: styles.rowStart },
+            h('button', { type: 'button', 'data-testid': 'token-dash-data-export', style: styles.button, onClick: exportData }, tr('导出数据')),
+            h('button', { type: 'button', 'data-testid': 'token-dash-data-import', disabled: importing, style: styles.button, onClick: () => fileRef.current?.click() }, importing ? tr('导入中…') : tr('导入数据')),
+            h('input', { ref: fileRef, type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: (event) => { void importData(event.target.files?.[0]) } })))),
         section(tr('价格与版本'), ...),
```

> 分区与按钮复用 `styles.section` / `styles.row` / `styles.rowStart` / `styles.button`；唯一新增内联样式是隐藏文件输入的 `display: 'none'`（不可见，不参与视觉）。

#### CHG-18 · P3 导出/导入测试

- `backup.test.mjs`：`buildExport` 只含当月 `days`；`usage` 四范围键齐全且 `usage.all.models` 与 `buildUsage` 一致；不含 `windows` / `balance` / 日志字段。
- `backup.test.mjs`：`validateBundle` 对 `schema !== 1` / 非法 `month` / 跨月 `days` / 缺 `providers|models` 分别返回 reason。
- `scripts/e2e.mjs`：导出 → 改预算 → 导入同一文件 → 预算回到导出时值；当月 `days` 覆盖后 `usage.all.total.tokens` 等于导出时值；连续导入两次数值不变。

#### CHG-19 · 文档与词条

- `docs/ui-design.md`：P3 新增「数据」分区（导出/导入两个按钮，位于日志之前）；§5.3 `账户余额` 改为"只控制 P1 余额显示，P2 恒显示（#31）"；§5.2 API 行补"未填写默认 100"；§7.2 预算输入改为"空值等价写入 0"；新增"设置页数据来源"小节；变更记录加 v2.29。
- `docs/design.md`：`prefs` 收敛为五键；新增 `/export`、`/import` 与 `src/backup.js` 职责；数据流补导出/导入分支。
- `locale/zh.json` / `locale/en.json`：新增 `数据`、`备份与恢复`、`导出数据`、`导入数据`、`导入中…`、`数据已导出`、`数据导出失败`、`已导入 {month} 数据`、`导入失败：{reason}`、`入 {input} · 缓存 {cache} · 出 {output}`、`Tokens 括号顺序：输入 / 缓存（读+写）/ 输出`；删除旧键 `入 {input} · 出 {output}`、`Tokens 括号顺序：输入 / 缓存 / 输出`；两侧键集保持一致。

## 四、不改动 / 边界

- `BND-01`：不改既有前端视觉（文首硬约束）；仅允许 P3「数据」分区两个按钮与占位文本节点。
- `BND-02`：不改 `src/pricing.js` 价目与峰谷算法、`src/collect.js` 归属逻辑、`store` 写入格式（仅新增可忽略字段）。
- `BND-03`：不改 `unknown` 无前缀模型的现有可见性。
- `BND-04`：除「数据」分区外不新增 P3 控件；`billingModes` 维持手改配置。
- 不做：范围本地记忆、`summary.stale` 计算修正、`buildSummary.tokens` 补 `cacheWrite`、保存失败错误码文案映射，见 §六。

## 五、验收要点

| 项 | 来源 | 验证方式 | 结果 |
|---|---|---|---|
| 两格卡无 UI 端 reduce，数值等于 `total` | REQ-01 | 单测 + 代码走查 `UsageContent` | ✅ 2026-11-02 |
| 费用框与明细同集合，订阅-only / 无消耗显示 `¥0.00` | REQ-02 | 单测 + E2E 金额断言 | ✅ 2026-11-02 |
| quota 抖动后分类不变 | REQ-03 | 单测：`mode: 'unknown'` 沿用 `providerKinds` | ✅ 2026-11-02 |
| 四桶闭合 | REQ-04 | 单测：`cacheWrite > 0` 时 `input+cache+output === total` | ✅ 2026-11-02 |
| 首屏占位、切换无旧值覆盖 | REQ-05 | `npm run e2e` 首屏与连续切换断言 | ✅ 2026-11-02 |
| 近似价 `≈` | REQ-06 | 单测 + 桌面走查 | 待桌面验证 |
| 预算单一来源 | REQ-07 | 单测：旧文件 `budget` 不进运行时；E2E 首次打开 P3 金额 = P2 金额 | ✅ 2026-11-02 |
| 默认预算 100 | REQ-11 | 单测 `budgetFor` 缺失分支（老用户无配置同样 100）+ E2E 两页数值一致 | ✅ 2026-11-02 |
| 清空不被默认覆盖 | REQ-11 | 单测 `{ amount: 0 }` → `unset`；E2E 清空后刷新仍为空 | ✅ 2026-11-02 |
| 导出包范围正确 | REQ-12 | 单测 `buildExport`：只含当月 days、四范围视图、无配额/余额 | ✅ 2026-11-02 |
| 导入覆盖且幂等 | REQ-13 | 单测 `validateBundle` + E2E 二次导入数值不变 | ✅ 2026-11-02 |
| 「数据」分区样式复用 | REQ-14 | 走查：只用 `styles.section/row/rowStart/button` | ✅ 2026-11-02 |
| 非法 `refreshMs` 可加载可保存 | REQ-08 | 单测 `loadPrefs` + 手工改文件走查 | ✅ 2026-11-02 |
| 死字段已移除 | REQ-09 | `grep -n "showMonthTokens\|logLevel" src index.js client.js` 为空 | ✅ 2026-11-02 |
| 预算币种跟随 provider | REQ-10 | 单测：`budgets.currency='USD'` + provider CNY → `CNY` | ✅ 2026-11-02 |
| 样式零改动 | BND-01 | `git diff client.js` 中 `style` / `styles.` / `T.` 取值行改动数 = 0 | ✅ 2026-11-02 |
| 旧文件兼容 | RSK-01 | 单测：无 `providerKinds` 的 daily、含旧字段的 prefs 均可加载 | ✅ 2026-11-02 |
| 订阅行排序下沉、api 行顺序不变 | RSK-02 | 单测断言 api 行相对顺序 | ✅ 2026-11-02 |
| 行为变更留档 | RSK-03 | CHANGELOG 记录 legacy 预算回退移除 | ✅ 2026-11-02 |

### 5.1 分层验收与自主执行守则

| 层 | 内容 | 方式 | 资源消耗 | 无人值守 |
|---|---|---|---|---|
| L1 | 两页聚合、口径、配置归一 | `npm test` | 无 | 允许 |
| L2 | `/usage`、`/prefs` 合约字段 | `npm run e2e` 前段 API 断言（与 L3 同一脚本） | 无 | 允许 |
| L3 | Playwright：首屏占位、两格卡数值、切换、明细括号、预算同步 | `npm run e2e` | 无 | 允许 |
| L4 | 桌面真机走查（暗色 / 窄屏 / 真实额度 / 手改配置） | 手动 | 需启动 DSH | 用户在场 |

守则五要素：

1. 执行范围：L1 → L2 → L3 依序递进，低层失败不进高层。
2. 修复边界：只允许改测试适配（mock 补 `total`、断言文案），不得改 §四 `BND-01`~`BND-04` 语义，尤其不得为了过测试改样式。
3. 停机条件：同一失败连续 3 轮未收敛、或修复需要改 BND、或触及文件超过 6 个即停并留报告。
4. 记录去向：每轮结论记 §九，汇总回写 §五 与本表结果列。
5. commit / push：每轮独立 commit；push 与发布必须用户显式指令。

### 5.2 测试步骤（施工后按序执行）

| 步 | 命令 / 操作 | 期望 |
|---|---|---|
| 1 | `npm test` | L1 全绿；新增用例覆盖 `total` 聚合、`billable`、0 桶、四桶闭合、kind 优先级、预算默认 100 / 显式 0、prefs 归一、导出包校验 |
| 2 | `npm run e2e` | L2 合约 + L3 Playwright 全绿：两格卡数值、首屏占位、范围切换、预算同步、导出/导入 |
| 3 | 样式零 diff 自检：`git diff -U0 client.js` | 只允许 CHG-07 占位节点与 CHG-17 数据分区；`styles.*` / `T.*` 取值行改动数 0 |
| 4 | 旧数据兼容：临时 `DSH_HOME` 放 v1 `prefs.json`（含 `budget: 3500`）与无 `providerKinds` 的 `daily.json` | 可正常启动；P3 预算显示 100、两页同值；旧字段保存后消失 |
| 5 | 手改 `prefs.json` 为 `refreshMs: 120000` | P3 胶囊有选中项、可保存；日志出现 `[TD:boot] prefs.normalize` |
| 6 | 导出 → 改预算 → 导入同一文件 | 预算与当月用量回到导出时值；`*.import-backup-<ts>` 存在；二次导入数值不变 |
| 7 | 桌面真机（用户执行） | 暗色 / 窄屏；quota 失败时 api/订阅分类不变 |

## 六、遗留处置

| 项 | 处置 |
|---|---|
| `billingModes` 无界面入口 | 维持手改 `prefs.json`；若后续要 UI，另立需求（需破 BND-04） |
| P3 结构非配置驱动 | 分区与控件在 `client.js` 硬编码，不在本轮范围 |
| `unknown` 无前缀模型不可见 | 保持现状；若覆盖需 VM 增 `usage.unattributed` 与"未归属"分组 |
| 范围选择无本地记忆 | 独立需求 |
| `summary.stale` 恒 `false` | 客户端已自行按 `updatedAt + refreshMs` 计算，本轮不清字段 |
| `buildSummary.tokens` 缺 `cacheWrite` | 客户端未消费，本轮不动 |
| 保存失败错误码（`invalid-budget` 等）直出 | 后续可做文案映射；本轮不做 |
| `REFRESH_OPTIONS` 在 `client.js` 另有一份 | 客户端无法 import 服务端模块，保留常量并在 §五 用"非法值归一"兜底 |
| Tooltip 宽度 | `maxWidth: 220px` 作用在内容盒，含 7×2 padding 后总宽上限 234，与设计 §2「全部 box-sizing:border-box」不一致；本轮受零样式约束不改，e2e 阈值按 236 断言，后续单独修 |
| 保存失败错误码 | `invalid-refresh` 等机器码仍直出到状态行，未做文案映射 |
| 数据导入 / 导出 | 已纳入本轮，见 §2.6、CHG-16~18 |

### 6.1 数据备份与迁移（已决策）

**升级是否继承数据：是。** 数据与插件包完全分离：

| 内容 | 路径 | 升级时是否受影响 |
|---|---|---|
| 日级账本 | `$DSH_HOME/dsh-token-dash/daily.json` | 否 |
| 设置 | `$DSH_HOME/dsh-token-dash/prefs.json` | 否 |
| 月度账本 | `$DSH_HOME/dsh-token-dash/months/YYYY-MM.json` | 否 |
| 日志 | `$DSH_HOME/logs/dsh-token-dash/` | 否 |
| 插件代码 | `$DSH_HOME/profiles/<profile>/node_modules/dsh-token-dash` | 是（整体替换） |

`/update/install` 只执行 `dsh plugin add dsh-token-dash@<version> --save-exact`，不触碰 `$DSH_HOME/dsh-token-dash`，所以升级天然继承数据；`daily.json` 损坏时会被重命名为 `.corrupt-<ts>` 并从 `months/` 回补。

导入导出的动机是**换机 / 重置 / 多份 DSH 安装**，不是升级。

**导出内容（已定）**：设置 + 当月使用数据，且使用数据与 P2 时间选择同口径。

| 内容 | 是否导出 | 说明 |
|---|---|---|
| `prefs`（预算 / 模式 / 刷新间隔 / 余额开关） | 是 | 设置恢复 |
| 当月 `days`（providers/models 聚合） | 是 | 导入真源 |
| `providerKinds` | 是 | 计费形态口径 |
| `usage`（当天 / 7天 / 30天 / 当月全部） | 是 | 与 P2 范围区同口径的可读视图，导入时忽略 |
| 订阅窗口、配额、余额 | 否 | API 可复得，不进包 |
| 日志、社区价目、`.corrupt-*` | 否 | 与恢复无关 |

**导入语义（已定）**：覆盖 prefs + 覆盖当月 `days`，`providerKinds` 合并；写盘前生成 `*.import-backup-<ts>`；重复导入同一文件结果不变。

## 七、日志速查

- LogCategory：`TokenDash`
- 前缀：`[TD:<module>]`
- `[TD:vm] usage`：范围、模型数、`billable` 行数、`total.tokens`、币种数
- `[TD:provider] kind.stamp`：`stampProviderKinds` 返回变化时的 provider 列表
- `[TD:boot] prefs.normalize`：`refreshMs` 回落时的原值与使用值
- `[TD:data] export` / `[TD:data] import`：月份、days 条数、models 数、备份文件名（不记金额与包内容）

## 八、决策记录

| ID | 决策 | 备选与否决理由 |
|---|---|---|
| D-01 | 费用框与 Tokens 框取同一集合：非计费模型 VM 内 `cost = 0` | 否决"费用框含订阅目录价"：与设计 §4.3"订阅不显示费用"冲突，明细无法对账 |
| D-02 | 缓存展示合并读写（`cache = cacheRead + cacheWrite`），明细仍 3 格 | 否决四格分列：320 宽下挤压 Tokens 前缀，且五家价目 `cacheWrite` 多为 0 |
| D-03 | kind 固化到 `state.providerKinds` + 快照 `mode` | 否决"仅用快照 kind"：quota 失败即漂移；否决"按天存 kind"：历史行无值可回填 |
| D-04 | 范围切换保留旧数据 + 请求序号化 | 否决骨架屏 / 清空明细：违反设计 §4.4 |
| D-05 | legacy `budget` 只读取兼容：不迁移、不参与计算，下次保存即消失（统一落到 100） | 否决"迁移 3500"：与 D-08 冲突，会让老用户继续沿用旧默认；否决"保留回退"：P3 永远空框、清空无效；否决"报错拒读"：旧文件必须可读 |
| D-06 | 预算币种以 `provider.currency` 为准 | 否决沿用 `budgets[id].currency`：provider 切换站点后币种滞留，金额含义与标签不符 |
| D-07 | `showMonthTokens` / `logLevel` 直接删除而非接线 | 否决接线 `logLevel`：P3 无控件，保留即死字段；日志级别需要独立设计再谈 |
| D-08 | 未填写时默认预算 **100**（`DEFAULT_BUDGET`，provider 币种，不写盘）；老用户同样适用，仅 `budgets` 已显式配置才沿用 | 否决"沿用 3500"：旧默认只对 DeepSeek 生效，其他 provider 仍空；否决"默认写进 prefs.json"：把默认值伪装成用户设置；否决"老用户保留 3500"：口径分裂，难以解释 |
| D-09 | 导出 = 设置 + 当月 `days` + 四范围派生视图；不含配额 / 余额 / 日志 / 价目 | 否决"全量历史"：用户只要当月，且 `months/` 与 `daily.json` 冗余；否决"导出配额余额"：API 可复得，且含账户敏感信息 |
| D-10 | 导入 = 覆盖 prefs + 覆盖当月 days + 合并 providerKinds，写盘前自动备份 | 否决"累加合并"：重复导入会翻倍；否决"prefs 按字段合并"：无法表达"清空某 provider 预算" |
| D-11 | 导出/导入一律**单个 JSON 文件**，不 zip、不拆多文件 | 否决 ZIP：需引入 JSZip 或手写 store-only zip，破"零构建零依赖"，浏览器端还要解压，失败面大于收益；否决多文件：浏览器不能写目录，导入需多选，缺文件/放错目录无校验；单包 < 500KB，压缩无必要 |

## 九、自测反馈台（活跃期，归档前删除）

> Issue 的追加、完成、状态和轻量压缩见 `references/issue_templates.md`；未完成 Issue 必须先终结或迁移，才能归档普通 Plan。
