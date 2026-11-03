# `InvisibleSirius/dsh-quota-dashboard` 现状档案

> 仓库：`https://github.com/InvisibleSirius/dsh-quota-dashboard`（v1.1.0）<br>
> 本地：`reference/third-party/dsh-quota-dashboard`（已 gitignore）<br>
> 用途：第三方实现现状描述，**不含我方改造结论**；采纳项见 [UI 参考 checklist](../checklist/active/ui-reference-checklist.md) 与 [后端能力 checklist](../checklist/active/backend-capability-checklist.md)。<br>
> 记录日期：2026-11-03

## 截图

上游仓库 README **没有任何截图**，仓库内也没有 `docs/` 图片目录，`images/` 下没有该项目素材；界面只能读代码或自行运行截图。

> 命名约定：`images/` 内文件统一为 `owner-repo--<名称>.png`。本项目（若补图）用 `invisiblesirius-dsh-quota-dashboard--`；`shy3130/dsh-quota` 用 `shy3130-dsh-quota--`。

## 定位

通用多平台 API 额度 / 余额监视器。侧边栏底部呼吸灯按钮 + 浮层面板，覆盖 15+ 家平台（余额类、额度类、组织用量类、自定义），自带设置与配色面板。纯 DSH bundle，Web shell module-loader 形态。

## 规模

| 项 | 值 |
|---|---|
| 客户端 | `client.js` 1047 行，全 `React.createElement` 手写，无 JSX、无构建 |
| 宿主端 | `index.js` 1401 行，单文件（provider 表 + 解析器 + 路由 + 状态文件） |
| 其他 | `scripts/dev-gui-check.mjs`、`scripts/test-parsers.mjs`、`scripts/smoke-live.mjs`；无 e2e、无单测框架 |
| 客户端注册 | `window.__ModuleLoader__.load({ id, factory })`，`apply(ctx)` 内 `ctx.get('slots')` 注册 |

## 前端 UI 页面

### 结构与视觉

| # | 现状 | 证据 |
|---|---|---|
| U1 | 触发器挂在侧边栏底部（`sidebar.footer.action`），呼吸灯 8px 圆点，最多 4 个状态点 | `client.js:845-854`、`client.js:806-818` |
| U2 | 浮层固定坐标：`position:fixed; left:16px; bottom:64px; width:360px; max-height:760px` | `client.js:47-50` |
| U3 | 单容器内三块可折叠区：正文 / 设置 / 配色，全部在同一浮层内展开，不开二级弹窗 | `client.js:870-1032` |
| U4 | 面板内**局部重定义** `--dsw-alias-*` 语义令牌为固定浅色；`@supports not (backdrop-filter)` 兜底不透明底 | `client.js:36-70` |
| U5 | 玻璃拟态：三层 gradient + `backdrop-filter: blur(26px) saturate(170%)`，鼠标位置写 `--gx/--gy` 驱动高光 | `client.js:54-65`、`client.js:777-783` |
| U6 | 设置展开时压缩正文区：`max-height:clamp(112px,28vh,220px)` | `client.js:75` |
| U7 | 15 套预设配色（含"跟随主题"）+ 背景/文字自定义色 + 全局字体覆盖（会话框、UI 标题衬线切换） | `client.js:213-229`、`client.js:269-299` |
| U8 | 窄屏仅靠 `width:360px` 与视口 `max-width` 收缩，无独立移动断点 | `client.js:47` |
| U9 | 样式为单个模板字符串常量，注入一次 `<style>`；`ctx.effect` 负责移除 | `client.js:12-191`、`client.js:1048-1051` |

### 交互

| # | 现状 | 证据 |
|---|---|---|
| U10 | 开合动画：`qd-grow` / `qd-shrink` 从 `max-width/max-height:0` 到目标值；`closing` 独立状态，关闭中再点可反向恢复；`onAnimationEnd` 按动画名卸载 | `client.js:17-25`、`client.js:769-776` |
| U11 | 关闭三路：外部 `mousedown` + `touchstart{capture,passive}` + `document` 级 `Escape` | `client.js:601-614` |
| U12 | 触发器 `aria-haspopup=dialog` / `aria-expanded`；`aria-label` 与 `title` 拼全量明细（各平台一行） | `client.js:845-848` |
| U13 | 状态聚合：`stateOf(remPct)` → ok/warn/low；`overallRank` 取最坏；label 兜底链（未启用→异常→额度x%→余额y） | `client.js:369-374`、`client.js:787-818` |
| U14 | 空态引导：文本提示「打开下方设置选择平台」+ 设置区内「快捷配置」chips（检测到已有凭据的平台一键启用） | `client.js:872`、`client.js:958-973` |
| U15 | 设置区无凭据时不渲染输入框，整块替换为说明文案 | `client.js:907-919` |
| U16 | 测试 / 保存结果写回按钮下方 `testMsg`，`✗` 前缀决定红色 | `client.js:728-749`、`client.js:944` |
| U17 | 底部常驻状态行：`更新于 HH:mm · 每 N 自动刷新 · 点击刷新立即更新` | `client.js:1030-1031` |
| U18 | 刷新间隔（关闭/30s/1m/2m/5m）与启用清单存 `localStorage`；配色、字体也存 `localStorage` | `client.js:318-327`、`client.js:230-267` |
| U19 | 客户端首查 + 定时轮询，无可见性判断；面板打开时不强制刷新 | `client.js:663-671`、`client.js:769-773` |

## 后端数据维护

### 结构

| # | 现状 | 证据 |
|---|---|---|
| B1 | `PROVIDERS` 声明数组：余额类 7 家、额度窗口类 5 家、组织用量类 3 家、通用自定义 1 家 | `index.js:1009-1029` |
| B2 | 每项字段化：`id/name/kind/baseUrl/path/auth/currency/keyEnv/parse/docsUrl/consoleUrl/note`，可选 `query` / `preflight` / `fallbackPaths` / `fallbackUrls` / `extraHeaders` | `index.js:1009-1029` |
| B3 | 统一管道 `runQuery`：凭据 → 建 URL → 请求 → JSON → `def.parse` → 合并统一 base 字段 | `index.js:1271-1320` |
| B4 | 结果只有两种形状：`balance{amount,currency,balanceRows[]}` 与 `usage{windows[],message}` | `index.js:555-696` |
| B5 | 异常用三个显式标志：`ok:false` / `needKey` / `needLogin`；`needLogin` 用于 Codex 未登录 | `index.js:1277-1279`、`index.js:1251` |
| B6 | 请求超时统一 20s（`AbortController`）；`httpFetch` 默认 `redirect:'manual'` | `index.js:20`、`index.js:1041-1058` |
| B7 | 主接口强依赖、次要接口 `Promise.all + .catch(()=>null)` 软失败；`fallbackPaths` 仅在 404/405 时尝试 | `index.js:975-980`、`index.js:1019-1021` |
| B8 | 无服务端业务缓存；每次查询直连上游（面板侧靠 localStorage 控制轮询频率） | `index.js:1271-1320` |

### 安全与凭据

| # | 现状 | 证据 |
|---|---|---|
| B9 | 凭据级联：显式入参 → DSH 凭据服务 → 环境变量 → 本机状态文件（`0600`）；`credentialMode='codex-session'` 永不落盘 | `index.js:1126-1200`、`index.js:1413-1421` |
| B10 | 脱敏在数据层：`redactText` 处理错误消息、`safeUrlForClient` 处理 `source`、`safeRawResponse` 处理 `raw`；密钥只回显 `maskKey` | `index.js:1294-1318`、`index.js:1458-1467` |
| B11 | `baseUrl` 白名单：Codex 仅 `chatgpt.com/www.chatgpt.com`；百炼仅官方网关，变体不匹配直接报错 | `index.js:24`、`index.js:960-965` |
| B12 | 服务端产出 `ready[]`：告诉前端哪些平台当前凭据可解析，前端据此渲染「一键启用」 | `index.js:1458-1477` |
| B13 | 请求来源校验仅做同源判断（`isCrossOriginRequest`），无回环 IP 兜底 | `index.js:1348-1372` |

### 路由

| 路由 | 形态 | 说明 |
|---|---|---|
| `GET /dsh-quota-dashboard/config` | 返回 provider 注册表（脱敏）+ 密钥状态 | 不含密钥本体 |
| `POST /dsh-quota-dashboard/query` | `{provider, baseUrl?, apiKey?, persistKey?}` | 单平台查询，Key 走 body 不进 URL |
| `GET /dsh-quota-dashboard/keys` | 脱敏密钥状态 + 环境变量命中清单 | `Cookie••••` / `sk-****` |
| `POST /dsh-quota-dashboard/keys` | 保存 / 清空本机密钥 | 落 `DSH_HOME` 下 0600 状态文件 |

## 平台覆盖

| 类别 | 平台 |
|---|---|
| 余额 | DeepSeek、Moonshot/Kimi、SiliconFlow、OpenRouter、MiniMax、StepFun、xAI |
| 额度窗口 | OpenAI Codex（session）、Kimi Code、OpenCode Go、Command Code、智谱 GLM、阿里云百炼 Token Plan（Cookie） |
| 组织用量 | OpenAI、Anthropic、Together |
| 通用 | custom（用户自填 URL，余额 / 额度两种模式） |

## 已知取舍

- 走「广覆盖」路线：平台多、每平台一个解析函数，单文件体积大，无统一重试与缓存策略。
- 支持 Cookie 型来源（百炼），需要用户从浏览器 Network 复制 Cookie Header。
- 无自动化 e2e，只有解析器与 GUI 手动检查脚本。
