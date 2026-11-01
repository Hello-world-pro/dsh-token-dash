# dsh-token-dash 项目规则

> 面向 AI agent 与维护者。本仓库是 DSH 插件代码仓；当前插件的计划在 `docs/plan/`、checklist 在 `docs/checklist/` 维护，`Context-Engineer` 不再维护本插件文档。规则以本文件为准。

## 构建与测试

- Node `>=20`；纯 ESM；首版零构建，源码直接发布。
- 宿主入口 `index.js`，客户端 `client.js`（手写 `window.__ModuleLoader__` bundle，id 必须等于包名）。
- 不提交 `lib/`；`prepublishOnly` 跑 `npm test`。

```bash
npm test          # L1：node --test
npm run e2e       # L2 + L3：临时 DSH_HOME + Playwright
npm pack --dry-run
```

## 文档位置

- 稳定文档：`docs/design.md`、`docs/release.md`。
- 计划：`docs/plan/active/feature_token_dash.md`（遵循全局 `plan-workflow` 的 `docs/plan/` 约定；单项目仓不再分项目域）。
- checklist：`docs/checklist/active/dsh/`、`docs/checklist/archived/dsh/`。
- 本插件文档只在本仓维护；`Context-Engineer` 不保留同名副本。

## 规划

- 计划目录遵循全局 `plan-workflow`：`docs/plan/active/<feature>.md`、`docs/plan/tracking/<topic>/`、`docs/plan/archived/`。
- 当前主计划：`docs/plan/active/feature_token_dash.md`。

## 临时目录

- 统一使用仓库根 `.tmp/`，禁止在仓库根或 `src/` 下创建临时文件。
- 子目录固定：`.tmp/dsh-home`（隔离 DSH_HOME）、`.tmp/pack`（tgz）、`.tmp/e2e`（截图 / 日志 / summary）。
- 可用环境变量 `TOKEN_DASH_TMP` 覆盖；E2E 默认 teardown 清理，`--keep` 保留现场。
- 测试工具脚本放 `scripts/`，本地与 CI 复用，不写进 `tests/`。

## Git 管理边界

### 进入版本管理

| 类别 | 文件 |
|---|---|
| 包与配置 | `package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`tsdown.config.ts`、`playwright.config.ts`、`cordis.patch.yml`、`.gitignore` |
| 源码 | `src/**` |
| 文案资源 | `locale/**`、`icon.svg` |
| 测试脚本 | `tests/unit/**`、`tests/e2e/**/*.spec.ts`、`tests/e2e/fixtures/**`（仅合成数据） |
| 工具脚本 | `scripts/**` |
| 工程与发布 | `.github/workflows/**`、`README.md`、`LICENSE`、`AGENTS.md`、`CHANGELOG.md` |
| 文档 | `docs/**` |

### 不进入版本管理

| 类别 | 文件 |
|---|---|
| 依赖与产物 | `node_modules/`、`lib/`、`dist/`、`build/` |
| 临时目录 | `.tmp/`、`artifacts/`、`coverage/`、`playwright-report/`、`test-results/` |
| 打包产物 | `*.tgz`、`*.tar.gz` |
| 日志与缓存 | `*.log`、`.cache/` |
| 敏感信息 | `.env`、`.env.*`、`*.pem`、`*.key`、`.credentials*` |
| 系统与编辑器 | `.DS_Store`、`Thumbs.db`、`.vscode/` |

规则：

1. E2E **测试脚本与合成 fixture 必须入库**；截图、日志、报告、trace 一律忽略。
2. 真实 `$DSH_HOME/sessions`、真实会话 JSONL、任何凭证**永不入库**。
3. `pnpm-lock.yaml` 必须提交，保证可复现构建。
4. 提交前至少跑 `pnpm test` 与 `pnpm pack:check`。

## 发布

- AI 只准备到“可发布”，不执行 `npm publish`、不推 tag；发布由用户明确授权。
- **本地打包必须由用户显式指令触发**（`本地打包` / `本地版本` / `候选包`）。完成 issue、修复、测试或提交后，不得自动改版本号、写 CHANGELOG local 块、`npm run pack` 或安装本地包。本地构建记录写 CHANGELOG 顶部 `-local.N` 块（中间产物）；正式发布时合并进正式块并删除，最终历史不保留 local 块。
- npm 包只含 `lib` / `cordis.patch.yml` / `locale` / `README.md` / `LICENSE`。
- 发布流程见 `docs/release.md` 与 `.agents/skills/dsh-token-dash-release/SKILL.md`；历史发布 checklist 见 `docs/checklist/archived/dsh/token-dash-release-checklist.md`。

## 安全

- 不读取 `~/.dsh/.credentials.yaml`；凭据只经宿主 `ctx.credentials.resolve(...)`。
- 余额查询仅限 DeepSeek / Kimi / GLM 官方接口；第三方显示“第三方不支持”且不请求。
- 密钥、cookie、token 不得出现在源码、日志、fixture 或提交信息中。

## 变更纪律

- 先更新 plan / checklist，再改代码；改动范围以施工稿声明为准。
- 不顺手改边界外文件；需要越界时先更新文档并重新确认。
- 新增依赖前说明理由；运行时依赖保持最少（当前仅 `zod`）。
