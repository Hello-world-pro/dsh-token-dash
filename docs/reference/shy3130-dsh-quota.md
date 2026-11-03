# `shy3130/dsh-quota` 现状档案

> 仓库：`https://github.com/shy3130/dsh-quota`（v1.4.x）<br>
> 本地：`reference/third-party/dsh-quota`（已 gitignore）<br>
> 用途：第三方实现现状描述，**不含我方改造结论**；采纳项见 [UI 参考 checklist](../checklist/active/ui-reference-checklist.md) 与 [后端能力 checklist](../checklist/active/backend-capability-checklist.md)。<br>
> 记录日期：2026-11-03

## 定位

DeepSeek Harness 输入框状态栏插件：徽标跟随当前会话模型自动切换，点开显示额度窗口 / 倒计时 / Token 用量与费用。覆盖 5 家（智谱 GLM、OpenCode Go、Kimi For Coding、小米 Token 套餐、DeepSeek 官方），数据本地聚合，凭据不出宿主。

## 规模

| 项 | 值 |
|---|---|
| 客户端 | `client.js` 1011 行，`React.createElement` 手写 |
| 宿主端 | `index.js` 870 行，单文件（来源表 + 归一化 + 路由 + 缓存 + 会话日志聚合） |
| 测试 | `test/smoke.test.mjs`、`test/tokens.test.mjs`（`node --test`，不联网） |
| 资源 | `locale/en.json`、`locale/zh.json`、`icon.svg`、`docs/images/` 实拍截图 |
| 发布 | `.github/workflows/publish.yml`：tag 触发 npm 可信发布（OIDC） |

## 前端 UI 页面

### 结构与视觉

| # | 现状 | 证据 |
|---|---|---|
| U1 | 徽标挂在输入框状态栏（`conversation.composer.dock` 同区），点开 360 宽面板 | `client.js:1-20` |
| U2 | 样式为 CSS 规则字符串数组，全部使用 `--dsw-alias-*` / `--dsw-radius-*` 宿主令牌，前缀 `zq-` / `zp-` | `client.js:200-293` |
| U3 | 面板分区：窗口 meters → 工具额度 → Token 用量（含迷你柱状图）→ 指示器切换；模块化 `buildPanel` / `buildContent` / `MeterSection` | `client.js:462-758` |
| U4 | 指示器可切「柱状 / 环状」，环状用 SVG 描边；选择存 `localStorage`（`dsh-quota:indicator`），宿主 `config.indicator` 作缺省 | `client.js:687-708`、`client.js:296-311`、`client.js:798-800` |
| U5 | 窄屏断点 `@media (max-width:520px)`：徽标去分隔符、迷你条收窄到 18px、面板 `left/right:12px` 且限高 | `client.js:286-292` |
| U6 | 空数据用 `data-empty` 属性驱动柱状图透明度，不用内联样式 | `client.js:282-284` |
| U7 | 文案走 `ctx.locale` + 内置 zh/en 词典兜底；套餐等级沿用官方英文名不翻译 | `client.js:314-326` |
| U8 | 徽标文字统一 12px / 同色 / 400，进度条在数字后，绿→琥珀（≥70%）→红（≥90%） | README 徽标规格 |

### 交互

| # | 现状 | 证据 |
|---|---|---|
| U9 | **两级轮询**：`/quota/active` 每 1s（宿主只读内存），额度接口按 55s 缓存取数 | `client.js:805-857` |
| U10 | 来源未变化时直接 return，不 setState，避免每秒重渲染 | `client.js:813-821` |
| U11 | 跟随当前会话模型：`props.useProjection('modelSelection')` 取 `next ?? lastUsed`，切会话/换模型立即跟随 | `client.js:763-768` |
| U12 | 模型选择保存时通过 `refreshListeners` 事件总线触发立即取数，不等下个轮询 | `client.js:859-863` |
| U13 | `visibilitychange`：隐藏时停表，恢复可见立即刷新并重排计时器 | `client.js:849-858` |
| U14 | 定位按 `resize` / `scroll(capture)` / `matchMedia(≤520px)` 变化重算；窄屏改左右铺满 | `client.js:878-902` |
| U15 | 关闭三路：外部 `mousedown` + `touchstart{passive}` + `document` 级 `Escape` | `client.js:905-923` |
| U16 | 错误枚举直接映射文案：`missing-credential → noCredential`，其余 → `unavailable` | `client.js:747-749` |
| U17 | 徽标降级：今日费用接口失败时静默，只显示余额 | `client.js:925-936` |

### 模型跟随机制

| 环节 | 做法 | 证据 |
|---|---|---|
| 取选择 | 客户端 `props.useProjection('modelSelection')`，取 `next ?? lastUsed` | `client.js:763-768` |
| 语义 | `next` = 下拉已选中、即将用于下一次请求；`lastUsed` = 最近一次实际使用 | `client.js:763-764` 注释 |
| 传参 | `GET /quota/active?provider=&model=`，两个参数都过正则白名单（provider `^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$`） | `client.js:805-812`、`index.js:671-683` |
| 宿主兜底 | query 缺失时读 `agentDefaultModel.currentSelection()` | `index.js:684-691` |
| 映射 | `PROVIDER_SOURCES[provider]` → 额度来源；未命中返回 `source: null` | `index.js:693-700` |
| 客户端行为 | `source` 为空 → 徽标 `hidden`；来源变化 → 置 `loading` 后拉新来源，避免旧数据挂新名 | `client.js:813-836` |
| 频率 | `/quota/active` 每 1s（只读内存）；来源未变直接 return，不 setState | `client.js:847`、`client.js:813-821` |
| 会话切换 | 投影快照变化 → effect 内立即 tick 一次，不等下个周期 | `client.js:873-875` |
| 模型保存 | 模型选择保存时经 `refreshListeners` 事件总线触发立即取数 | `client.js:859-863` |
| 面板 | 与徽标同一组件、共用同一份 `state.data`，因此同步切换 | `client.js:769`、`client.js:953` |

要点：

1. **不读历史消息统计**。判定依据是输入框的模型芯片（`modelSelection` 投影），与「这条会话里用过什么模型」无关。
2. **未发消息也会变**。用户在下拉里选中即进 `next`，1s 内切换；只有从未手选时才退回 `lastUsed`。
3. **拿不到就隐藏**。模型不在覆盖列表内 → `source: null` → 徽标不显示，不猜、不保留上一个来源。
4. **切换即重取**。切来源时先清状态再请求，面板不会出现「新名称 + 旧额度」的混合帧。

## 后端数据维护

### 结构与取数

| # | 现状 | 证据 |
|---|---|---|
| B1 | `SOURCES` 表 4 家（zhipu / opencode / kimi / xiaomi）+ DeepSeek 双通道（账号钱包 / API Key） | `index.js:250-300`、`index.js:809-875` |
| B2 | 每源独立 `{ route, baseUrl, path, credentialRef, headers(), validate(), normalize(), readSecret() }` | `index.js:250-300` |
| B3 | 每源独立缓存 + 在途 Promise：成功 `CACHE_OK_MS=55s`，失败 `CACHE_FAIL_MS=10s` | `index.js:38-40`、`index.js:646-661` |
| B4 | 单请求超时 `AbortSignal.timeout(12s)`；并发请求复用同一 `inflight` | `index.js:42`、`index.js:619`、`index.js:651-660` |
| B5 | 错误即枚举：`missing-credential` / `network` / `http(+status)` / `parse` / `upstream(+code)` / `internal` | `index.js:611-644` |
| B6 | 软态表达：未登录返回 `ok:true, signedIn:false`，不当作错误 | `index.js:841`、`index.js:859` |
| B7 | 凭据级联：`source.readSecret`（OAuth/账号）→ `credentials.resolve(ref)` → 环境变量 | `index.js:584-609` |
| B8 | 来源地址与凭据引用可由插件行 `config.sources[id].baseUrl / credentialRef` 覆盖 | `index.js:576-578` |
| B9 | 当前来源解析：`?provider=&model=` 优先（客户端传会话选择），缺省读 `agentDefaultModel.currentSelection()` | `index.js:671-701` |

### Token 聚合与计价

| # | 现状 | 证据 |
|---|---|---|
| B10 | 自读会话日志 `$DSH_HOME/sessions/**/session*.jsonl(.zstd)`；多帧 zstd 按魔数 `28 b5 2f fd` 切帧、拼字节流后按行切、丢弃不完整末行 | `index.js:316-328`、`index.js:391-443` |
| B11 | 单文件按 `mtime+size` 签名缓存解析结果；跨帧 JSON 行不会丢 | `index.js:371-389` |
| B12 | usage 归属：`request/context` → `request/header` → `model/selection` 建立 selection，`assistant/message` 的 usage 归到最近 selection | `index.js:407-431` |
| B13 | 区间缓存 `range:provider` 60s + 在途合并 | `index.js:547-548`、`index.js:786-801` |
| B14 | 峰值 / 空闲分档计价：工作日 9:00-12:00、14:00-18:00 为高峰，按请求发生时刻取价 | `index.js:443-467` |
| B15 | 缓存命中率口径：`cacheRead / (total - output)` | `index.js:516-517` |

### 安全

| # | 现状 | 证据 |
|---|---|---|
| B16 | 路由安全门：优先 `connection.requestRejection(req)`；无该服务时回环兜底（`remoteAddress` + `host` + `origin` 三重校验） | `index.js:551-563`、`index.js:710-712` |
| B17 | 密钥只在宿主进程使用；返回浏览器的 JSON 不含密钥 | README「隐私与安全」 |
| B18 | Token 统计全程本地：读会话日志、内存聚合、不写新文件、不上传 | README「Token 用量统计」 |

### 路由

| 路由 | 说明 |
|---|---|
| `GET /quota/active` | 当前模型 → `{ provider, model, source, origin }`，只读内存 |
| `GET /quota/config` | 界面偏好（`indicator`），来自插件 config |
| `GET /quota/tokens?range=&provider=` | Token 用量统计，60s 缓存 + 在途合并 |
| `GET /quota/deepseek` | 余额（账号钱包 / API Key 双通道） |
| `GET /quota/zhipu`、`/quota/opencode`、`/quota/kimi`、`/quota/xiaomi` | 各家额度归一化结果 |

## 平台覆盖

| 平台 | 数据接口 | 凭据 |
|---|---|---|
| 智谱 GLM | `open.bigmodel.cn/api/monitor/usage/quota/limit` | `ZAI_CODING_CN_API_KEY` |
| OpenCode Go | `opencode.ai/zen/go/v1/usage` | `OPENCODE_GO_API_KEY` |
| Kimi For Coding | `api.kimi.com/coding/v1/usages` | DSH OAuth 或 `KIMI_API_KEY` |
| 小米 Token 套餐 | `platform.xiaomimimo.com/api/v1/tokenPlan/usage` | 浏览器 SSO Cookie |
| DeepSeek 官方 | 账号服务钱包 / `api.deepseek.com/user/balance` | 通常免配置 |

## 截图

上游 README 的 12 张实拍图已复制到 `images/`（本地副本，不入库）。命名规则 `owner-repo--<名称>.png`，本项目为 `shy3130-dsh-quota--`，另一个项目为 `invisiblesirius-dsh-quota-dashboard--`：

| 文件 | 展示内容 |
|---|---|
| [`images/shy3130-dsh-quota--hero.png`](images/shy3130-dsh-quota--hero.png) | 三面板并排头图 |
| [`images/shy3130-dsh-quota--glm-pill.png`](images/shy3130-dsh-quota--glm-pill.png) | 桌面徽标（GLM） |
| [`images/shy3130-dsh-quota--opencode-go-pill.png`](images/shy3130-dsh-quota--opencode-go-pill.png) | 桌面徽标（三窗并排） |
| [`images/shy3130-dsh-quota--deepseek-pill.png`](images/shy3130-dsh-quota--deepseek-pill.png) | 桌面徽标（余额 + 今日） |
| [`images/shy3130-dsh-quota--glm-panel.png`](images/shy3130-dsh-quota--glm-panel.png) | GLM 明细面板 |
| [`images/shy3130-dsh-quota--opencode-go-panel.png`](images/shy3130-dsh-quota--opencode-go-panel.png) | OpenCode Go 明细面板 |
| [`images/shy3130-dsh-quota--deepseek-panel.png`](images/shy3130-dsh-quota--deepseek-panel.png) | DeepSeek 余额与估算费用 |
| [`images/shy3130-dsh-quota--glm-ring.png`](images/shy3130-dsh-quota--glm-ring.png) | 环状指示器 |
| [`images/shy3130-dsh-quota--opencode-go-ring.png`](images/shy3130-dsh-quota--opencode-go-ring.png) | 环状指示器（多窗） |
| [`images/shy3130-dsh-quota--mobile-pill.png`](images/shy3130-dsh-quota--mobile-pill.png) | 手机端徽标 |
| [`images/shy3130-dsh-quota--mobile-glm.png`](images/shy3130-dsh-quota--mobile-glm.png) | 手机端 GLM 面板 |
| [`images/shy3130-dsh-quota--mobile-deepseek.png`](images/shy3130-dsh-quota--mobile-deepseek.png) | 手机端 DeepSeek 面板 |

## 已知取舍

- 走「窄而深」路线：只覆盖 5 家，但每家做窗口明细、倒计时、Token 用量与费用估算。
- 直接解析会话日志文件（含多帧 zstd），换来不依赖宿主接口，但也承担日志格式变更风险。
- 支持自定义 `baseUrl`（便于自建代理），同时用回环安全门限制来源。
