# DSH 0.2.2 升级兼容评估 checklist

> 状态：调查完成，待升级决策（只读评估，未改代码）<br>
> 当前 DSH：`0.2.1-rc.5`（desktop，win-x64 nightly）<br>
> 目标 DSH：`v0.2.2-rc.1`（2026-11-04 发布；alpha.3 为 2026-11-03）<br>
> 插件版本：`1.3.0-local.9`<br>
> 依据：官方 GitHub Releases（[`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness/releases)）、本机 `app-update.yml`、插件 `package.json` / `index.js` / `client.js` / `src/collect.js`<br>
> 生命周期：升级验证完成后归档到 `docs/checklist/archived/`

## 一、阶段总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| S0 | 版本与发布说明核对 | 完成 |
| S1 | 插件 API 使用面与破坏性变更对照 | 完成 |
| S2 | 升级后冒烟 / 回归验证 | 待执行（需安装 0.2.2-rc.1） |
| S3 | 升级 / 回滚决策 | 待决策 |

## 二、交付事实

| 项 | 值 | 证据 |
|---|---|---|
| 当前 DSH | `0.2.1-rc.5`（exe `0.2.1.0`） | `DeepSeek Harness.exe` 版本信息 |
| 最新 DSH | `v0.2.2-rc.1` | GitHub Releases，2026-11-04 |
| 中间版本 | `v0.2.2-alpha.3` | GitHub Releases，2026-11-03 |
| Node 最低要求 | **24.9** | 0.2.2-alpha.2 / rc.1 release notes |
| Cordis | Core `4.0.0-rc.11`、Loader `1.0.0-rc.8`、Include `1.1.1` | alpha.3 release notes |
| 插件 engines | `>=20` | `package.json` |
| 插件 README | 写「需要 DSH 0.2.1 或更新」、Node badge `>=20` | `README.md` |
| 插件宿主 API | `ctx.effect`、`ctx.inject(sessionPersistence/webServer)`、`ctx.on('session/event')`、`webServer.register`、`slots.inject`、`locale`、`layout`、`credentials`、`deepseekAccount` | `index.js` / `client.js` / `src/collect.js` |

## 三、升级注意点与影响

| # | 0.2.2 变更 | 对本插件的影响 | 等级 |
|---|---|---|---|
| 1 | 最低 Node.js 24.9 | 插件运行在宿主内，不单独要求；但 `engines >=20` 与 README 的 `>=20` 已过时，旧运行时无法启动新 DSH | 中 |
| 2 | Cordis Core/Loader/Include 升级 | 插件依赖 `ctx.effect / inject / on` 与 `webServer.register`；官方未列这些 API 破坏，但 Loader 行为变化需实测 | **高** |
| 3 | Session API 独立拆分、Projection 注册改异步 | 插件 `backfill` 使用 `sessionPersistence.list/open` 读取历史；若接口变化，历史回填降级，实时 `session/event` 仍可用 | **高** |
| 4 | 插件安装失败诊断 / 启用失败区分 | 不影响运行 API；安装日志更详细 | 低 |
| 5 | 工具执行拆分、`tools.mode` 迁移、`agent.model` 固定 | 插件不定义工具、不调用 `agent/request` | 无 |
| 6 | Node PTC / apply_patch / worktree 插件合并 | 插件均未使用 | 无 |
| 7 | Web Fetch 不再拒绝非公网地址 | 插件用原生 `fetch` 访问 provider，不经过 Web Fetch 工具 | 无 |
| 8 | 设置页导航图标、动态请求头 | 插件无独立设置页，未使用动态请求头 | 低 |
| 9 | 官方组合包 / profile bundle 变化 | 插件走 profile `dsh.profile.bundles` 安装；升级后需确认插件仍在列表 | 中 |
| 10 | 客户端 `__ModuleLoader__` / slots | release notes 未列 break；P1/P2/P3 是否挂载必须实测 | **高** |

## 四、兼容性预期判断

**结论：有较高概率兼容，但不能直接判定通过；必须先备份并在 0.2.2-rc.1 上冒烟。**

必须通过（P0）：

1. 插件出现在 profile 列表且能启用；
2. P1 Pill、P2 浮层、P3 整页能挂载；
3. `/summary`、`/usage`、`/prefs` 正常返回；
4. `session/event` 实时记账正常；
5. 7 家 adapter 不因 Cordis/凭据服务变化全部 miss。

高风险（P1）：

1. `sessionPersistence.list/open` 是否保留；若变化，历史回填显示 `collect.backfill.degraded`；
2. `webServer.register({kind:'prefix'})` 路由是否仍可用；
3. `layout.selectPanel` / `slots.inject` 是否仍可打开 P3；
4. `credentials.resolve` / `deepseekAccount` 是否仍提供。

低风险（P2）：

1. 日志前缀 / JSONL 不变（插件自写，不依赖宿主）；
2. 插件设置页入口、更新按钮；
3. 真机 OpenCode / Command Code Key 校验。

## 五、风险清单

| 编号 | 风险 | 触发条件 | 影响 | 处置 |
|---|---|---|---|---|
| R1 | 插件无法加载 | Cordis Loader / ModuleLoader 变化 | P1/P2/P3 全部消失 | 保留 local.9 包，回滚 DSH 或回退插件 |
| R2 | 历史回填降级 | `sessionPersistence` 接口变化 | 升级前历史用量缺失，实时仍记账 | 先导出数据；必要时补兼容层 |
| R3 | 路由 404 | `webServer.register` 变化 | 看板空白 / 刷新失败 | 检查 `/token-dash/api/summary` |
| R4 | 设置入口失效 | `layout` / `slots` 变化 | 无法从浮层打开 P3 | 侧栏入口兜底 / 回滚 |
| R5 | 凭据解析失效 | credentials / deepseekAccount 服务改名 | provider 全 `none`，余额空 | 检查 `probe.miss` 与 credentials 日志 |
| R6 | Node 版本不满足 | 宿主运行时 <24.9 | DSH 本身不启动 | 升级 Node / 使用新安装包 |
| R7 | 升级覆盖 profile | 安装器重置 `dsh.profile.bundles` | 插件被移除或版本回退 | 升级后 `dsh plugin list` 校验，必要时重装 local.9 |
| R8 | 数据格式变化 | DSH 升级后 session 日志结构变化 | 新记录无法采集 | 对比升级前后 `session/event` 样本 |

## 六、升级验证步骤

**AI 先行**

1. 备份 `$DSH_HOME/dsh-token-dash/` 与 desktop profile 的 `package.json` / lockfile；
2. 保存 `build/dsh-token-dash-1.3.0-local.9.tgz` 作为回滚包；
3. 升级后检查 `dsh plugin --profile desktop list` 与安装版本；
4. 打开 P1/P2/P3，检查 `/summary` `/usage` `/prefs`；
5. 查看日志：`[TD:...]`、`provider.probe.miss`、`collect.backfill.degraded`、`adapter.*`；
6. 运行 `npm test` 与 `npm run e2e`（e2e 会启动新版 web profile）；
7. 若 P0 失败，记录首个异常并停止，不继续改代码。

**你收尾**

1. 安装 DSH `0.2.2-rc.1`（先完全退出 DSH）；
2. 启动后确认版本号与插件仍在列表；
3. 截图 P1/P2/P3 与设置胶囊；
4. 回复暗号：`0.2.2 已启动，P0 通过/失败`。

## 七、移交 / 遗留

| 编号 | 内容 | 去向 |
|---|---|---|
| L1 | 未在 0.2.2-rc.1 实测 | 本 checklist S2 |
| L2 | OpenCode / Command Code 真机 Key 未验证 | 后续 provider 验收 |
| L3 | `engines >=20` 与 README Node 声明未更新 | 升级通过后单开文档/配置修复 |
| L4 | 日志重复刷新（并发 `/summary`）仍存在 | 可选小修复，不阻塞升级 |

## 八、施工提醒

- **不要直接原地升级**：先备份 profile 与 local.9 包；
- 升级后先看插件是否还在 `dsh.profile.bundles`，再看 UI；
- 若只有历史数据缺失、实时正常，优先判 R2，不要回滚整个 DSH；
- 任何代码兼容修复必须先写 plan / checklist 变更，不在本清单里直接改代码；
- Node 24.9 是 DSH 自身要求，升级前确认安装包自带运行时。

## 九、plan 回写候选

1. 若 S2 全部通过：更新 README 兼容范围到 `0.2.2`，并把 engines 提升到 `>=24.9`（需单独确认）。
2. 若 `sessionPersistence` 变化：新建 `feature_dsh_session_api_compat.md`，先补 fallback 再改采集。
3. 若 Loader/slots 变化：新建 `feature_dsh_cordis4_compat.md`，按客户端挂载 / 路由 / 凭据分阶段。
4. 升级结论回写 `docs/design.md` 的兼容性说明（仅在验证后）。

## 十、执行日志

| 时间 | 轮次 | 结果 |
|---|---|---|
| 2026-11-05 | S0 | 读取本机 `0.2.1-rc.5`、官方 `v0.2.2-rc.1` release notes、Node 24.9 / Cordis 升级项 |
| 2026-11-05 | S1 | 对照插件宿主 API：高风险为 SessionPersistence、Cordis Loader/slots；工具/PTC/Web Fetch 不涉及 |
| 2026-11-05 | 决策 | 仅评估，不升级、不改代码；等待用户执行 S2 |
