# `2026heshao/dsh-armory` 现状档案

> 仓库：`https://github.com/2026heshao/dsh-armory`（v2.4.8）<br>
> 本地：`reference/third-party/dsh-armory`（已 gitignore）<br>
> 用途：第三方实现现状描述，**不含我方改造结论**；采纳项见 [UI 参考 checklist](../checklist/archived/ui-reference-checklist.md) 与 [后端能力 checklist](../checklist/archived/backend-capability-checklist.md)。<br>
> 记录日期：2026-11-03

## 定位

DSH 一体化看板：MCP 连接管理 + 技能管理 + 专家（WorkBuddy）挂载 + 插件与四大市场（连接器 / 技能 / 专家 / 社区插件）+ 工具账本（谁在吃 token）。中文名「大肥鱼军械库」，README 口径是"你不需要记住 DSH 里装过什么"。

在当前已调研的三个参考项目里，它是**唯一使用官方「全局面板」机制做整页**的实现，主要价值在入口与页面结构。

## 规模

| 项 | 值 |
|---|---|
| 版本 / 运行时 | v2.4.8；`node >= 22.15` |
| 客户端 | `lib/client.js` 14656 行（单文件，含 1000+ 行 CSS 字符串） |
| 宿主端 | `lib/index.js` 2507 行 + 34 个 `lib/*.js` 模块 |
| 测试 | `test/` 下 83 个 `*.mjs`，`node ./test/run-all.mjs` 汇总执行；含 e2e 脚本 |
| 依赖 | 运行时仅 `smol-toml` / `yaml` / `zod`；其余走 DSH peer 包 |
| 客户端声明 | `dsh.client.platform = web`，`inject: ['@deepseek-ai/dsh-api-remotes']` |
| 宿主注入 | `inject = ['slots', 'remote', 'typert', 'remote.pluginManager']` |

## 一、入口与页面（最值得对齐的部分）

### 1.1 三种入口

| 入口 | 槽位 | 形态 | 说明 |
|---|---|---|---|
| 左侧全局面板行 | `sidebar.panellist` | 侧栏顶部列表的一行（与「插件」并列） | **主入口**，点击由宿主切中栏整页 |
| 右下角悬浮按钮 | `shell.overlay` | 页面右下角浮动按钮 | 兼容入口，点击同样切整页 |
| 左侧栏底部图标 | `sidebar.footer.action` | 侧栏底部动作区 | 0.1.5 起声明的兼容入口 |

三处共用同一个 `PANEL_ID = 'mcp-manager'`。

### 1.2 整页机制

```js
// 页面本体：注册到宿主 main 槽位
ctx.slots.inject('main', () => ctx.slots.register(
  { name: 'main', key: PANEL_ID, label: panelLabel(), inject: () => ({ call, timer, pluginManager }) },
  McpBoardPage,
))

// 左侧入口：注册成列表行
ctx.slots.register(
  { name: 'sidebar.panellist', id: PANEL_ID, order: 5, label: sidebarEntryLabel() },
  McpPanelIcon,
)
```

点击链路（宿主侧，客户端**不直接调用**，仅由源码注释描述）：`sidebar.panellist` 行 → `ctx.layout.selectPanel(PANEL_ID)` → 校验 `main` 槽存在同 `key` 条目 → 中栏按 `entryKey` 渲染（`lib/client.js:5894`、`13594` 注释）。原话：

> 现在改成官方「全局面板」机制：侧栏顶部注册一个面板行，点击走 `ctx.layout.selectPanel()`，中栏以 entryKey 切换到本插件的页面——**与切换对话完全同构，不再新开/独立弹出**。

### 1.3 三个实现坑（源码注释明确记录）

| # | 坑 | 后果 | 做法 |
|---|---|---|---|
| P1 | `sidebar.panellist` 的 `id` 与 `main` 的 `key` 不一致 | 宿主 `hasMainPanel` 校验失败并抛错，侧栏点了没反应 | 两者用同一常量 `PANEL_ID` |
| P2 | 直接 `register` 而不 `inject` | 宿主槽位尚未声明时注册失败（插件加载顺序不保证） | 一律 `ctx.slots.inject(<slot>, () => register(...))` |
| P3 | 用组件 `return null` 隐藏 `sidebar.panellist` 行 | 无效：行内容与 label 来自注册参数 | 按偏好 `dispose()` 后重新 `register()` |

> 与 `sidebar.footer.action` 相反：那个是 list 型槽位，宿主把条目组件直接渲染进 `.footerActions`，空子树不占布局，所以它选择"渲染 null、不注销注册"。

### 1.4 入口可见性用三值枚举，不用两个 boolean

```text
ENTRY_VISIBILITY = { both, fab, sidebar }     // 存 localStorage: dsh-armory/entry
```

「两个都关」在类型里不存在，所以不需要守卫逻辑或"至少留一个"的提示；测试直接对可见性表断言每项至少一个入口可见。源码注释：*"真关了两者，面板就再也打不开（只能手改 localStorage 才能回来）"*。

## 二、前端现状

| # | 现状 | 证据 |
|---|---|---|
| U1 | 单文件 14656 行（含 1000+ 行 CSS 字符串），零构建、无组件目录 | `lib/client.js` |
| U2 | CSS 顶部建一层 `--mcp-*` 别名，把宿主 `--dsw-alias-*` 收口，之后 1000+ 行规则只引用别名 | `docs/design.md:255` |
| U3 | **零自选配色**：没有 `@media (prefers-color-scheme)`、没有一处 hex，明暗全交宿主 | `docs/design.md:244-253` |
| U4 | 整页内自带分类 tab（MCP / Skill / 专家 / 工具裁缝 / 市场），单页不拆多级路由 | README + `McpBoardPage` |
| U5 | 自建 i18n：词典 + `getter` 文案，订阅宿主 `locale` 服务后重渲染；入口 label 变更需重注册 | `lib/client.js:14946-14968` |
| U6 | 会话内另有三个轻入口：`conversation.input.right`（召唤菜单）、`conversation.session.header.actions`（当前专家徽章） | `lib/client.js:14918-14931` |
| U7 | 悬浮按钮在看板页自动收起（避免挡住列表） | `lib/client.js:5899-5904` |
| U8 | 入口偏好与按钮位置存 localStorage，不进 profile 配置 | `docs/design.md:118` |

## 三、后端现状

| # | 现状 | 证据 |
|---|---|---|
| B1 | Host Remote 契约用 `typert` 描述（`lib/typert.js`），客户端经 `remote` 调用 | `lib/index.js`、`exports["./typert"]` |
| B2 | MCP 管理：全局走 profile，项目走 `.dsh/mcp.json`；项目可屏蔽全局条目 | README、`lib/workspace-*.js` |
| B3 | 共享连接模型：按 `(项目, serverName)` 引用计数复用 mcp-client 连接，连接不随会话结束销毁 | `lib/workspace-runtime.js`、`docs/design.md` |
| B4 | 配置改动就地重载连接并重投射工具；会话中生效，不用重开会话 | `docs/design.md` 生效时机表 |
| B5 | 支持 11 种外部客户端配置的检出与导入，按条目容错、同名跳过 | `lib/mcp-import-sources.js` |
| B6 | 远端 MCP OAuth：401 触发授权，走发现 / 注册 / PKCE / 回调，令牌写回配置并自动刷新 | `lib/mcp-oauth.js`、README |
| B7 | 工具账本：读本机会话日志的调用事件（不读聊天正文），按 7/30/90 天统计调用数、错误率、最后使用；对比注册表 Schema 与线上下发清单的 token 差 | `lib/tool-ledger.js`、`docs/features.md` |
| B8 | 技能管理：安装 / 卸载 / 禁用 / 项目作用域 / 来源白名单校验 | `lib/skill-*.js` |
| B9 | 市场：连接器 / 技能（19 万+）/ 专家 / DSH 社区插件，直连安装 | `lib/wb-market.js`、`lib/wb-awesome-market.js` |
| B10 | 安全：可卸载/可禁用来源白名单与宿主侧二次校验；导入有准入检查（同作用域唯一 serverName、环境变量归一） | `lib/import-admission.js`、`docs/design.md` |

## 四、已知取舍（上游自述）

| # | 取舍 | 说明 |
|---|---|---|
| T1 | 单文件前端 | 14656 行不放组件目录；换来零构建与加载简单 |
| T2 | 无自选配色 | 明确写成硬契约：颜色/几何/字体归 `ui-theme` |
| T3 | 首轮就绪预算 5s | 超时不算失败、不阻断会话，靠 `tools/change` 补投射 |
| T4 | 不支持 per-session 隔离 | 共享连接按项目维度复用 |
| T5 | Windows stdio 孙进程风险 | 依赖 MCP 服务器自行响应 stdin EOF；不响应的会等满 4s 并留孤儿进程 |
| T6 | 插件热重载清空运行中会话的项目工具 | 需新开会话重新获取 |

## 五、截图

上游 README 的 7 张实拍图已复制到 `images/`（本地副本，不入库，前缀 `2026heshao-dsh-armory--`）：

| 文件 | 展示内容 |
|---|---|
| [`images/2026heshao-dsh-armory--mcp-overview.png`](images/2026heshao-dsh-armory--mcp-overview.png) | **整页面板**：左侧导航 + 中栏列表 + 右侧详情 |
| [`images/2026heshao-dsh-armory--mcp-detail.png`](images/2026heshao-dsh-armory--mcp-detail.png) | MCP 详情：Schema、连接参数、打码凭据 |
| [`images/2026heshao-dsh-armory--tool-ledger.png`](images/2026heshao-dsh-armory--tool-ledger.png) | 工具账本：调用趋势与死工具清单 |
| [`images/2026heshao-dsh-armory--experts.png`](images/2026heshao-dsh-armory--experts.png) | 专家（WorkBuddy）列表 |
| [`images/2026heshao-dsh-armory--market-connectors.png`](images/2026heshao-dsh-armory--market-connectors.png) | 连接器市场 |
| [`images/2026heshao-dsh-armory--market-skills.png`](images/2026heshao-dsh-armory--market-skills.png) | 技能市场 |
| [`images/2026heshao-dsh-armory--market-experts.png`](images/2026heshao-dsh-armory--market-experts.png) | 专家市场 |

## 六、对齐清单（仅供对照，不含我方结论）

| 维度 | 本项目现状 | 参考实现 |
|---|---|---|
| 页面形态 | 360 浮层（P2/P3） | 中栏整页（`main` + `sidebar.panellist`） |
| 左侧常驻入口 | 无 | `sidebar.panellist`，`order: 5` 落在「插件」旁 |
| 会话内入口 | 首页 + 输入框 Pill | 输入框右侧菜单、会话头徽章 |
| 页面内导航 | 浮层内两个 tab | 整页五个分类 tab |
| 配色 | 只读宿主 token | 同样只读，且明确写进设计文档 |
| 偏好存储 | host `prefs` 文件 | localStorage |
| 页面注册方式 | 未使用 `main` | `slots.inject('main', …)` + 同 key |

## 七、迭代记录

| 轮次 | 改动 |
|---|---|
| 第 1 轮 | 建立档案：定位、规模、三入口与整页机制、三坑、前端 / 后端现状、上游自述取舍、截图、对齐清单 |
| 第 2 轮（本轮） | ① 去掉未经核实的"手写 createElement"表述（实测 `createElement` 仅 13 处）；② `ctx.layout.selectPanel` 标注为「宿主行为、注释所述，客户端未直接调用」；③ "唯一使用全局面板"限定为「当前已调研的三个项目内」 |
