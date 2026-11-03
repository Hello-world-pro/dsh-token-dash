# 后端能力 checklist（宿主输出契约）

> 参考档案：[`invisiblesirius-dsh-quota-dashboard.md`](../../reference/invisiblesirius-dsh-quota-dashboard.md)（A：`InvisibleSirius/dsh-quota-dashboard`）、[`shy3130-dsh-quota.md`](../../reference/shy3130-dsh-quota.md)（B：`shy3130/dsh-quota`）<br>
> 架构真源：`docs/design.md`。本文件只定义**宿主应输出什么、错误怎么表达、边界在哪**，不含实现步骤，**不构成施工授权**。<br>
> 实施步骤 / 验收 / 测试走 `docs/plan/active/feature_*.md`；UI 表现见 [UI 参考 checklist](ui-reference-checklist.md)。<br>
> 状态：待评审 · 记录日期 2026-11-03

## 能力目录

| # | 能力 | 来源 | 我方现状 | 结论 | 优先级 | 主归属 |
|---|---|---|---|---|---|---|
| B1 | 缓存成功 / 失败分档（60s / 10s） | B | 单一 30s（`index.js:21`） | 采纳 | P0 | 后端 |
| B2 | 在途请求合并 | B | `/summary` 与 `/usage` 会重复刷新 | 采纳 | P0 | 后端 |
| B3 | 错误枚举补 `unconfigured` / `upstream` | A+B | 仅 http/timeout/network/parse（`src/adapters.js:110-115`） | 采纳 | P1 | 后端 |
| B4 | 路由安全门（`requestRejection` + 回环兜底） | B | 未见鉴权（`index.js:274-280`） | 采纳（先核实） | P1 | 后端 |
| B5 | `probe` 可用性清单 | A | `misses` 只进日志 | 采纳 | P1 | 后端 |
| B6 | 脱敏收口（错误消息 / `source`） | A | 日志已脱敏，响应未统一 | 采纳 | P2 | 后端 |
| B7 | 软态「未配置」不当作失败 | B | `status='unconfigured'` 已有，VM/UI 未单列 | 采纳（并入 B3/B5） | P1 | 后端 |
| B8 | 声明式注册表补 endpoint 元数据 | A | 散在 `src/adapters.js` | 待评审 | P3 | 后端 |
| B9 | `baseUrl` host 白名单 | A | 无自定义入口 | 备查 | — | — |
| B10 | 峰值 / 空闲分档计价 | B | 已具备（`src/core.js:35`、`src/core.js:46`） | 已具备 | — | — |
| B11 | 会话日志回填 | B | 已用 `sessionPersistence`（`src/collect.js:63-103`） | 已具备（不抄其 zstd 直读） | — | — |
| B12 | `/summary` 接受 `active` 参数并归一化 | B（投影思路）+ 我方边界 | 无该参数，`currentProviderId` 只来自账本 | 采纳：命中五家则覆盖 `currentProviderId`，否则忽略 | P2 | 后端 |
| B13 | 仓库元信息（star 计数） | C（armory `wbRepoMeta`） | 无该路由 | 采纳：`GET /token-dash/api/repo`，只查固定仓库；6h 缓存 + ETag；失败不影响 UI | P3 | 后端 |

## 一、数据形状与错误语义

| # | 契约 | 定义 |
|---|---|---|
| C1 | `ProviderSnapshot` 不变 | `id / name / kind / currency / status / balance / windows[] / error / quotaError / fetchedAt` |
| C2 | `error.kind` 取值 | `http`（带 `status`）/ `timeout` / `network` / `parse` / **`unconfigured`** / **`upstream`**（带业务码） |
| C3 | `unconfigured` 语义 | 凭据缺失，不是故障；不计入「刷新失败」，UI 显示 `未配置凭据` |
| C4 | `upstream` 语义 | HTTP 通但业务失败（如 `success:false`、`code!=0`）；只保留业务码，不带原始响应体 |
| C5 | `probe` 形状 | `summary.probe = { misses: [{ id, label, reason }] }`，`reason ∈ none \| error \| hidden` |
| C6 | `probe` 约束 | 只允许这三个字段；`label` 由 `providerLabel` 生成；前端不出现 provider id 字面量 |
| C7 | 兼容 | `probe` 缺失时 UI 退回原单句空态；旧调用方不受影响 |
| C17 | `active` 参数 | `GET /summary?active=<raw>`；宿主 `normalizeProvider(raw)` 命中五家则覆盖 `currentProviderId`，未命中保持账本值；不新增响应字段，不改变无参调用行为 |
| C18 | `active` 校验 | 仅接受字符串，长度与字符集按现有 provider 别名校验；不写入存储、不落日志明文 |
| C19 | `repo` 响应 | `{ ok: true, stars: number, fetchedAt: string }`；失败 `{ ok: false }`；**不返回** GitHub 原始响应体 |
| C20 | `repo` 边界 | 仓库地址为服务端常量，不接受 query 指定；未认证调用，命中 403 / 429 视作失败并缓存 10 分钟；不重试风暴 |

## 二、缓存与并发

| # | 契约 | 定义 |
|---|---|---|
| C8 | 双 TTL | 全部 provider 探测成功：60s；任一失败：10s。空结果不写 TTL（沿用现状） |
| C9 | 在途合并 | TTL 过期时若已有刷新在途，复用同一 Promise；`finally` 清空 |
| C10 | 手动刷新绕过 | `POST /providers/refresh` 仍直连，不受 TTL 限制（现状） |
| C11 | 不引入 `/usage` 缓存 | 内存聚合足够快（不抄 B 的区间缓存） |

## 三、安全

| # | 契约 | 定义 |
|---|---|---|
| C12 | 鉴权优先 | 存在 `connection.requestRejection` 则直接用，返回 401/403 |
| C13 | 回环兜底 | 无鉴权服务时校验 `remoteAddress` + `host` + `origin`；跨域一律 403 |
| C14 | 错误体固定 | `{ ok:false, error:'unauthorized' \| 'forbidden' }`；不泄漏内部字段 |
| C15 | 脱敏范围 | 错误消息、`source` 字段（如将来引入）、`raw` 回传，三处统一处理 |
| C16 | 凭据 | 仅经 `ctx.credentials.resolve()`；不读 `~/.dsh/.credentials.yaml`；不落盘 |

## 四、不采纳

| # | 项目 | 来源 | 原因 |
|---|---|---|---|
| N1 | Cookie 抓取型 provider | A | 违反「仅五家官方接口」安全条款 |
| N2 | 自定义 `baseUrl` / `credentialRef` 覆盖 | A+B | 边界冲突；将来开放须先做白名单（B9） |
| N3 | 直读 `session*.jsonl.zstd`（多帧解压） | B | 已有 `sessionPersistence`，自解析成本高、跨版本脆 |
| N4 | `/usage` 区间结果缓存 | B | 内存聚合毫秒级 |
| N5 | 1s 廉价 `/active` 轻路由 | B | 我方无只读内存路由；UI 侧用可见性节律 + 打开即刷覆盖 |
| N6 | provider 插件化 / per-provider 拆文件 | A | 五家规模用单文件 registry 更划算 |

## 五、可观察结果（不写测试步骤）

| 能力 | 应观察到 |
|---|---|
| B1 | 一次失败后 10s 内可恢复；恢复前不重复打满 60s 缓存 |
| B2 | 并发请求同一时刻只产生一次上游调用（日志中上游事件不重复） |
| B3 | 日志出现 `errorKind=unconfigured` / `upstream`，且无响应体原文 |
| B4 | 非回环地址与伪造 Origin 均被拒（401/403），正常会话不受影响 |
| B5 | `/summary` 响应含 `probe.misses`；`none/error/hidden` 三态可复现 |
| B6 | 错误文案与 `source` 中不出现 Key 片段 |
| B12 | 带 `active=<已知别名>` 时 `currentProviderId` 切换为该家；带未知别名时与不带参完全一致 |
| B13 | 6h 内重复调用 `/repo` 不重复请求 GitHub；断网 / 限流时返回 `{ ok:false }`，UI 只显示 `★` 不报错 |

## 六、移交

| 编号 | 内容 | 去向 |
|---|---|---|
| M1 | 实现步骤、单测用例、E2E mock 调整 | 实施时新建 `docs/plan/active/feature_*.md` |
| M2 | `docs/design.md` 回写：取数缓存、错误分类、`probe`、安全门 | 实施同批写入（当前设计文档未改） |
| M3 | B4 鉴权现状核实结论 | 核实后写入 feature 的「事实」节，不回填本文件 |
