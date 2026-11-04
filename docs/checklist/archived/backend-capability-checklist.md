# 后端能力清单（归档）

> 状态：已归档（2026-11-04）；前端侧已交付 `1.2.0-local.2`，后端项按本表继续排期<br>
> 关联：[`design.md`](../../design.md)、[`ui-design.md`](../../ui-design.md) v3.1、归档前清单 [`ui-reference-checklist.md`](ui-reference-checklist.md)<br>
> 定位：宿主侧「取什么数、怎么失败、怎么扩展」；不含实现步骤与测试用例<br>
> 说明：行号与现状基于 2026-11-04 代码；`B*` / `C*` 编号沿用，B15 已降级为「暂不需要」

## 1. 取数与缓存

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B1 | 双 TTL 缓存 | 全部 provider 成功 60s；任一失败 10s；空结果不写 TTL | P0 |
| B2 | 在途合并 | TTL 过期时复用同一 in-flight Promise，`finally` 清空 | P0 |

| # | 契约 | 定义 |
|---|---|---|
| C1 | 缓存键 | 以 `profile + prefs` 为界；`prefs` 变更即失效 |
| C2 | 手动刷新 | `POST /providers/refresh` 直连上游，不受 TTL 限制 |
| C3 | 不缓存 usage | 内存聚合毫秒级，`/usage` 不做区间缓存 |

## 2. 错误与可诊断

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B3 | 错误枚举 | 补 `unconfigured` / `upstream`，与 `http / timeout / network / parse` 并列 | P1 |
| B4 | 软态未配置 | `unconfigured` 不算刷新失败：不计 `error`、不触发重试 | P1 |
| B5 | `probe` 清单 | `summary.probe.misses = [{ id, label, reason }]`，`reason ∈ none \| error \| hidden` | P1 |

| # | 契约 | 定义 |
|---|---|---|
| C4 | `error.kind` | `http`（带 `status`）/ `timeout` / `network` / `parse` / `unconfigured` / `upstream`（带业务码） |
| C5 | `unconfigured` | 凭据缺失，不是故障；UI 显示「未配置凭据」 |
| C6 | `upstream` | HTTP 通但业务失败（`success:false`、`code!=0`）；只留业务码，不带响应体 |
| C7 | `probe` 约束 | 只允许三个字段；`label` 由 `providerLabel` 生成；前端不出现 provider id |
| C8 | `probe` 兼容 | 缺失时 UI 退回单句空态，旧调用方不受影响 |

## 3. 安全

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B6 | 路由安全门 | 优先 `connection.requestRejection(req)`；无该服务时校验 `remoteAddress` + `host` + `origin`，不通过返回 401/403 | P1 |
| B7 | 脱敏收口 | 错误消息、`source`、`raw` 三处统一脱敏；响应 JSON 不含密钥片段 | P1 |

| # | 契约 | 定义 |
|---|---|---|
| C9 | 现状 | 路由经 `webServer.register` 挂载；**当前无鉴权判断**（e2e 中无 token 的 `PUT /prefs` 返回 200），本机任意进程可访问 |
| C10 | 错误体 | `{ ok:false, error:'unauthorized' \| 'forbidden' }`，不泄漏内部字段 |
| C11 | 凭据 | 仅经 `ctx.credentials`；不读 `~/.dsh/.credentials.yaml`；不落盘 |

## 4. Provider 扩展

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B8 | 声明式额度源表 | 五家 endpoint / 凭据 / 校验 / 归一化收进一张表，`readProviders` 按表迭代；新增家只加表行 | P1 |
| B9 | 凭据两型 | `bearer`（默认）与 `oauth-reuse`（复用宿主 token）；不支持 Cookie 与本机登录文件 | P1 |
| B10 | preflight 钩子 | 取数前可选 `preflight(secret, baseUrl)` 取 query 片段；异常返回空串（软失败） | P1 |
| B11 | 窗口归一化 | `windows` 0–3、`key ∈ 5h/week/month`、`usedPercent ∈ [0,100]`；缺窗不生成占位对象 | P1 |
| B12 | OpenCode Go | `GET https://opencode.ai/zen/go/v1/usage`，bearer `OPENCODE_GO_API_KEY`；404/405 回落 `api/v1/usage` | P1 |
| B13 | Command Code | `GET https://api.commandcode.ai/alpha/billing/credits`，bearer；preflight 取 `orgId`；解析 `credits` + `windowLimits.fiveHour / weekly` | P2 |

| # | 契约 | 定义 |
|---|---|---|
| C12 | 源表形状 | `{ id, baseUrl, path, credentialRef, auth, headers?, validate?, normalize }`；`auth ∈ bearer \| oauth-reuse` |
| C13 | preflight | `async preflight(secret, baseUrl) → string`；任何异常返回 `''` |
| C14 | VM 兼容 | 不改 `SummaryVM` 顶层字段；只新增 `providers[]` 一项；`pricingLinks` 缺省 `[]` |
| C15 | 接入落点 | 源表 1 行 + 三个可选钩子 + 1 份 fixture；`adapters.js` 不新增 if 分支 |

## 5. 附加路由

| # | 能力 | 设计 | 优先级 |
|---|---|---|---|
| B14 | `active` 参数 | `GET /summary?active=<raw>`；`normalizeProvider(raw)` 命中五家则覆盖 `currentProviderId`，未命中保持账本值 | P1 |
| B15 | 仓库元信息 | `GET /repo` → `{ ok, stars, fetchedAt }`；6h 缓存 + ETag。**暂不需要**：前端已改为纯跳转，不请求该路由 | — |

| # | 契约 | 定义 |
|---|---|---|
| C16 | `active` 校验 | 仅接受字符串，长度与字符集按现有别名规则；不写存储、不落日志明文 |
| C17 | `repo` 响应（暂缓） | 成功 `{ ok:true, stars, fetchedAt }`，失败 `{ ok:false }`；不返回原始响应体 |

## 6. 不做

| # | 项目 | 原因 |
|---|---|---|
| N1 | Cookie 抓取型 provider（百炼 Token Plan、小米 MiMo） | 凭据会过期、需手动复制，违反「凭据只走宿主」 |
| N2 | 自定义 `baseUrl` / `credentialRef` 覆盖 | 边界冲突；开放须先做白名单 |
| N3 | 读本机 `~/.codex/auth.json` | 违反 C11；须单独立项加开关 |
| N4 | 直读 `session*.jsonl.zstd` | 已有 `sessionPersistence`，自解析跨版本脆 |
| N5 | `/usage` 区间缓存 | 内存聚合毫秒级 |
| N6 | 1s 轻路由轮询 | UI 用可见性节律 + 打开即刷 |
| N7 | provider 插件化 / per-provider 拆文件 | 七家规模用单文件源表更划算 |

## 7. 落点与顺序

> 量级：S ≤30 行、M 30–80 行、L ≥80 行；只给范围，不给 diff。

| # | 文件 · 落点 | 改动 | 量级 |
|---|---|---|---|
| B1 | `index.js` `providerCache` / `refreshProviderCache` / TTL 判断 | 单档 30s 拆成功 60s / 失败 10s，补 `lastOk` / `lastFail` | M |
| B2 | `index.js` `refreshProviderCache` | 加 `inflight` Promise，结束清空 | S |
| B3 | `src/adapters.js` 错误归一 | 枚举补两态，保留 `status` 与业务码 | S |
| B4 | `src/adapters.js` `toSnapshot` + `src/core.js` `buildSummary` | `unconfigured` 不计失败、不重试，只进 `probe` | S |
| B5 | `src/core.js` `buildSummary` + `src/adapters.js` `readProviders` | adapters 收集 `misses`，core 输出 `probe` | M |
| B6 | `index.js` `/summary` handler | 先 `requestRejection`，无则三重校验 | M |
| B7 | `index.js` + `src/adapters.js` 错误构造处 | 统一脱敏三处出口 | S |
| B8 | **新增** `src/quota-sources.js` + `src/adapters.js` | 五家收进源表，按表迭代 | L |
| B9 | `src/adapters.js` + `index.js` | 新增 `resolveSecret`，两型凭据 | M |
| B10 | `src/adapters.js` `readProviders` | 取数前 preflight，异常吞掉 | S |
| B11 | `src/adapters.js` `toSnapshot` | 窗口长度 / `key` / 百分比夹取 | S |
| B12 | `src/quota-sources.js` + `src/providers.js` + fixtures | 源表一行 + registry + fixture | M |
| B13 | 同上 | Command Code：credits、preflight `orgId`、两窗解析 | M |
| B14 | `index.js` `/summary` handler + `src/core.js` `buildSummary` | 透传 `active`，命中五家才覆盖 `currentProviderId` | M |

```text
B8（源表） ──┬─→ B12（OpenCode Go）
             ├─→ B10（preflight）──→ B13（Command Code）
             └─→ B9（凭据两型）

B1 / B2 独立，可并行先做
B3 / B4 → B5（probe 依赖错误分类）
B6 独立，但改所有请求入口，建议单独一轮验证
B13 依赖 B8 + B10 + B9，排在 B12 走查之后
```

## 8. 可观察结果

| 能力 | 应观察到 |
|---|---|
| B1 / B2 | 一次失败后 10s 内可恢复；并发请求只产生一次上游调用 |
| B3 / B4 | 日志出现 `unconfigured` / `upstream` 且无响应体原文；未配置不触发重试 |
| B5 | `/summary` 含 `probe.misses`，`none / error / hidden` 三态可复现 |
| B6 / B7 | 非回环地址与伪造 Origin 均 401/403；错误文案与 `source` 无 Key 片段 |
| B8 / B10 | 新增一家只改源表与钩子；`whoami` 断网仍返回 credits |
| B12 / B13 | 三窗正常渲染；缺月窗显示 `—` 而非补 0 |
| B14 | 带已知别名时 `currentProviderId` 跟随，未知别名与不带参一致 |

## 9. 已具备（不重复实现）

- 峰值 / 空闲分档计价（`src/core.js`）；会话日志回填走 `sessionPersistence`（`src/collect.js`）。
- 无自定义入口，暂不需要 host 白名单。
