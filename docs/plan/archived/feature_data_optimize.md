# 看板数据整合（P2 用量页 / P3 设置页）

> 状态：已实施<br>
> 完成时间：2026-11-02<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[`UI 设计`](../../ui-design.md)、[`架构设计`](../../design.md)、[`UI 迭代计划`](feature_ui_refresh.md)

## 一、最终需求与范围

| ID | 最终处置 | 需求 / 边界 / 风险 | 最终结论 |
|---|---|---|---|
| REQ-01 | 完成 | `buildUsage` 输出全模型聚合 `total` | 两格卡与副行只读 VM，UI 端 `reduce` 已删除 |
| REQ-02 | 完成 | 费用框与 Tokens 框同集合，非计费模型 `cost = 0` | `totals` 预置 0 桶，订阅-only / 无消耗显示 `¥0.00` |
| REQ-03 | 完成 | 计费形态固化，不随 quota 抖动 | 快照 `mode` + `state.providerKinds`，`resolveProviderKind` 唯一入口 |
| REQ-04 | 完成 | Tokens 四桶闭合 | 展示口径 `cache = cacheRead + cacheWrite`，三数之和等于总数 |
| REQ-05 | 完成 | 首屏 / 失败不显示伪 0；范围切换不被旧响应覆盖 | `usage === null` 渲染 `—`，`loadUsage` 加序号守卫 |
| REQ-06 | 完成 | 明细近似价 `≈` | VM 输出 `approximate`，明细按需加前缀 |
| REQ-07 | 完成 | 预算单一来源 | P3 初值取 VM；legacy `budget` 只读兼容、不参与计算 |
| REQ-08 | 完成 | 配置归一 | `loadPrefs` 白名单，非法 `refreshMs` 回落 60000 并记日志 |
| REQ-09 | 完成 | 死字段清理 | `showMonthTokens` / `logLevel` 从配置与 VM 移除 |
| REQ-10 | 完成 | 预算币种跟随 provider | `budgetFor` 只取入参币种，落盘 currency 不参与计算 |
| REQ-11 | 完成 | 默认预算 100 | `DEFAULT_BUDGET` 只在 VM 生效，不写盘；显式 0 表示未设置 |
| REQ-12 | 完成 | 导出：设置 + 当月使用 + 四范围视图 | 单 JSON，不含配额 / 余额 / 日志 / 价目 |
| REQ-13 | 完成 | 导入：整包校验 → 备份 → 覆盖当月 | 幂等，二次导入不翻倍 |
| REQ-14 | 完成 | P3 新增数据入口 | 与日志合并为「数据与日志」分区（Issue #4） |
| BND-01 | 保持 | 既有前端视觉不得改动 | 仅新增「数据与日志」两行与占位文本节点，无样式取值改动 |
| BND-02 | 保持 | 不改 pricing 算法、归属与存储格式 | 单测全绿 |
| BND-03 | 保持 | `unknown` 无前缀模型不可见 | 现状保留 |
| BND-04 | 调整 | 不新增 P3 控件 | 实际新增「数据与日志」分区（用户授权放宽） |
| RSK-01 | 已验证 | 旧 `daily.json` / `prefs.json` 兼容 | 旧文件可读，旧字段保存后消失 |
| RSK-02 | 接受 | 非计费行费用归零后排序下沉 | api 行相对顺序不变 |
| RSK-03 | 已验证 | 老用户预算由 3500 变 100 | 仅在 `budgets` 已有显式配置时沿用旧值 |
| RSK-04 | 接受 | 导入覆盖本机当月数据 | 写盘前生成 `*.import-backup-<ts>` |

## 二、最终实现

### 3.0 最终改动总览

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01 | 修改 | `src/core.js` | `buildUsage`：`add` 走 `resolveProviderKind`、写 `billable`、非计费行 `cost = 0`；`rows` 增 `tokens.cache` / `approximate`；`totals` 预置 0 桶；返回 `total` |
| CHG-02 | 修改 | `src/core.js` | 新增 `resolveProviderKind` / `stampProviderKinds` / `emptyTotals` / `usageCurrency`；`buildSummary` kind 改用前者并剥离快照 `mode` |
| CHG-03 | 修改 | `src/core.js` | `emptyState` 增 `providerKinds: {}` |
| CHG-04 | 修改 | `src/store.js` | `loadState` 补 `state.providerKinds ??= {}` |
| CHG-05 | 修改 | `src/adapters.js` | `glm` / `kimiCodingQuota` / `kimi` 输出 `mode`；`toSnapshot` 归一透传 |
| CHG-06 | 修改 | `index.js` | provider 刷新收敛为 `refreshProviderCache`，刷新后 `stampProviderKinds` + 调度落盘 |
| CHG-07 | 修改 | `client.js` | `UsageContent` 两格卡只读 VM、`—` 占位、`tokens.cache`、`≈`（零样式） |
| CHG-08 | 修改 | `client.js` | `loadUsage` 请求序号守卫 |
| CHG-09 | 测试 | `test/unit/usage.test.mjs`、`core.test.mjs`、`providers-vm.test.mjs`、`scripts/e2e.mjs` | 聚合 / 口径 / kind 优先级 / 占位断言 |
| CHG-10 | 修改 | `src/store.js` | `DEFAULT_PREFS` 收敛五键；`loadPrefs` 白名单 + `refreshMs` 归一；导出 `REFRESH_OPTIONS` |
| CHG-11 | 修改 | `index.js` | `normalizePrefs` 同步收口，刷新枚举改用共享常量 |
| CHG-12 | 修改 | `src/core.js` | `budgetFor` 缺省 100、显式 0 判 unset、币种取 provider 当前币种 |
| CHG-13 | 修改 | `client.js` | 预算输入初值取 VM `budget.amount`；清空写 `{ amount: 0 }` |
| CHG-14 | 修改 | `src/core.js` | `buildSummary` 移除 `showMonthTokens` |
| CHG-15 | 测试 | `test/unit/store.test.mjs`、`core.test.mjs`、`scripts/e2e.mjs` | 配置归一、默认 100、清空语义、币种 |
| CHG-16 | 新增 | `src/backup.js`、`index.js` | `buildExport` / `validateBundle` / `mergeImportDays`；`/export`、`/import` 路由 |
| CHG-17 | 修改 | `client.js` | P3「导出数据 / 导入数据」动作与文件选择 |
| CHG-18 | 测试 | `test/unit/backup.test.mjs`、`scripts/e2e.mjs` | 导出包字段、schema 校验、覆盖幂等 |
| CHG-19 | 文档 | `docs/ui-design.md`、`docs/design.md`、`locale/*.json` | 口径、分区、词条 |
| CHG-20 | 修改 | `index.js` | Issue #1/#2：空快照不写 TTL（`at: 0`）、维护 `hadProviders`、输出 `summary.providersDegraded`、空档记 `probe.miss` |
| CHG-21 | 修改 | `src/adapters.js` | Issue #3：`readProviders` 记录 `misses`（`:none` / `:error` / `:hidden`） |
| CHG-22 | 修改 | `client.js`、`scripts/e2e.mjs` | Issue #4：日志与备份恢复合并为「数据与日志」单分区，testid `token-dash-data-log-section` |

### 2.1 最终结构

```text
[daily.json days.<day>.providers.<id>.models.<model>]
        │
        ▼
[buildUsage(state, prefs, range, now, snapshots)]
        ├─ kind = resolveProviderKind(prefs > 快照 mode > providerKinds > 快照 kind > api)
        ├─ 非计费行 cost = 0，billable = false
        ├─ totals：先按未 hide 的已检测 provider 预置 0 桶，只累加 billable 行
        └─ total：全模型 tokens / 四桶 / cache / requests / hitRate
        ▼
[client 两格卡] 总费用 = totals[c].cost；真实 Tokens = total.tokens（含缓存读写）
```

```text
[prefs.json] ──loadPrefs（白名单 + refreshMs 归一）──► prefs 五键
        ├─► P3 控件（预算 / 刷新胶囊 / 余额开关）
        ├─► buildSummary.budget（缺省 100，币种跟随 provider）
        └─► /export、/import（设置 + 当月 days + 四范围派生视图）
```

### 2.2 关键代码骨架

```text
export function resolveProviderKind(state, prefs, providerId, meta)   // prefs > mode > providerKinds > kind > api
export function stampProviderKinds(state, snapshots)                  // 只写确定 mode，返回是否变化
export const DEFAULT_BUDGET = 100                                     // 未配置时的 VM 默认值，不写盘
export function buildExport(state, prefs, now, providerInfoInput)     // 包 = prefs + 当月 days + usage
export function validateBundle(raw)                                   // schema / month / days 整包校验
export function mergeImportDays(currentDays, month, incomingDays)     // 覆盖当月，保证幂等
```

### 2.3 关键陷阱

| 项 | 约束 |
|---|---|
| 零样式 | 仅允许「数据与日志」两行与占位文本节点；`styles.*` / `T.*` 取值不得改动 |
| 排序 | 非计费行 `cost` 归零后自然沉底，不改成按 tokens 排序 |
| 空桶 | `totals` 必须有 key，否则总费用 tile 空白 |
| 默认值 | 100 只存在于 VM 与渲染兜底，不写进 `prefs.json` |
| 清空预算 | 写 `{ amount: 0 }`，删键会被默认值回填 |
| 导入 | 覆盖当月 + 覆盖 prefs，不能累加；校验失败整包拒绝 |
| 空快照 | 不写 30s TTL，否则宿主服务未就绪会放大成整分钟空态 |

## 三、不改动 / 边界

- 不改 `src/pricing.js` 价目与峰谷算法、`src/collect.js` 归属逻辑、`store` 写入格式（仅新增可忽略字段）。
- `unknown` 且无已知前缀的模型保持不可见。
- 不做：范围本地记忆、`summary.stale` 计算修正、`buildSummary.tokens` 补 `cacheWrite`、保存失败错误码文案映射。

## 四、最终验收

| 项 | 来源 | 环境与方式 | 结果 |
|---|---|---|---|
| 聚合与口径 | REQ-01~04 | `npm test`（`usage` / `core` / `backup` / `store`） | 75 pass / 0 fail |
| P2 界面行为 | REQ-05~06 | `npm run e2e`（Playwright：首屏 `—`、切换、括号、`≈`） | 通过 |
| 预算与配置 | REQ-07~11 | `npm test` + e2e（默认 100、清空写 0、非法 `refreshMs`） | 通过 |
| 导出 / 导入 | REQ-12~13 | `npm test` + e2e（导出包字段、二次导入幂等） | 通过 |
| 数据分区与空态 | REQ-14、Issue #1~4 | `npm run e2e` + 桌面 1.1.0-local.8 日志 | 通过：启动后 3 次 summary 全 `providers:1`，无 `probe.miss`，warn/error = 0 |
| 样式零改动 | BND-01 | `git diff -U0 client.js` 走查 | 仅新增节点，样式取值无改动 |

## 五、计划—实际重大偏差

- 计划 P3 六分区 → 实际五分区（原因：Issue #4 把日志与备份恢复合并，用户同意）。
- 计划 legacy 预算「迁移进 budgets」→ 实际「只读兼容 + 默认 100」（原因：用户要求老用户也走 100，只有已配置才沿用）。
- 计划「零样式硬约束、不新增控件」→ 实际允许新增「数据与日志」两行按钮（原因：导出/导入需要入口，用户显式放宽）。

## 六、诊断锚点

- LogCategory：`TokenDash`
- 前缀：`[TD:<module>]`
- `[TD:provider] probe.miss`：`misses`（`:none` 未配置 / `:error` 请求失败 / `:hidden` 被计费模式隐藏）+ `credentials` / `account` 服务是否存在 —— 区分"没配 Key"与"宿主服务未就绪"。
- `[TD:boot] prefs.normalize`：`refreshMs` 被回落到 60000 时的原值与使用值。
- `[TD:data] export|import`：月份、days 条数、备份文件名（不含金额）。

## 七、Issue 记录（已压缩）

### Issue #1 [已修复] 空 provider 快照被缓存 30s

- 触发与影响：冷启动首次探测为空时，空快照同样写入 30s TTL，面板最长约 1 分钟显示「未检测到已配置供应商」。
- 根因与落点：`index.js · refreshProviderCache()` 空结果也写 `at: now` → 改为 `at: data.length === 0 ? 0 : Date.now()`，下一次请求立即重试。
- 不变边界：非空快照仍走 30s TTL；`/providers/refresh` 行为不变。
- 验证：2026-11-02 09:29 `1.1.0-local.8` 启动后 3 次 summary 全为 `providers:1`，无空档日志。

### Issue #2 [已修复] 探测失败与"未配置"共用同一空态文案

- 触发与影响：快照为空时只显示「未检测到已配置供应商」，无法区分未配 Key 与探测失败，也没有就地重试。
- 根因与落点：VM 无法表达失败 → `providerCache.hadProviders` + `summary.providersDegraded`；`client.js · UsageContent` 据此显示「供应商探测失败 · 重试」（复用既有样式）。
- 验证：e2e mock `providersDegraded` 断言两种文案与重试按钮。

### Issue #3 [已修复] 适配器空结果无日志

- 触发与影响：五个适配器全空时只有 `vm build {providers:0}`，无法判断缺 Key、请求失败还是服务未注入。
- 根因与落点：`src/adapters.js · readProviders()` 在返回数组上附 `misses`；`index.js · refreshProviderCache()` 空结果记 `[TD:provider] probe.miss`（含 `credentials` / `deepseekAccount`）。
- 验证：`npm test` 断言五项 `:none` 与 `:hidden`。

### Issue #4 [已修复] P3 日志与数据各占一个分区

- 触发与影响：六分区中「日志」「备份与恢复」各占一块，只放一行按钮，纵向浪费约 40–50px。
- 根因与落点：`client.js · SettingsContent` 两个 `section()` 合并为「数据与日志」，两行直接作为子节点，零新增样式；testid 收敛 `token-dash-data-log-section`。
- 验证：e2e 通过（分区唯一、含两行按钮、位于价格之上）；实际高度收益未单独走查，用户要求归档。
