---
name: dsh-token-dash-release
description: 管理 dsh-token-dash 的 CHANGELOG 整理、版本发布、npm/GitHub Release 核验与 Release notes 修复。仅当前工作区是 dsh-token-dash，且任务涉及整理 changelog、发版、发布、打 tag、补 Release notes 时使用；离开本仓不触发。
---

# DSH Token Dash 发布

## 仓库检查

开始前确认当前工作区是 dsh-token-dash，并核对：

- `AGENTS.md`、`package.json`、`CHANGELOG.md`、`docs/release.md`
- `.github/workflows/release.yml`、`.github/workflows/publish.yml`
- `scripts/release-notes.mjs`、`scripts/e2e.mjs`、`test/unit/`
- `references/official-release-version.md`

## 动作

| 动作 | 触发词 | 结果 |
| --- | --- | --- |
| 整理 CHANGELOG | `整理 changelog`、`优化 changelog` | 只保留当前待发布版本 + 上次发布版本；当前块聚合上次发布以来的全部变更；输出预览，不发布 |
| 正式发布 | `发版`、`发布版本`、`正式发布` | 校验版本与 CHANGELOG、跑测试、提交推送、打 tag、等双 workflow、核验 npm/Release |
| 补 Release notes | `release notes 不对`、`Release 为空` | 从 CHANGELOG 当前块生成 body，`gh release edit` 后复查 |

## 版本基准

1. 唯一基准是 `references/official-release-version.md` 的「最新已发布版本」；不得从本地 `package.json`、tarball 或 `build/` 推断线上版本。
2. 发布前核验：`npm view dsh-token-dash dist-tags --json` 的 `latest` 与 `gh release view v<version>` 的 tag 必须与记录一致；不一致时停止，先修正记录。
3. 版本号由用户确认；本仓按语义化版本：纯修复升 PATCH，新增功能升 MINOR，破坏性变更升 MAJOR。
4. 本地安装不是发布；未推 tag 前不得声称已上线。

## CHANGELOG 口径（2026-11-02 定案）

- 文件只保留两个版本块：**当前要发布的版本** + **上次已发布版本**；更早版本删除。
- 当前版本块必须聚合**自上次发布以来**的全部用户可见变更，不能只写最后一轮修复。
- 标题固定 `## [X.Y.Z] - YYYY-MM-DD`；正文固定 `### 新增` / `### 修改`，无内容可省略对应段。
- 每条写用户可感知的「对象 + 结果」；不写实现细节、测试环境、内部模块名和提交信息。
- 发布正文必须与 CHANGELOG 当前块逐段一致；不得使用 GitHub 自动生成的空 body 或只有 Full Changelog 的 body。

## 发布预览闸门

整理完 CHANGELOG 后先停在审阅点：

1. 输出本次 `新增 / 修改` 完整预览，并给出 `[CHANGELOG.md](<绝对路径>)`。
2. 说明当前只完成文档预览，未跑测试、未提交、未打 tag。
3. 用户确认后才能继续；用户要求调整时重新整理并再次预览。

## 正式发布

1. 确认工作区只有本次发布相关改动（`.tmp/`、`build/` 不入库）。
2. 运行 `npm test` 与 `npm run e2e`；全绿后继续。
3. 生成 Release notes 预览：`node scripts/release-notes.mjs <version>`。
4. 运行 `npm run pack`，确认 `build/dsh-token-dash-<version>.tgz`。
5. 提交：`git add -A && git commit -m "chore: release <version>"`，推送 `main`。
6. 创建并推送 tag：`git tag -a v<version> -m "<version>" && git push origin v<version>`。
7. 等待两个 workflow 成功：`gh run watch <id> --exit-status`（`release` 与 `publish`）。
8. 核验 npm：`npm view dsh-token-dash dist-tags --json` 的 `latest` 必须是 <version>；npm 处理可能延迟数分钟，轮询而非立即判定失败。
9. 核验 GitHub Release：`gh release view v<version> --json body,assets`。body 必须等于 CHANGELOG 当前块；assets 必须含 `dsh-token-dash-<version>.tgz`。
10. body 为空、缺失或与 CHANGELOG 不一致时立即修复：

```bash
node scripts/release-notes.mjs <version> --out build/release-notes-<version>.md
gh release edit v<version> --notes-file build/release-notes-<version>.md
gh release view v<version> --json body
```

11. 发布成功后更新 `references/official-release-version.md`（版本、tag、日期、Release URL），单独提交并推送。

## 阻断条件

- 版本基准与 npm latest / GitHub latest Release / tag 不一致。
- CHANGELOG 不是「当前 + 上次」两版本结构，或当前块未聚合全部变更。
- `npm test` 或 `npm run e2e` 失败。
- 工作区混入无关文件、`.tmp/`、`build/` 或真实凭证。
- Release body 为空、只有 Full Changelog、或与 CHANGELOG 不一致。
- npm latest 未指向目标版本（等待超过 10 分钟仍不生效）。

## 结果回报

版本、CHANGELOG 预览、测试结果、提交 SHA、tag、两个 workflow 结论、npm latest、Release URL / body 校验、版本记录提交 SHA。
