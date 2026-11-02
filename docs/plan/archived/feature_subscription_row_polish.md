# 订阅行与预算行排版修正

> 状态：已实施<br>
> 完成时间：2026-11-02<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[`UI 设计`](../../ui-design.md)（v2.39）、[`数据整合`](feature_data_optimize.md)

## 一、最终需求与范围

| ID | 最终处置 | 需求 / 边界 / 风险 | 最终结论 |
|---|---|---|---|
| REQ-01 | 完成 | P3 订阅行首行右侧显示重置时间，移除「账户套餐」 | 每订阅 provider 一行：`名称 … 重置` |
| REQ-02 | 完成 | P2 订阅窗口组左右分开，右侧迷你条贴分区右边界 | `space-between`，右缘误差 0px |
| REQ-03 | 完成 | P2 预算数值列跨 provider 左缘对齐 | 名称行四列网格，`x` 差 ≤1px |
| REQ-04 | 完成 | P3 订阅行不再显示 5h/周 百分比与迷你条 | 配额只在 P1/P2 出现 |
| REQ-05 | 完成 | 去掉四处标题的「（已检测 N）」 | 纯标题，`grep 已检测` = 0 |
| REQ-06 | 完成 | 预算名称行四列（名称 / % / 已用总额 / 余额）对齐 | 34px + 1fr + 72px 固定列 |
| REQ-07 | 完成 | 重置时间块标准化为 `ResetLabel`，三档单位 | `<1h` 分钟、`1–24h` 小时、`≥24h` 天 |
| REQ-08 | 完成 | 预算条改满宽（4px，仅预算行） | `MiniBar` 增 `stretch` 例外 |
| REQ-09 | 完成 | 两格卡瘦身：去「按币种」、金额主蓝、副行三数字 | 副行 `480k · 750k · 80k` |
| BND-01 | 保持 | 订阅窗口迷你条仍 48×4、不拉伸 | 仅预算行用满宽 |
| BND-02 | 保持 | 单窗口时窗口组仍左对齐 | 无回归 |
| RSK-01 | 接受 | 预算行两行后固定区变高 | 3 个 provider 约 +32px |
| RSK-02 | 接受 | 去掉计数后看不出 provider 数量 | 行数本身即数量，P1 有概览 |

## 二、最终实现

### 3.0 最终改动总览

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01 | 修改 | `client.js` | `QuotaRow`：窗口容器 `justify-content: space-between` + `data-testid`；`heading=false` 时不输出重置节点 |
| CHG-02 | 修改 | `client.js` | `SettingsContent.subRows`：首行右侧改 `ResetLabel`，`QuotaRow` 传 `heading=false`、`reset=false` |
| CHG-03 | 测试 | `scripts/e2e.mjs` | P3 无「账户套餐」、P2 右缘 ≤ 2px |
| CHG-04 | 修改 | `client.js` | `BudgetRow` 两行化、数值列网格；`UsageContent` 去掉外层包裹 |
| CHG-05 | 修改 | `client.js` | `QuotaRow` 百分比 `minWidth: 34`，5h/周 跨行对齐 |
| CHG-06 | 修改 | `client.js`、`locale/*.json` | P3 订阅行只留名称 + 重置；四处标题去计数 |
| CHG-07 | 测试 | `scripts/e2e.mjs` | 费用列起点一致；设置页不含 `5h` / `周` |
| CHG-08 | 修改 | `client.js` | `styles.budgetMetrics` 四列 `34px 48px 1fr 72px`，余额并入数值行 |
| CHG-09 | 修改 | `client.js`、`locale/*.json` | `fmtReset` + `ResetLabel`（`data-testid=token-dash-reset`），三档单位，P2/P3 共用 |
| CHG-10 | 测试 | `scripts/e2e.mjs` | 余额列 `x` 差 ≤1px；两处重置文案格式断言 |
| CHG-11 | 修改 | `client.js` | `MiniBar` 增 `stretch`；`BudgetRow` 改「名称行四列 + 满宽条」，新增 `token-dash-budget-bar-*` |
| CHG-12 | 修改 | `client.js`、`locale/*.json` | 两格卡删「按币种」、金额改 `T.accent`、副行只渲染三数字；删两条词条 |

### 2.1 最终结构

```text
[P2 本月预算] 每 provider 两行
DeepSeek      91.9%   ¥91.90/¥100.00    余额 ¥87.66      ← budgetHead: 1fr / 34px / 1fr / 72px
████████████████████████████████░░░░░░░░░░░░░░░░░░░░      ← MiniBar stretch，占满内容宽

[P2 订阅套餐] 名称 + 重置；窗口组左右分开
GLM Coding                     3 小时后 · 11-03 20:15 重置
5h 42.5% ▓▓░  ··············  周 18.2% ▓                  ← 百分比固定 34px，右端贴边界

[P3 订阅] 只保留一行
GLM Coding                     3 小时后 · 11-03 20:15 重置
```

### 2.2 关键代码骨架

```text
styles.budgetRow   = { display:grid; gap:4; padding:'3px 0'; fontSize:10.5 }
styles.budgetHead  = { display:grid; gridTemplateColumns:'minmax(0,1fr) 34px minmax(0,1fr) 72px'; alignItems:center; columnGap:6 }
MiniBar({ ratio, neutral, stretch })            // stretch: width 100%
ResetLabel({ ts, style })                        // `${fmtReset(ts)} 重置`，data-testid=token-dash-reset
fmtReset(ts)                                     // <1h 分钟 | <24h 小时 | ≥24h 天 + ' · MM-DD HH:mm'
```

### 2.3 关键陷阱

| 项 | 约束 |
|---|---|
| 列对齐 | 百分比列必须固定宽度，`auto` 会让条与费用起点逐行错位 |
| 条宽 | 满宽仅限预算行；订阅窗口必须保持 48×4 |
| 标题 | 去掉计数后不得残留空括号 |
| P3 订阅 | 不渲染 `QuotaRow`，但 `⟳` 局部刷新必须保留 |
| 词条清理 | 删词条时按 key 删，不可整行删除（曾误删同行的「真实 Tokens」） |

## 三、不改动 / 边界

- 不改 `MiniBar` 默认规格（48×4）、行高与色板；只新增预算行专用 `stretch`。
- 不改 P3 API 行（名称 + 按量 API / 月度预算 + 输入框）与「数据与日志」「价格与版本」结构。
- 不改 P1 pill 布局。

## 四、最终验收

| 项 | 来源 | 环境与方式 | 结果 |
|---|---|---|---|
| P3 订阅只有名称 + 重置 | REQ-01 / REQ-04 | e2e 文案断言 + 截图 | 通过 |
| P2 右侧迷你条贴右边界 | REQ-02 | e2e 几何断言（≤2px，实测 0） | 通过 |
| 预算四列对齐 | REQ-03 / REQ-06 | e2e 费用/余额 `x` 差 ≤1px | 通过 |
| 标题无「已检测」 | REQ-05 | `grep 已检测` = 0 + 截图 | 通过 |
| 重置文案三档 | REQ-07 | e2e 正则（P2 / P3 各一处） | 通过 |
| 预算条满宽 | REQ-08 | e2e 条宽 ≥200px + 截图 | 通过 |
| 两格卡瘦身 | REQ-09 | e2e 面板无「按币种」「缓存」+ 截图 | 通过 |
| 回归 | L1 + L2/L3 | `npm test`（76 项 / 75 pass / 0 fail）、`npm run e2e` | 通过 |

## 五、计划—实际重大偏差

- 计划「预算行两行（名称 + 余额 / 数值行）」→ 实际「名称行四列 + 满宽条」（原因：用户选定方案 A，48px 条看不出 8% 与 92% 的差距）。
- 计划「P3 订阅保留配额副行」→ 实际只有一行（原因：与 P2 重复，用户要求删除）。

## 六、诊断锚点

- LogCategory：`TokenDash`；本轮无新增日志。
- 高价值 testid：`token-dash-budget-cost-*` / `-balance-*` / `-bar-*`（列对齐与条宽）、`token-dash-quota-windows-*`（右缘）、`token-dash-reset`（重置文案）。

## 七、Issue 记录（已压缩）

### Issue #1 [已修复] 空 provider 快照被缓存 30s

- 触发与影响：冷启动首次探测为空时同样写 30s TTL → 面板最长约 1 分钟显示「未检测到已配置供应商」。
- 根因与落点：`index.js · refreshProviderCache()` 空结果 `at: 0`。
- 验证：重启后 build 全 `providers:1`，无空档日志。

### Issue #2 [已修复] 探测失败与「未配置」共用空态

- 触发与影响：空快照只有一句提示，无法区分没配 Key 与探测失败。
- 根因与落点：`providerCache.hadProviders` → `summary.providersDegraded`；`UsageContent` 显示「供应商探测失败 · 重试」。
- 验证：e2e mock `providersDegraded` 断言两种文案与重试按钮。

### Issue #3 [已修复] P3 订阅行「账户套餐」+ 重置另起一行

- 触发与影响：订阅块三行高、信息重复。
- 根因与落点：`subRows` 首行直接放重置（CHG-02）。
- 验证：e2e 断言无「账户套餐」；截图一行结构。

### Issue #4 [已修复] P2 「周」迷你条右端未贴边界

- 触发与影响：窗口组普通 flex，右侧留白。
- 根因与落点：`justify-content: space-between`（CHG-01）。
- 验证：右缘误差 0px。

### Issue #5 [已修复] 四处分区标题带「（已检测 N）」

- 触发与影响：1–2 个 provider 时无信息量。
- 根因与落点：标题改纯文案（CHG-06）。
- 验证：`grep 已检测` = 0。

### Issue #6 [已修复] P3 订阅行仍显示配额百分比

- 触发与影响：与 P2 重复。
- 根因与落点：P3 只留名称与重置（CHG-06）。
- 验证：e2e 断言设置页不含 `5h` / `周`。

### Issue #7 [已修复] P2 预算数值列未左对齐

- 触发与影响：不同长度的费用起点不一致。
- 根因与落点：数值列网格（CHG-04），后由 #10 收敛（CHG-11）。
- 验证：费用列 `x` 差 ≤1px。

### Issue #8 [已修复] 余额浮在首行右侧，与进度条「错行」

- 触发与影响：余额与数值不同基线。
- 根因与落点：余额并入数值行（CHG-08），#10 移到名称行第四列。
- 验证：余额 `x` 差 ≤1px。

### Issue #9 [已修复] 重置文案未组件化、单位不统一

- 触发与影响：P2/P3 各自拼串，单位混用。
- 根因与落点：`ResetLabel` + `fmtReset` 三档单位（CHG-09）。
- 验证：e2e 两处正则断言。

### Issue #10 [已修复] 预算行视觉偏弱，条太短

- 触发与影响：48px 条下 8% 与 92% 几乎同长。
- 根因与落点：方案 A（名称行四列 + 满宽 4px 条，CHG-11）。
- 验证：条宽 ≥200px、四列 `x` 对齐；截图确认。

### Issue #11 [已修复] 两格卡文案冗余、金额配色与主题不符

- 触发与影响：多一行「按币种」、金额绿色与主题蓝不一致、副行带中文标签并换行。
- 根因与落点：删「按币种」、金额改 `T.accent`、副行三数字（CHG-12）。
- 验证：e2e 断言无「按币种」「缓存」；截图单行三数字。
