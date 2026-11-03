# AGENTS.md

## 文档定位

- 本文件只保留仓库协作与执行规则，不承担开发总览、目录索引或版本现状。
- 开发/架构入口：`docs/design.md`；先读架构、Provider/VM/UI 边界、模块职责，再看代码。
- 验证命令以 `package.json` 的 scripts 为准；不要在本文件复制测试规模、构建命令或版本号。

### 重点文档读取位置

| 场景 | 先读 | 再看 |
|---|---|---|
| 改代码 / 架构 | `docs/design.md` | `src/`、`client.js`、`test/unit/`、对应 active plan |
| 需求 / 规划 | `docs/plan/AGENTS.md` | `docs/plan/active/`（先看文件头状态）、`docs/plan/archived/`（历史） |
| 施工 / 走查 | `docs/checklist/AGENTS.md` | `docs/checklist/active/`、`docs/checklist/archived/` |
| 发布 / 版本 | `docs/release.md` | `.agents/skills/dsh-token-dash-release/SKILL.md`、版本记录 `.agents/skills/dsh-token-dash-release/references/official-release-version.md` |
| 用户说明 / 变更历史 | `README.md` / `README.en.md` | `CHANGELOG.md`、`docs/pic/` |
| Skill 维护 | `.agents/skills/`（项目 skill） | `D:\Projects\Context-Engineer\skills\`（全局 skill 真源） |

- 当前 active plan / checklist 不在此复制；进入目录后按文件头状态判断，避免本文件与文档状态漂移。

## 变更授权

- **未获用户明确授权，不得直接修改代码**。用户只要求“更新文档 / 记 issue / 完善设计 / 检查文档”时，只允许修改 `docs/`、`AGENTS.md`、`README*` 等文档；禁止编辑 `client.js`、`index.js`、`src/`、`test/`、`scripts/`、`package.json`、`locale/`，也不得测试、打包或安装插件。
- 代码修改必须等待用户明确说“开始修改 / 可以改代码 / 执行 / 开始开发”等授权。文档确认与代码实施分开进行，禁止把文档和代码改动混在同一轮。
- plan / checklist 记录本身不等同于代码实施授权；即使文档已确认，也必须再收到用户明确的开始实施指令。发现文档与代码不一致时先报告，未获授权不得顺手修代码。

## 修改原则

- 纯 ESM、零构建；宿主编排入口 `index.js`，客户端 `client.js`；client bundle id 必须等于包名。
- 源码即产物，不提交 `lib/`；npm 包内容由 `package.json#files` 控制。
- 保持现有五家 provider 边界：adapter 只输出 `ProviderSnapshot`，VM 只输出 `SummaryVM`，UI 只消费 VM；不引入 provider 插件系统或 per-provider 文件拆分。
- 不做无关重构；改动范围以 plan / checklist 声明为准，越界先更新文档并确认。
- 日志用 `[TD:<module>]` 语义前缀；错误不吞，关键链路带 `errorKind` / `httpStatus`。
- 临时产物、一次性脚本和 MCP 输出统一放 `.tmp/`；不在仓库根或 `src/` 下新建临时文件。

## Skill 归属

- 项目 skill 只放在仓库 `.agents/skills/`，Codex 与 DSH 原生识别，不复制到用户层。
- 全局 skill 真源只放在 `D:\Projects\Context-Engineer\skills\`；`~/.agents/skills/<name>` 用 junction 指向 CE，不保留副本。
- 新增或修改全局 skill 在 CE 内完成，再建 junction；项目 skill 与全局 skill 不混放。

## 提交前规则

1. 更新相关文档：plan / checklist / design / README，以改动范围为准。
2. 执行受影响验证：L1 `npm test`，涉及 UI/宿主链路时加 `npm run e2e`。
3. 涉及发布时再执行 `npm run pack`，确认 tarball 内容。
4. 确认无 `.tmp/`、`build/`、真实会话或凭证进入提交。
5. 再 `commit` + `push`；用户说“提交”默认包含推送，除非明确“只本地提交”。

- 纯文档更新且不涉及代码、测试脚本、发布资产时，可跳过测试和打包，但提交说明必须写明“仅文档更新，未启动测试/打包”。
- 文档互引使用以仓库根为基准的相对路径。
- 完成本地打包后，立即回写当前 active plan 的进度；本地打包本身必须先有用户显式指令。

## 版本与发布

- 版本号遵循 `MAJOR.MINOR.PATCH`；当前正式版本以 `.agents/skills/dsh-token-dash-release/references/official-release-version.md` 为准，不在此复制。
- 发版流程唯一来源：`docs/release.md` + `.agents/skills/dsh-token-dash-release/SKILL.md`；GitHub Release、npm Trusted Publishing 均由 tag 触发。
- **本地打包必须由用户显式指令触发**（`本地打包` / `本地版本` / `候选包`）。完成 issue、修复、测试或提交后，不得自动改版本号、写 CHANGELOG local 块、`npm run pack` 或安装本地包。
- 本地构建记录写 `CHANGELOG.md` 顶部 `## [X.Y.Z-local.N]`，标题下加 `> 本地构建，未发布`；不 tag、不发布。正式发布时合并进正式块并删除，最终历史不保留 local 块。
- 正式发布：确认版本 → CHANGELOG 正式块 → L1 + E2E → pack → commit/push → tag → 双 workflow → 核验 npm latest 与 Release body；随后更新 `official-release-version.md`。
- Release body 按 tag 版本从 CHANGELOG 提取，不按“文件第一块”提取；local 块不得进入 Release body。
- 未获用户明确授权，不执行 `npm publish`、不推 tag、不声称已上线。

## 规划工作流

- 复杂功能、跨模块修改、架构调整先用 `plan-workflow` skill 维护 `docs/plan/active/`；已归档内容只读，重开走受控流程。
- 同一时间只推进一个主 feature；优先恢复已有 plan，不新建重复计划。
- 施工与走查用 `checklist` skill 维护 `docs/checklist/active/dsh/`；回写完成 + 用户明确指令后才归档。
- 每次实现完成、测试通过或发布后，回写 plan 的 §3.0/§5 与 checklist 的阶段/测试/执行日志，避免状态只在对话里。

## Git 管理与临时文件

- 入库：`src/`、`client.js`、`index.js`、`test/`、`scripts/`、`docs/`、`locale/`、`.agents/`、`.github/`、`README*`、`CHANGELOG.md`、`AGENTS.md`、`package.json`、`pnpm-lock.yaml`、`cordis.patch.yml`。
- 不入库：`node_modules/`、`build/`、`.tmp/`、`artifacts/`、`coverage/`、`playwright-report/`、`test-results/`、`*.tgz`、`*.log`、真实会话 JSONL、凭证与密钥。
- E2E 测试脚本与合成 fixture 必须入库；截图、日志、报告、trace 一律忽略。
- `pnpm-lock.yaml` 必须提交，保证可复现安装。

## 安全

- 不读取 `~/.dsh/.credentials.yaml`；凭据只经宿主 `ctx.credentials.resolve(...)`。
- 余额查询仅限 DeepSeek / Kimi / GLM / OpenRouter / Qwen 官方接口；第三方显示“第三方不支持”且不请求。
- 密钥、cookie、token 不得出现在源码、日志、fixture 或提交信息中。

## 完成后的汇报

- 汇报“本次改了什么 / 测试改了什么”前，先读取对应 commit：`git show --stat <commit>`、`git show --name-status <commit>`，并核对受影响测试与文档 diff。
- 已提交内容、未提交工作区、运行态结果分开说明；不能用记忆或推测代替 commit 事实。
- 本轮尚未形成 commit 时，明确标注“未提交”，不得说成“已完成修改”。

