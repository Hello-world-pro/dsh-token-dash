# Provider 边界收口施工 checklist

> 依据 plan：`../../../plan/active/feature_provider_boundary.md`<br>
> 状态：施工中（用户指令：创建 → 迭代 → 全量测试 → 发布 1.0.6）<br>
> 工程根：`dsh-token-dash`（包名 `dsh-token-dash`）

## 阶段总览

| 阶段 | 一句话 | 状态 |
|---|---|---|
| 0 契约与基线 | 锁定五家 descriptor、Snapshot 字段、验收口径 | ✅ |
| 1 registry | `providers.js` 收口元数据，VM 只调 registry API | ✅ |
| 2 snapshot | adapter 出口统一 `windows`/`error`/`quotaError` | ✅ |
| 3 VM | `buildSummary` 输出 `pricingLinks` / `windows` | ✅ |
| 4 UI | 删除 `LINKS`，订阅卡改 `windows` | ✅ |
| 5 测试 | L1 + E2E 全绿，回归 P1/P2/P3 | ✅ |
| 6 发布 | 1.0.6 CHANGELOG/tag/npm/Release | ✅ |

## 决策记录

| # | 问题 | 定案 |
|---|---|---|
| Q1 | 是否拆 per-provider 文件 | 否；单文件 descriptor 表 |
| Q2 | `plans` 是否保留 | 内部兼容，VM/UI 只输出/消费 `windows` |
| Q3 | 价格链接范围 | 五家全列，与现 UI 一致 |
| Q4 | 版本号 | 1.0.6（PATCH，内部重构） |

## 阶段详情

### 阶段 1：registry

**AI 先行**

1. 在 `src/providers.js` 建立 descriptor：id/label/currency/subscription/defaultModel/prefixes/modelLabels/pricingUrl。
2. 新增 `providerDescriptor` / `defaultModelFor` / `pricingLinks`；旧函数改为查 descriptor。
3. 保留 `DEFAULT_MODELS` 导出（派生）避免外部测试/兼容断点。

**你收尾**

1. 确认五家默认模型与价格页无变化。
2. 回复暗号：`registry 口径确认`。

### 阶段 2：snapshot

**AI 先行**

1. `src/adapters.js` 新增 `toSnapshot(entry)`：`plans`→`windows`、`_error`→`error`、`_quotaError`→`quotaError`、补 `status`/`fetchedAt`。
2. `readProviders` / `readSubscriptions` 返回 snapshot；`logAdapterEvents` 改读新字段。
3. adapter 内部解析函数保持不动，只在出口归一化。

**你收尾**

1. 检查订阅卡失败态仍显示“套餐查询失败”。
2. 回复暗号：`snapshot 形状确认`。

### 阶段 3：VM

**AI 先行**

1. `core.js` 删除对 `DEFAULT_MODELS` 数据表的直接 import，改 `defaultModelFor`。
2. provider 信息读 `windows`；VM 输出 `windows` + `pricingLinks`。
3. 保留 `info.plans` 兼容读取，输出不再出现 `plans`。

**你收尾**

1. 确认 P1/P2 文案与预算口径无变化。
2. 回复暗号：`VM 口径确认`。

### 阶段 4：UI

**AI 先行**

1. 删除 `client.js` 顶部 `LINKS`；P3 用 `summary.pricingLinks`，空数组不渲染。
2. 订阅相关 4 处 `provider.plans` → `provider.windows`。
3. 加一条 UI 约束检查：`client.js` 不出现 `deepseek` / `zhipu` / `moonshot` / `qwen` / `openrouter` 硬编码。

**你收尾**

1. 桌面走查 P1/P2/P3，确认价格链接仍 5 个、订阅窗口正常。
2. 回复暗号：`UI 走查通过`。

### 阶段 5：测试

**AI 先行**

1. 新增 providers/snapshot 单测；更新 `plans`→`windows` 的既有用例与 E2E mock。
2. `npm test` + `npm run e2e`。

**你收尾**

1. 确认全绿输出。
2. 回复暗号：`全量测试通过`。

### 阶段 6：发布

**AI 先行**

1. 版本 1.0.6；CHANGELOG 正式块（重构说明）；`npm run pack`。
2. 提交、推送、tag `v1.0.6`；等 release/publish workflow。
3. 核验 npm latest、Release body、assets。

**你收尾**

1. 确认发布链接。
2. 回复暗号：`1.0.6 已上线`。

## 测试 / 走查表

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| registry 五家同值 | ✅ | 新增 3 组 registry 测试；label/currency/defaultModel/prefix/pricingUrl 全等旧表 |
| snapshot 字段 | ✅ | `toSnapshot` 测试：windows/error/quotaError；无 `_error`/`plans` |
| VM `pricingLinks` | ✅ | core 测试：5 条，顺序 DeepSeek→GLM→Kimi→OpenRouter→Qwen |
| UI 无 provider 硬编码 | ✅ | `grep LINKS client.js` 为空；无五家 id 字符串 |
| L1 | ✅ | `npm test` 53/53 pass |
| E2E | ✅ | `npm run e2e` pass；P3 link 数 5 |
| 桌面走查 | 未走查 | 发布链路已核验；桌面 profile 仍为 1.0.5，未自动安装 |

## 施工提醒

- 先 registry，再 snapshot，最后 VM/UI；每步跑 L1，避免一次性排错。
- `plans` 兼容读取只给旧测试/旧数据，输出和 UI 必须 `windows`。
- 不改 pricing 算法、存储格式、UI 样式；发现越界先停下更新 plan。

## plan 回写候选

1. registry 实际导出清单与 descriptor 字段。
2. Snapshot 最终字段与 `status` 取值。
3. `pricingLinks` 顺序与空数组行为。
4. 迭代测试结果与 1.0.6 发布记录。

## 执行日志 + 踩坑

- 2026-11-02：创建 checklist；用户授权按 plan 执行并发布 1.0.6。
- 2026-11-02（迭代）：确认 adapter 内部解析不改，只在 `readProviders`/`readSubscriptions` 出口统一 snapshot；补 UI 无 provider 硬编码与 E2E 链接数 5 两项回归。
- 2026-11-02（施工）：registry / snapshot / VM / UI 完成；L1 53/53、E2E pass；版本 1.0.6，待打包发布。
- 2026-11-02（发布）：tag `v1.0.6`，release/publish 双 workflow success，npm latest 1.0.6，Release body 与 CHANGELOG 一致，asset 已上传。

