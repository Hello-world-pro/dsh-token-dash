# 后端 Provider 覆盖与取数可靠性

> 状态：待验收<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（已实施，自动测试通过；真机 provider 待验收）<br>
> 关联逻辑根：`dsh-token-dash`（`src/`、`index.js`）<br>
> 关联资料：[`ui-design.md`](../../../ui-design.md) v3.3、[`design.md`](../../../design.md)、第三方参考 [`shy3130-dsh-quota.md`](../../../reference/shy3130-dsh-quota.md) / [`invisiblesirius-dsh-quota-dashboard.md`](../../../reference/invisiblesirius-dsh-quota-dashboard.md)、旧能力清单 [`backend-capability-checklist.md`](../../../checklist/archived/backend-capability-checklist.md)

## 〇、前置依赖 / 代码探查事实

### 已明确

- 当前 `src/providers.js` 只有 5 家：`deepseek-official` / `zhipu` / `moonshot` / `openrouter` / `qwen`（`providers.js` registry）。
- 当前 `src/adapters.js` 的 `readProviders` 用 `Promise.allSettled([deepseek, glm, kimi, openrouter, qwen])` 固定 5 路，没有声明式源表；`src/quota-sources.js` 不存在。
- 前端 fixtures 已有 7 家：多出 OpenCode Go 与 Command Code；P3 卡片/窗口按 7 家设计，但真实后端不会返回这两家。
- `index.js` 的 provider 缓存是单一 `PROVIDER_TTL = 30000`，无成功/失败双 TTL，无 in-flight 合并。
- `readProviders` 已产出 `misses`（`none / error / hidden`）；`toSnapshot` 已有 `unconfigured` 状态，但没有完整 `upstream` 枚举与统一 `probe` 结构。
- `requestRejection` 未使用；路由安全与响应脱敏尚未统一（`index.js` 仅日志脱敏）。
- `resolveKey(ctx, names)` 已通过宿主 `credentials.resolve(name)` 取 Key；尚无 `bearer` / `oauth-reuse` 两型抽象。
- 单测已有 `test/unit/adapters.test.mjs` / `providers.test.mjs`；e2e 使用 7 家 fixture，不代表真实适配器已支持。

### 待对齐

- OpenCode Go 的 404/405 回退路径是否与当前账号区域一致。
- Command Code 的 `orgId` preflight 在桌面宿主上能否稳定拿到。
- `requestRejection` 是否在所有桌面宿主版本可用；不可用时的回环校验是否影响 e2e。

## 一、需求

| ID | 优先级 | 需求 / 边界 / 风险 | 成功信号 |
|---|---|---|---|
| REQ-01 | P0 | 后端覆盖 7 家：现有 5 家 + OpenCode Go + Command Code | `/summary.providers` 可返回 7 家；无 Key 的 provider 不伪造数据 |
| REQ-02 | P0 | 新增 `src/quota-sources.js` 声明式源表，`readProviders` 按表迭代 | 新增 provider 只加表行 + parse，不改 `readProviders` 主体 |
| REQ-03 | P0 | 凭据两型：`bearer` 与 `oauth-reuse`；统一走 `credentials.resolve` | 不读环境变量、不读本机登录文件 |
| REQ-04 | P1 | `preflight` 钩子：取数前拿 query 片段；失败软返回空串 | Command Code 能带 `orgId`；preflight 失败不阻断主请求 |
| REQ-05 | P0 | 窗口归一化：0–3 个，`key ∈ 5h/week/month`，百分比夹取，缺窗不补占位 | 两窗 provider 不出现 `month` 空对象 |
| REQ-06 | P0 | 缓存：成功 60s / 失败 10s，按 provider 独立；in-flight 合并 | 并发请求只打一次上游；失败后 10s 可恢复 |
| REQ-07 | P1 | 错误模型：`unconfigured` 不计刷新失败；补 `upstream`；`probe.misses` 可诊断 | 未配置 provider 不触发 degraded / 重试 |
| REQ-08 | P1 | 路由安全：`requestRejection` 优先，回环 `remoteAddress + host + origin` 兜底 | 非回环请求被拒；e2e 回环可用 |
| REQ-09 | P1 | 脱敏：错误消息 / `source` / `raw` 三处统一；响应不含密钥片段 | 日志与 `/summary` 不出现 Key |
| REQ-10 | P1 | OpenCode Go：`/zen/go/v1/usage`，404/405 回落 `/api/v1/usage`；bearer | 三窗正常；无 Key 时 `unconfigured` |
| REQ-11 | P2 | Command Code：`/alpha/billing/credits` + `windowLimits.fiveHour/weekly`，preflight `orgId` | credits + 两窗可解析 |
| REQ-12 | P0 | 契约测试：7 家 fixture 喂 parse；不联网 | `npm test` 覆盖 7 家窗口/余额/错误分支 |
| REQ-13 | P1 | e2e 契约：mock `/summary` 仍 7 家；真实后端字段不缺失 | e2e 通过，字段与 fixtures 对齐 |
| REQ-14 | P2 | 文档：能力矩阵、日志速查、provider 扩展指南 | `docs/design.md` / `reference` 同步 |
| REQ-15 | P1 | 订阅重查覆盖全部 subscription 源 | 重新检测按钮更新 GLM / Kimi / OpenCode Go / Command Code |
| BND-01 | 边界 | 不改 `/summary` / `/usage` / `/prefs` 字段契约；不新增前端字段 | 前端无需改动即可消费 |
| BND-02 | 边界 | 不支持 Cookie、本机登录态、Codex 会话文件 | 与旧清单「不做」一致 |
| BND-03 | 边界 | 不引入 provider 插件系统 / DI；单文件源表 + 可选钩子 | 依赖不新增 |
| BND-04 | 边界 | 不做 `/repo`、star 计数、组织用量类接口 | 范围只到 7 家 |
| RSK-01 | 风险 | OpenCode / Command Code 上游 schema 变化 | fixture 覆盖已知形状；解析失败降级 `parse` 错误，不伪造 0 |
| RSK-02 | 风险 | 源表重构导致现有 5 家回归 | 保留原 parse 函数；先表驱动 2 家，再迁 5 家 |
| RSK-03 | 风险 | 7 家并发打上游 | in-flight + 双 TTL；单家失败隔离 |
| RSK-04 | 风险 | 安全门误伤 e2e / 回环 | `requestRejection` 优先；e2e 走回环 |

## 二、设计方案

### 2.0 结构总览与第三方取舍

```text
index.js
  /summary → refreshProviderCache()
    → readProviders(ctx, prefs)            ← 现在固定 5 路
    → buildSummary()                       ← 输出 ProviderSnapshot[]

目标：
  src/quota-sources.js  SOURCES[]          ← 新增：声明式源表
  src/adapters.js        readProviders()   ← 按 SOURCES 迭代
  index.js               providerCache     ← 每源 { at, ok, promise, data }
```

| 维度 | shy3130-dsh-quota | invisiblesirius-dsh-quota-dashboard | 本方案 |
|---|---|---|---|
| 覆盖 | 窄而深，5 家 | 广覆盖，15+ 家 | 7 家，优先正确性 |
| 源表 | `SOURCES` 表 + 每源 parse | `PROVIDERS` 数组 + 统一 `runQuery` + `def.parse` | 采用声明式表 + `parse` 钩子 |
| 缓存 | 每源 55s / 10s + in-flight | 无服务端缓存，靠前端轮询 | **采用 shy 的每源双 TTL + in-flight** |
| 凭据 | Key / OAuth | 显式入参 → 凭据服务 → 环境变量 → 状态文件 | **只保留凭据服务 + 两型**，拒绝环境变量/文件 |
| 安全 | `requestRejection` + 回环三重校验 | 未强调 | 采用 shy 方案 |
| 扩展 | 表行 + 解析 | 表行 + 解析 + ready[] | 表行 + 解析；不做 ready[] |
| 不做 | — | Cookie / 组织用量 / 自定义 URL | 全部不做 |

### 2.1 取数流程

```text
现状：
readProviders()
  → Promise.allSettled([deepseek, glm, kimi, openrouter, qwen])
  → toSnapshot → out.misses
  → index.providerCache（全局 30s）
  → buildSummary

目标：
SOURCES[]（7 行）
  → resolveSecret(row.credential)          // bearer / oauth-reuse
  → row.preflight?.(secret)                // 软失败 → ''
  → fetch(row.quota?.url / row.balance?.url)
  → row.quota.parse(body) / balance.parse
  → normalizeWindows（0–3、夹取、缺窗不补）
  → toSnapshot
  → per-source cache { ok: 60s, fail: 10s, inflight }
  → merge → buildSummary
```

| 节点 | 所在端 | 职责 |
|---|---|---|
| `SOURCES[]` | host | 7 家 endpoint / 凭据引用 / auth / parse / preflight |
| `resolveSecret` | host | 两型凭据解析；未配置返回 `unconfigured` |
| `readProviders` | host | 按表迭代、失败隔离、汇总 `misses` |
| `providerCache` | host | 每源成功/失败 TTL + in-flight |
| `buildSummary` | host | 不变：输出 `ProviderSnapshot` / `SummaryVM` |

### 2.2 关键签名 / 字段

| 层 | 名称 | 备注 |
|---|---|---|
| 源表 | `QuotaSource { id, providerId, kind, currency, credential, quota?, balance?, preflight?, read? }` | `read?` 保留给 DeepSeek 账号钱包、Kimi 双路径等特例 |
| 凭据 | `credential: { type: 'bearer' \| 'oauth-reuse', refs: string[] }` | `refs` 按优先级；全部未命中 → `null` |
| 配额 | `quota: { url, headers?, parse(body) }` | `parse` 返回 `windows[]`，不返回占位窗 |
| 余额 | `balance: { url, headers?, parse(body) }` | 返回 `{ amount, currency, status }` |
| 缓存 | `Map<id, { at, ok, promise, data }>` | `ok` 决定 60s / 10s；`promise` 清除于 finally；由 `index.js` 持有并传入 |
| 取数入口 | `readProviders(ctx, prefs, cache)` | adapters 内按源查/写缓存，index 不再整包缓存 |
| 快照 | `ProviderSnapshot` | 字段不变；`windows` 0–3 |

### 2.3 数据约束

- `windows` 长度 0–3；`key` 只允许 `5h` / `week` / `month`；`usedPercent` 夹到 0–100。
- 缺窗不生成 `{ key:'month', usedPercent:null }`；前端按实际长度渲染。
- 余额 `status`：`ok / unconfigured / error / unsupported`；`unconfigured` 不进 degraded。
- OpenCode 404/405 才回落，其他 4xx/5xx 按错误处理。
- Command Code `credits` 与 `windowLimits` 分开解析；缺 `orgId` 时 preflight 返回空串，主请求继续。

### 2.4 关键陷阱

| 项 | 约束 |
|---|---|
| Kimi 双路径 | 订阅配额成功走 `kind=subscription`；失败且有普通 Key 才回落余额，不能同时输出两条 |
| DeepSeek 账号钱包 | 宿主 `deepseekAccount` 可用时优先，API Key 兜底；不要重复请求 |
| OpenRouter credits | `total_credits - total_usage`，不把 `usage` 当余额 |
| OpenCode 回退 | 仅 404/405 回落 B12 的 `api/v1/usage`；回退失败保留原始错误 |
| Command Code | `orgId` 只进 query，不进日志；preflight 异常吞掉 |
| GLM endpoint | 保留现有 `bigmodel.cn` 路径；参考项目用 `open.bigmodel.cn`，本 plan 不切换域名 |
| 缓存重置 | prefs 保存 / 导入后必须清空对应源缓存，否则新预算不会即时反映 |
| 缓存归属 | per-source TTL 在 adapters 内执行，index 只持有 Map；否则 `readProviders` 整包缓存无法按源失效 |
| 安全门返回 | `requestRejection` 可能返回 Response 或 `undefined`；返回非空必须直接返回，不能继续路由 |
| Kimi 双路径 | 订阅配额优先；`oauth-reuse` 与 `KIMI_API_KEY` 都失败才回落 API 余额，不能同时返回两条 |
| e2e 安全门 | 回环地址放行；无 `requestRejection` 时三重校验，不因缺少 token 拒绝 |
| 7 家并发 | 每源独立 cache + in-flight；总请求不因 `Promise.all` 无限放大 |

### 2.5 日志与可观测

- `adapter.<id>`：`quota.ok` / `quota.fail` / `balance.ok` / `balance.error`，只记状态、窗口数、错误分类。
- `provider`：`probe.miss` 输出 `misses[]`；`cache.hit` / `cache.refresh` 记 TTL 档位。
- 不记 Key、orgId、响应体原文；错误 `upstream` 带 `status`，不带 body。

## 三、实现要点

### 3.0 开发改动总览（计划）

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01 | 新增 | `src/quota-sources.js` | `SOURCES[]` 7 行：endpoint、credential、quota/balance parse、preflight |
| CHG-02 | 修改 | `src/adapters.js` · `readProviders` / `readSubscriptions` | `readProviders(ctx, prefs, cache)` 按 `SOURCES` 迭代并读写每源缓存；`readSubscriptions` 只跑 `kind=subscription` 的行 |
| CHG-03 | 修改 | `src/providers.js` | 注册 `opencode-go` / `command-code`（名称、币种、默认模型、价格页） |
| CHG-04 | 修改 | `index.js` · `providerCache` | 全局 30s → `Map<id, entry>` 并传入 `readProviders`；成功/失败 TTL 与 in-flight 在 adapters 内执行；prefs 保存 / 导入后清空 Map |
| CHG-05 | 修改 | `src/adapters.js` · 错误归一 | 补 `upstream`；`unconfigured` 不计失败；`misses` 保留 |
| CHG-06 | 修改 | `src/adapters.js` · `resolveSecret` | `bearer` / `oauth-reuse` 两型；统一 `credentials.resolve` |
| CHG-07 | 新增 | `src/adapters.js` · `preflight` | Command Code `orgId`；异常返回 `''` |
| CHG-08 | 修改 | `index.js` · 路由 | `requestRejection` 优先；回环三重校验；失败 401/403 |
| CHG-09 | 修改 | `index.js` / `src/adapters.js` | 错误消息 / `source` / `raw` 统一脱敏 |
| CHG-10 | 新增 | `src/adapters.js` · `parseOpenCodeUsage` | 三窗解析；404/405 回退 |
| CHG-11 | 新增 | `src/adapters.js` · `parseCommandCodeCredits` | credits + fiveHour/weekly |
| CHG-12 | 修改 | `tools/mock/fixtures.mjs` | 7 家 fixture 与真实字段对齐（只测试，不生产） |
| CHG-13 | 修改 | `test/unit/adapters.test.mjs` | 7 家 parse、缺窗、404 回退、preflight、未配置 |
| CHG-14 | 修改 | `scripts/e2e.mjs` | `/summary` 契约：7 家字段、窗口数、错误分支 |
| CHG-15 | 修改 | `docs/design.md` / `docs/reference/*` | 源表、缓存、安全、provider 扩展指南 |

### 3.1 改动清单（待实施）

#### CHG-01 · `src/quota-sources.js`（新增文件）

```js
// 新增文件：只描述来源，不做 IO
export const SOURCES = [
  { id: 'deepseek-official', kind: 'api', currency: 'CNY', read: readDeepseek },
  { id: 'zhipu', kind: 'subscription', currency: 'CNY', credential: { type: 'bearer', refs: ['ZAI_CODING_CN_API_KEY'] }, quota: { url: GLM_QUOTA, parse: parseGlmQuota } },
  { id: 'moonshot', kind: 'subscription', currency: 'CNY', read: readKimi },
  { id: 'openrouter', kind: 'api', currency: 'USD', read: readOpenRouter },
  { id: 'qwen', kind: 'api', currency: 'CNY', read: readQwen },
  { id: 'opencode-go', kind: 'subscription', currency: 'USD', credential: { type: 'bearer', refs: ['OPENCODE_GO_API_KEY'] }, quota: { url: OPENCODE_USAGE, parse: parseOpenCodeUsage, fallbackUrl: OPENCODE_USAGE_FALLBACK } },
  { id: 'command-code', kind: 'subscription', currency: 'CNY', credential: { type: 'bearer', refs: ['COMMAND_CODE_API_KEY'] }, preflight: commandCodePreflight, quota: { url: COMMANDCODE_CREDITS, parse: parseCommandCodeCredits } },
]
```

#### CHG-02 · `src/adapters.js`

- `readProviders`：改为 `Promise.allSettled(SOURCES.map((source) => readSource(ctx, prefs, source)))`；`readSource` 优先 `source.read`，否则走通用 fetch + parse。
- `readSubscriptions`：按 `SOURCES` 中 `kind === 'subscription'` 的行重查（GLM / Kimi / OpenCode Go / Command Code），不触发 API 余额请求。

```diff
- const results = await Promise.allSettled([deepseek(ctx), glm(ctx, prefs), kimi(ctx, prefs), openrouter(ctx), qwen(ctx)])
+ const results = await Promise.allSettled(SOURCES.map((source) => readSource(ctx, prefs, source)))
```

#### CHG-04 · `index.js` · `providerCache`

- 全局 `providerCache` 改为 `Map<id, { at, ok, promise, data }>`；成功 60s、失败 10s。
- `refreshProviderCache` 对每个源：命中 TTL 直接用；过期时复用 `entry.promise`，`finally` 清空。

```diff
- const PROVIDER_TTL = 30000
+ const PROVIDER_TTL_OK = 60000
+ const PROVIDER_TTL_FAIL = 10000
```

#### CHG-08 · `index.js` · 路由安全门

```diff
+ const rejection = await ctx.get?.('connection')?.requestRejection?.(req)
+ if (rejection !== undefined && rejection !== null) return rejection
+ // 无 requestRejection 时：remoteAddress 必须是回环，且 host / origin 匹配
```

#### CHG-10 · `src/adapters.js` · OpenCode

```js
export function parseOpenCodeUsage(body) {
  // windows: fiveHour -> 5h, weekly -> week, monthly -> month（以实际返回为准）
  // 只输出存在的窗口，百分比夹取，缺窗不补
}
```

## 四、不改动 / 边界

- `BND-01`：不改 `/summary` / `/usage` / `/prefs` 字段；前端零改动。
- `BND-02`：不做 Cookie、本机登录态、Codex 会话文件、组织用量、自定义 URL。
- `BND-03`：不引入 provider 插件系统 / DI；源表保持单文件。
- `BND-04`：不做 `/repo` / star 计数。
- 不改 P1/P2/P3 布局、颜色、间距；本 plan 只影响后端数据。

## 五、验收要点

| 项 | 来源 | 验证方式 | 结果 |
|---|---|---|---|
| 7 家 provider 均可返回正确 `kind` / `currency` | REQ-01 | fixture 驱动 `/summary` 契约 | 待验证 |
| 新增 provider 只改源表 + parse | REQ-02 | 代码走查：`readProviders` 无 provider 分支 | 待验证 |
| `bearer` / `oauth-reuse` 两型可用，未配置不报错 | REQ-03 | 单测 + 未配置 provider | 待验证 |
| 成功 60s / 失败 10s + in-flight | REQ-06 | 并发请求计数 + 失败恢复 | 待验证 |
| `unconfigured` 不触发 degraded；`upstream` 可诊断 | REQ-07 | 单测 + 日志 | 待验证 |
| 非回环请求被拒；e2e 回环可用 | REQ-08 | 路由单测 / e2e | 待验证 |
| Key / orgId 不出现在日志与响应 | REQ-09 | 脱敏断言 | 待验证 |
| OpenCode 三窗 + 404 回退 | REQ-10 | fixture 两版响应 | 待验证 |
| Command Code credits + 两窗 | REQ-11 | fixture | 待验证 |
| 7 家解析单测 | REQ-12 | `npm test` | 通过（77 通过 / 1 跳过） |
| e2e 7 家字段与 fixtures 对齐 | REQ-13 | `npm run e2e` | 通过 |
| 重新检测覆盖 4 家订阅 | REQ-15 | mock `/providers/refresh` + 缓存 | 通过 |

**验证记录（2026-11-05）**

- `npm test`：77 通过 / 1 跳过 / 0 失败；
- `npm run e2e`：UI assertions passed；
- 已落地：源表、每源缓存、7 家 registry、OpenCode / Command Code 解析、安全门、订阅重查；
- 真机 OpenCode Go / Command Code 尚未用真实 Key 跑通，保留 `待验收`，不得直接归档。

## 七、日志速查

- `adapter.<id>`：`quota.ok` / `quota.fail` / `balance.ok` / `balance.error` / `cache.hit` / `cache.refresh`
- `provider`：`probe.miss`（`misses[]`）
- 只记状态、窗口数、错误分类；不记 Key / orgId / body。

## 八、决策记录

| # | 问题 | 定案 | 依据 |
|---|---|---|---|
| D1 | 覆盖优先还是广覆盖 | 7 家，先正确性 | shy3130 窄而深；invisiblesirius 广覆盖但无统一缓存 |
| D2 | 是否采用声明式源表 | 是，表行 + parse + preflight | 两家参考都用表；本仓 B8 已列 |
| D3 | 是否采用每源缓存 + in-flight | 是 | shy3130 55s/10s + in-flight；本仓 B1/B2 |
| D4 | 凭据是否级联到环境变量/文件 | 否，只走宿主凭据服务 + 两型 | BND-02；invisiblesirius 的级联范围超出本仓边界 |
| D5 | 是否做 ready[] / 一键启用 | 否 | 当前 UI 无此入口 |
| D6 | 安全门是否用 requestRejection | 是，回环兜底 | shy3130 实现；e2e 回环 |
| D7 | 缓存放在 index 还是 adapters | adapters（index 传 Map） | 只有 adapters 知道源边界；index 整包缓存无法按源失效 |
| D8 | 是否全表声明式 | 5 家 legacy 用 `read`，2 家新源用声明式 | 保留 DeepSeek 钱包 / Kimi 双路径特例，避免一次重构过大 |

## 九、自测反馈台

（暂无）

## 十、迭代记录

### 第一轮 · 代码事实对照

- Command Code 的 repo 实际 id 是 `command-code`、币种 `CNY`（fixture），不是 `commandcode` / USD；已修正。
- `readSubscriptions` 原只重查 GLM / Kimi；新增 REQ-15 / CHG-02，改为按订阅源迭代。
- 缓存当前在 `index.js` 整包；改为 adapters 按源读写、index 传 Map，否则无法按源失效。
- prefs 保存 / 导入后会重置缓存；CHG-04 补上该路径。
- GLM 现有域名 `bigmodel.cn` 与参考项目 `open.bigmodel.cn` 不同，本 plan 不切换。

### 第二轮 · 第三方参考对照

- shy3130 用 55s / 10s 每源缓存 + in-flight；本仓 B1 定 60s / 10s，采纳结构、不照搬 55s。
- invisiblesirius 的 `ready[]`、环境变量/状态文件级联、Cookie / 组织用量不进入本 plan；只采纳声明式表 + `runQuery` 思路。
- OpenCode 采用 B12 的 404/405 回退；Command Code 采用 preflight `orgId` + credits/两窗解析。
- 缓存实现位置定为 adapters；安全门 `requestRejection` 返回非空即终止。

### 第三轮 · 实施前代码核对

- 现有错误测试固定 `kind: 'http'`，`upstream` 不改成新 kind，而是 `{ kind:'http', status, upstream: status>=500 }`，避免破坏已有日志语义。
- `providers.js` 的 `PROVIDER_ORDER` 同时驱动 `pricingLinks` 和默认模型表；追加 2 家后单测 `pricingLinks.length` 必须从 5 改 7。
- `readProviders` 的缓存改由 adapters 接收 `Map`；`readSubscriptions` 不能用缓存，否则「重新检测」无效。
- `index.js` 的 prefs 保存 / 导入 / provider refresh 三处都要清 Map。
- Command Code 的真实响应字段未在参考文档给出完整样例，解析按 `credits` + `windowLimits.fiveHour/weekly` 容错，fixture 先固化；真机失败只降级 `parse`，不伪造 0。
- 安全门必须先放行回环，否则现有 e2e（无 token）会全挂；`requestRejection` 返回 Response 时直接返回。
