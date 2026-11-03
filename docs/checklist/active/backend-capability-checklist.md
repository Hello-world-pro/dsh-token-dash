# 后端能力清单

> 状态：已对齐（2026-11-04）<br>
> 关联：[`design.md`](../../design.md)、[`ui-reference-checklist.md`](ui-reference-checklist.md)<br>
> 定位：宿主侧「取什么数、怎么失败、怎么扩展」，是 `design.md` 的施工前细化；不含实现步骤与测试用例。<br>
> 编号说明：v2 重排（2026-11-04），删去已具备与无效项，`B*` / `C*` 连续重编。

## 1. 取数与缓存

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B1 | 双 TTL 缓存 | 全部 provider 成功 60s；任一失败 10s；空结果不写 TTL | P0 |
| B2 | 在途合并 | TTL 过期时若已有刷新在途，复用同一 Promise，`finally` 清空 | P0 |

| # | 契约 | 定义 |
|---|---|---|
| C1 | 缓存键 | 以 `profile + prefs` 为界；`prefs` 变更即失效 |
| C2 | 手动刷新 | `POST /providers/refresh` 直连上游，不受 TTL 限制 |
| C3 | 不缓存 usage | 内存聚合毫秒级，`/usage` 不做区间缓存 |

## 2. 错误与可诊断

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B3 | 错误枚举 | 补 `unconfigured` / `upstream`，与现有 `http / timeout / network / parse` 并列 | P1 |
| B4 | 软态未配置 | `unconfigured` 不算刷新失败：不计入 `error`、不触发重试 | P1 |
| B5 | `probe` 清单 | `summary.probe.misses = [{ id, label, reason }]`，`reason ∈ none \| error \| hidden` | P1 |

| # | 契约 | 定义 |
|---|---|---|
| C4 | `error.kind` 取值 | `http`（带 `status`）/ `timeout` / `network` / `parse` / `unconfigured` / `upstream`（带业务码） |
| C5 | `unconfigured` 语义 | 凭据缺失，不是故障；UI 显示「未配置凭据」 |
| C6 | `upstream` 语义 | HTTP 通但业务失败（`success:false`、`code!=0`）；只留业务码，不带响应体 |
| C7 | `probe` 约束 | 只允许三个字段；`label` 由 `providerLabel` 生成；前端不出现 provider id |
| C8 | `probe` 兼容 | 缺失时 UI 退回单句空态，旧调用方不受影响 |

## 3. 安全

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B6 | 路由安全门 | 优先 `connection.requestRejection(req)`；无该服务时校验 `remoteAddress` + `host` + `origin`，不通过返回 401/403 | P1 |
| B7 | 脱敏收口 | 错误消息、`source`、`raw` 三处统一脱敏；响应 JSON 不含密钥片段 | P1 |

| # | 契约 | 定义 |
|---|---|---|
| C9 | 现状 | 插件路由经宿主 `webServer.register` 挂载；**当前代码无鉴权判断**（依据：e2e 脚本内无 token 的 `PUT /prefs` 返回 200），本机任意进程可访问 |
| C10 | 错误体 | `{ ok:false, error:'unauthorized' \| 'forbidden' }`，不泄漏内部字段 |
| C11 | 凭据 | 仅经 `ctx.credentials`；不读 `~/.dsh/.credentials.yaml`；不落盘 |

## 4. Provider 扩展

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B8 | 声明式额度源表 | 现有五家 endpoint / 凭据 / 校验 / 归一化收进一张表，`readProviders` 按表迭代，删除逐家 if 分支；新增家只加表行 | P1 |
| B9 | 凭据两型 | `bearer`（默认）与 `oauth-reuse`（复用宿主 token）；不支持 Cookie 与本机登录文件 | P1 |
| B10 | preflight 钩子 | 取数前可选调用 `preflight(secret, baseUrl)` 取 query 片段；异常返回空串（软失败），主请求继续 | P1 |
| B11 | 窗口归一化 | `windows` 长度 0–3、`key ∈ 5h/week/month`、`usedPercent ∈ [0,100]`；缺窗不生成占位对象 | P1 |
| B12 | OpenCode Go | `GET https://opencode.ai/zen/go/v1/usage`，bearer `OPENCODE_GO_API_KEY`；404/405 回落 `api/v1/usage` | P1 |
| B13 | Command Code | `GET https://api.commandcode.ai/alpha/billing/credits`，bearer；先 preflight 取 `orgId`；解析 `credits` + `windowLimits.fiveHour / weekly` | P2 |

| # | 契约 | 定义 |
|---|---|---|
| C12 | 源表形状 | `{ id, baseUrl, path, credentialRef, auth, headers?, validate?, normalize }`；`auth ∈ bearer \| oauth-reuse` |
| C13 | preflight 契约 | `async preflight(secret, baseUrl) → string`；返回 query 片段，任何异常返回 `''` |
| C14 | 新增 provider 的 VM 兼容 | 不改 `SummaryVM` 顶层字段；只新增 `providers[]` 一项；`pricingLinks` 缺省 `[]` |
| C15 | 接入落点 | 源表 1 行 + `normalize` / `readSecret` / `preflight` 三个可选钩子 + 1 份 fixture；`adapters.js` 不新增 if 分支 |

## 5. 附加路由

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B14 | `active` 参数 | `GET /summary?active=<raw>`；`normalizeProvider(raw)` 命中五家则覆盖 `currentProviderId`，未命中保持账本值 | P1 |
| B15 | 仓库元信息 | `GET /token-dash/api/repo` → `{ ok, stars, fetchedAt }`；固定仓库、6h 缓存 + ETag、403/429 视作失败并缓存 10 分钟 | P3 |

| # | 契约 | 定义 |
|---|---|---|
| C16 | `active` 校验 | 仅接受字符串，长度与字符集按现有别名规则；不写存储、不落日志明文 |
| C17 | `repo` 响应 | 成功 `{ ok:true, stars, fetchedAt }`，失败 `{ ok:false }`；不返回 GitHub 原始响应体 |

## 6. 不做

| # | 项目 | 原因 |
|---|---|---|
| N1 | Cookie 抓取型 provider（百炼 Token Plan、小米 MiMo） | 凭据会过期且需手动从控制台复制，违反「凭据只走宿主」 |
| N2 | 自定义 `baseUrl` / `credentialRef` 覆盖 | 边界冲突；开放须先做白名单 |
| N3 | 读本机 `~/.codex/auth.json` | 违反 C11；要做须单独立项并加显式开关 |
| N4 | 直读 `session*.jsonl.zstd` | 已有 `sessionPersistence`，自解析跨版本脆 |
| N5 | `/usage` 区间缓存 | 内存聚合毫秒级 |
| N6 | 1s 轻路由轮询 | UI 用可见性节律 + 打开即刷覆盖 |
| N7 | provider 插件化 / per-provider 拆文件 | 七家规模用单文件源表更划算 |

## 7. 改动范围与顺序

> 量级：**S** ≤30 行、**M** 30–80 行、**L** ≥80 行（含新增文件）。只给范围，不给 diff。

### P0（只动 `index.js`）

| # | 落点 | 大致改动 | 量级 |
|---|---|---|---|
| B1 | `providerCache`（164）、`refreshProviderCache`（251）、TTL 判断（282） | 单档 30s 拆成成功 60s / 失败 10s；缓存补 `lastOk` / `lastFail` | M |
| B2 | `refreshProviderCache`（251） | 加 `inflight` Promise，结束后清空 | S |

### P1 - P3（5 个现有文件 + 1 个新文件）

| # | 文件 | 落点 | 大致改动 | 量级 |
|---|---|---|---|---|
| B3 | `src/adapters.js` | 错误归一（110–115） | 枚举补两态，保留 `status` 与业务码 | S |
| B4 | `src/adapters.js` + `src/core.js` | `toSnapshot`（231）、`buildSummary`（402） | `unconfigured` 不计失败、不重试，只进 `probe` | S |
| B5 | `src/core.js` + `src/adapters.js` | `buildSummary`（402）、`readProviders`（264） | adapters 收集 `misses`，core 输出 `probe` | M |
| B6 | `index.js` | `/summary` handler（274–281） | 先跑 `requestRejection`，无则三重校验 | M |
| B7 | `index.js` + `src/adapters.js` | 错误消息构造处 | 统一脱敏三处出口 | S |
| B8 | **新增** `src/quota-sources.js` + `src/adapters.js` | 新文件；`readProviders`（264） | 五家收进源表，按表迭代 | L |
| B9 | `src/adapters.js` + `index.js` | 新增 `resolveSecret` | 两型凭据，仍走 `ctx.credentials` | M |
| B10 | `src/adapters.js` | `readProviders`（264） | 取数前 preflight，异常吞掉 | S |
| B11 | `src/adapters.js` | `toSnapshot`（231） | 窗口长度 / `key` / 百分比夹取 | S |
| B12 | `src/quota-sources.js` + `src/providers.js` + `tools/mock/fixtures.mjs` | 源表一行 + registry + fixture | OpenCode Go 端点、回落、前缀币种 | M |
| B14 | `index.js` + `src/core.js` | `/summary` handler（281）、`buildSummary`（402） | 透传 `active`，命中五家才覆盖 `currentProviderId` | M |
| B13 | `src/quota-sources.js` + `src/providers.js` + `tools/mock/fixtures.mjs` | 源表一行 + registry + fixture | Command Code：credits 端点、preflight 取 `orgId`、两窗解析 | M |
| B15 | `index.js` | 路由注册处（新增分支） | `/repo` 走固定仓库，6h 缓存 + ETag | S |

### 顺序依赖

```text
B8（源表） ──┬─→ B12（OpenCode Go）
             ├─→ B10（preflight）──→ B13（Command Code）
             └─→ B9（凭据两型）

B1 / B2 独立，可并行先做
B3 / B4 → B5（probe 依赖错误分类）
B6 独立，但改所有请求入口，建议单独一轮验证
B13（Command Code）依赖 B8 + B10 + B9，排在 B12 走查通过之后
```

## 8. 可观察结果

| 能力 | 应观察到 |
|---|---|
| B1 | 一次失败后 10s 内可恢复；恢复前不重复打满 60s 缓存 |
| B2 | 并发请求同一时刻只产生一次上游调用 |
| B3 / B4 | 日志出现 `unconfigured` / `upstream`，且无响应体原文；未配置不触发重试 |
| B5 | `/summary` 含 `probe.misses`，`none / error / hidden` 三态可复现 |
| B6 | 非回环地址与伪造 Origin 均 401/403，正常会话不受影响 |
| B7 | 错误文案与 `source` 中不出现 Key 片段 |
| B8 | 新增一家只改源表与三个钩子，`adapters.js` 不出现新 if 分支 |
| B10 | `whoami` 断网时仍返回 credits，日志记 `preflight=soft-fail` |
| B12 | 三窗正常渲染；缺月窗时 UI 显示 `—` 而非补 0 |
| B14 | 带已知别名时 `currentProviderId` 跟随，未知别名与不带参一致 |
| B15 | 6h 内不重复请求 GitHub；断网时限流时 UI 只显示 `★` |

## 附录 A · 参考来源

| 档案 | 用途 |
|---|---|
| [`shy3130-dsh-quota.md`](../../reference/shy3130-dsh-quota.md) | 声明式 `SOURCES`（`index.js:250`）、双 TTL、在途合并、`normalizeOpencode`（`149`）、Kimi `readSecret`（`266`） |
| [`invisiblesirius-dsh-quota-dashboard.md`](../../reference/invisiblesirius-dsh-quota-dashboard.md) | `PROVIDERS` 注册表（`1009`）、`commandCodeParse`（`758`）、`commandCodePreflight`（`777`）、`commandCodeWindowRow`（`728`） |
| [`2026heshao-dsh-armory.md`](../../reference/2026heshao-dsh-armory.md) | 仅参考路由与静态元信息组织；与额度取数无关 |

## 附录 B · 已具备 / 不重复实现

| 项 | 现状 |
|---|---|
| 峰值 / 空闲分档计价 | 已具备（`src/core.js:35`、`src/core.js:46`） |
| 会话日志回填 | 已用 `sessionPersistence`（`src/collect.js:63-103`） |
| host 白名单 | 无自定义入口，暂无需要 |
