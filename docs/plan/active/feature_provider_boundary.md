# Provider / VM / UI 边界收口（PATCH 重构）

> 状态：已验收（1.0.6 已发布；待归档）<br>
> 创建：2026-11-02；更新：2026-11-02（契约迭代：snapshot 字段、pricingLinks 形状、UI 回归口径）<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[施工 checklist](../../checklist/active/dsh/provider-boundary-build-checklist.md)

## 〇、前置依赖 / 代码探查事实

### 已明确

- 需求边界固定五家 provider（REQ-09 / BND-01），不做第三方 provider 插件系统。
- 现状三层已存在：`src/adapters.js`（provider I/O）→ `src/core.js`（VM）→ `client.js`（UI）；UI 只请求 `/token-dash/api/summary`，没有 import provider 模块。
- 泄漏 1：`src/core.js` 直接 import `DEFAULT_MODELS`、`providerCurrency`、`providerFromModel`、`providerLabel`、`canBeSubscription`（provider 数据表在 VM 内被直接消费）。
- 泄漏 2：`client.js` 顶部 `LINKS` 硬编码五家价格页 URL，UI 知道 provider 身份。
- 泄漏 3：adapter 返回临时形状 `plans` / `_error` / `_quotaError`；`logAdapterEvents` 与 VM 都按这些私有字段消费。
- 现有测试：L1 48/48、E2E 全矩阵 pass；UI 测试用 mock summary，不 mock provider 模块。

### 待对齐

- 无；本轮决定只做低风险收口，不做 per-provider 文件拆分 / 依赖注入。

## 一、需求

| ID | P | 需求 | 成功信号 |
|---|---|---|---|
| REQ-01 | P0 | provider 元数据收口到单一 registry：别名、展示名、币种、默认模型、模型前缀、模型展示名、价格页 URL | `src/providers.js` 输出 descriptor；`core.js` 不再 import 数据表，只调用 registry API |
| REQ-02 | P0 | VM 输出 `pricingLinks`；UI 不再硬编码五家 URL | `client.js` 无 `LINKS`；P3 链接来自 `summary.pricingLinks`；E2E 链接数仍为 5 |
| REQ-03 | P0 | adapter→VM 统一 `ProviderSnapshot`：`windows` / `error` / `quotaError` / `status` / `fetchedAt` | `readProviders` / `readSubscriptions` 返回 snapshot；VM/UI 用 `windows`；无 `_error` / `plans` 泄漏到 VM/UI |
| REQ-04 | P0 | 行为与显示不变：五家识别、预算/余额/配额、费用/用量、空态、排序、价格链接 | L1 + E2E 全绿；桌面 P1/P2/P3 无可见变化 |
| BND-01 | 边界 | 不扩 provider、不做第三方插件、不做 per-provider 文件拆分 / DI | 五家函数与单文件 registry 保留 |
| BND-02 | 边界 | 不改 pricing 算法、存储格式、CHANGELOG 模型、UI 视觉 | 相关测试与数据文件不动 |
| RSK-01 | 风险 | `plans`→`windows` 改到 UI/E2E 时漏改 | 合约测试 + E2E 订阅卡断言 |
| RSK-02 | 风险 | registry 化后默认模型/归属行为变化 | `core.test` 的 #15/#16/#20 用例保持通过 |

## 二、设计方案

### 2.1 结构

```text
[adapters: deepseek/glm/kimi/openrouter/qwen]
        │  统一 ProviderSnapshot
        ▼
[ProviderSnapshot]  id/kind/currency/status/balance/windows/error/quotaError/fetchedAt
        │
        ▼
[buildSummary(state, prefs, now, snapshots)] ◄── [providerRegistry descriptor]
        │  聚合/预算/费用/占比/补行
        ▼
[SummaryVM]  providers/breakdown/today/month/cost/apiTotals/pricingLinks
        │
        ▼
[client.js]  只读 VM；按 kind/status/currency 渲染，不知道 provider id
```

改动点：adapter 出口新增 snapshot 归一化；VM 改为 registry 查询并输出 `pricingLinks`；UI 删除 `LINKS`、订阅卡改 `windows`。

### 2.2 关键签名 / 字段

| 层 | 名称 | 备注 |
|---|---|---|
| registry | `providerDescriptor(raw)` | 返回 `{ id, label, currency, subscription, defaultModel, prefixes, modelLabels, pricingUrl }`；未知返回 `null` |
| registry | `defaultModelFor(id)` / `providerFromModel(model)` / `modelLabel(model)` / `pricingLinks()` | VM/UI 只调用这些函数，不直接读表 |
| adapter | `toSnapshot(entry)` | 输出 `{ id, name, kind, currency, status, balance, windows, error, quotaError, fetchedAt }`；`status: ok\|error\|unconfigured`；`plans`→`windows`、`_error`→`error`、`_quotaError`→`quotaError` |
| VM | `buildSummary(state, prefs, now, snapshots)` | 输入不变（第四参仍是 provider 信息数组），输出新增 `pricingLinks`；`provider.windows` 替代 `plans` |
| UI | `summary.pricingLinks` | `[{ id, label, url }]`，固定五家顺序；空数组时价格行不渲染；订阅卡只读 `provider.windows` |

### 2.3 数据（五家 descriptor）

| id | label | currency | subscription | defaultModel | 价格页 |
|---|---|---|---|---|---|
| `deepseek-official` | DeepSeek 官方 | CNY | 否 | `deepseek-v4.1-flash` | `https://api-docs.deepseek.com/quick_start/pricing` |
| `zhipu` | 智谱 AI | CNY | 是 | `glm-5.3` | `https://docs.bigmodel.cn/cn/guide/start/pricing` |
| `moonshot` | Kimi | CNY | 是 | `kimi-k3` | `https://platform.moonshot.cn/docs/pricing/chat` |
| `openrouter` | OpenRouter | USD | 否 | `-` | `https://openrouter.ai/models` |
| `qwen` | 通义千问 | CNY（国际站 USD 由 adapter 覆盖） | 否 | `qwen3.8-max` | `https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio` |

### 2.4 关键陷阱

| 项 | 约束 |
|---|---|
| `plans`→`windows` | VM 可临时兼容 `info.windows ?? info.plans`，但输出只允许 `windows`；E2E mock 同步 |
| `pricingLinks` | 保持当前 UI 行为：五家全列，不按已配置过滤；顺序按 registry 定义 |
| `status` | `error` 优先；balance `unconfigured` 保留；不要用 `_error` 字段名泄漏到 VM |
| 默认模型 | `defaultModelFor(id)` 与旧 `DEFAULT_MODELS` 完全同值；OpenRouter `-` 语义不变 |
| 模型展示名 | 合并五家 `modelLabels`；未命中回退 `normalizeModel` 的 id |

## 三、实现要点

### 3.0 开发改动总览（已落地）

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01 | 修改 | `src/providers.js` | 改为 descriptor registry；新增 `defaultModelFor` / `pricingLinks` / descriptor 查询；保留旧导出兼容 |
| CHG-02 | 修改 | `src/core.js` | 改用 registry API；VM 输出 `pricingLinks` / `windows`；补行用 `defaultModelFor` |
| CHG-03 | 修改 | `src/adapters.js` | 新增 `toSnapshot`；`readProviders`/`readSubscriptions` 返回 snapshot；日志改读 snapshot 字段 |
| CHG-04 | 修改 | `client.js` | 删除 `LINKS`，P3 用 `summary.pricingLinks`；订阅卡 `plans`→`windows` |
| CHG-05 | 修改 | `test/unit/*`、`scripts/e2e.mjs` | registry/snapshot/VM 测试；mock 改 `windows` + `pricingLinks` |

## 四、不改动 / 边界

- `BND-01`：不新增 provider、不做第三方插件系统、不拆 per-provider 文件。
- `BND-02`：不改 `src/pricing.js` 算法、`src/store.js` 存储格式、UI 视觉与预算/费用口径。
- `BND-03`：不改 `docs/plan/active/feature_token_dash.md` 的历史结论；本 plan 独立。

## 五、验收要点

| 项 | 来源 | 验证方式 | 结果 |
|---|---|---|---|
| registry 元数据与旧表同值 | REQ-01 | 新增 3 组 providers 单测：五家 label/currency/defaultModel/prefix/pricingUrl | ✅ |
| VM 输出 `pricingLinks` 且 UI 无 `LINKS` | REQ-02 | core 单测 5 条 + `grep LINKS client.js` 为空 + E2E 链接数 5 | ✅ |
| snapshot 边界 | REQ-03 | adapters `toSnapshot` 测试：`windows`/`error`/`quotaError`/`status`；无 `_error`/`plans` | ✅ |
| 行为回归 | REQ-04 | `npm test` 53/53；`npm run e2e` pass | ✅ |
| 发布 | — | 1.0.6 tag、npm latest、GitHub Release body = CHANGELOG | ✅ |

## 八、决策记录

| # | 问题 | 定案 |
|---|---|---|
| Q1 | 是否拆 per-provider 文件 | 否；五家规模用单一 descriptor 表，避免过度抽象 |
| Q2 | 是否改 pricing/存储 | 否；本轮只收口边界 |
| Q3 | `plans` 是否全链路改名 | 是；adapter→VM→UI→E2E 统一 `windows`，VM 可临时兼容旧输入 |
| Q4 | 价格链接是否只列已配置 | 否；保持当前五家全列行为 |

## 九、自测反馈台

- 2026-11-02：1.0.6 发布完成——tag `v1.0.6`，npm `latest=1.0.6`，GitHub Release body 与 1.0.6 正式块一致，asset `dsh-token-dash-1.0.6.tgz` 已上传。施工与验证记录见 checklist。

