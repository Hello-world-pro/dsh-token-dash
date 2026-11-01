---
name: dsh-token-dash-release
description: 管理 dsh-token-dash 的本地候选包、CHANGELOG 修改历史、正式发布、npm/GitHub Release 核验与 Release notes 修复。仅当前工作区是 dsh-token-dash，且任务涉及本地打包、整理 changelog、发版、发布、打 tag、补 Release notes 时使用；离开本仓不触发。
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
| 本地打包 | `本地打包`、`本地版本`、`候选包` | 版本改为 `X.Y.Z-local.N`；顶部新增/更新 local CHANGELOG 块；测试、打包、可选本地安装；不 tag、不发布 |
| 整理 CHANGELOG | `整理 changelog`、`优化 changelog` | 维护“完整正式历史 + 顶部 local 草稿”；正式目标先合并 local 块并输出预览 |
| 正式发布 | `发版`、`发布版本`、`正式发布` | 合并并删除 local 块，生成正式块；测试、提交、tag、双 workflow、核验 npm/Release |
| 补 Release notes | `release notes 不对`、`Release 为空` | 按 tag 版本从 CHANGELOG 生成 body，`gh release edit` 后复查 |

## 版本与历史模型

1. `CHANGELOG.md` 是修改历史存储：**所有已发布的正式版本永久保留**，按时间倒序，不删除旧版本。
2. 本地构建用 `X.Y.Z-local.N`，对应 CHANGELOG 顶部 local 块，例如 `## [1.0.6-local.1] - 2026-11-02`；每个 local 包都记录一次它的修改。
3. local 块只服务当前本地验证，不对外发布；**正式发布时，把自上次正式版以来的所有 local 块内容合并进新正式块，然后删除这些 local 块**。
4. 正式块聚合自上次正式发布以来的全部用户可见变更；合并后 CHANGELOG 只剩“完整正式历史”，不残留 local 版本号。
5. 唯一版本基准是 `references/official-release-version.md` 的「最新已发布版本」，local 版本不更新基准、不参与计算。
6. 发布前核验：`npm view dsh-token-dash dist-tags --json` 的 `latest` 与 `gh release view v<version>` 的 tag 必须与记录一致。
7. 版本号由用户确认；纯修复升 PATCH，新增功能升 MINOR，破坏性变更升 MAJOR。
8. local 版本禁止打 tag、禁止触发 `release`/`publish` workflow；未推 tag 前不得声称已上线。

## CHANGELOG 写法

- 正式块与 local 块都使用 `## [版本] - YYYY-MM-DD`，正文固定 `### 新增` / `### 修改`，无内容可省略对应段。
- local 块标题下加一行 `> 本地构建，未发布`。
- 每条写用户可感知的“对象 + 结果”；不写实现细节、测试环境、内部模块名和提交信息。
- 正式块的 Release body 必须与该正式块逐段一致；不得使用 GitHub 自动生成的空 body 或只有 Full Changelog 的 body。
- 发布正文按 tag 版本提取，不按“文件第一块”提取；这样即使顶部还有 local 草稿也不会串版。

## 本地打包（不发布）

1. 执行版本基准核验；确认目标 base 版本与下一个 `-local.N`（同 base 取 CHANGELOG / 历史 local 最大值 +1）。
2. 更新 `package.json` 为 `X.Y.Z-local.N`；同步 `scripts/e2e.mjs` 两处版本 fixture（`baseSummary.version`、update mock 的 `current`）。
3. 在 CHANGELOG 顶部新增或更新该 local 块，记录本次修改。
4. 运行 `npm test` 与 `npm run e2e`；全绿后 `npm run pack`，确认 `build/dsh-token-dash-X.Y.Z-local.N.tgz`。
5. 可选本地安装：`dsh plugin --profile desktop add build/dsh-token-dash-X.Y.Z-local.N.tgz`。
6. 停止：不创建 tag、不推送发布 tag、不触发 release/publish；是否提交由用户决定。

## 整理 CHANGELOG

1. 区分目标：local 只整理 local 块；正式目标先确认版本号，再把自上次正式版以来的 local 块内容合并进新正式块并删除 local 块。
2. 输出完整预览（新增/修改）与 `[CHANGELOG.md](<绝对路径>)`，停在审阅点；未确认不继续。
3. 用户要求调整时重新整理并再次预览。

## 正式发布

1. 确认工作区只有本次发布相关改动（`.tmp/`、`build/` 不入库）。
2. 确认 CHANGELOG 顶部已无 `-local` 块，正式块已聚合全部变更；生成 `node scripts/release-notes.mjs <version>` 预览。
3. 运行 `npm test` 与 `npm run e2e`；全绿后 `npm run pack`，确认 `build/dsh-token-dash-<version>.tgz`。
4. 提交：`git add -A && git commit -m "chore: release <version>"`，推送 `main`。
5. 创建并推送 tag：`git tag -a v<version> -m "<version>" && git push origin v<version>`。
6. 等待两个 workflow 成功：`gh run watch <id> --exit-status`（`release` 与 `publish`）。
7. 核验 npm：`npm view dsh-token-dash dist-tags --json` 的 `latest` 必须是 <version>；npm 处理可能延迟数分钟，轮询而非立即判定失败。
8. 核验 GitHub Release：`gh release view v<version> --json body,assets`。body 必须等于 CHANGELOG 对应正式块；assets 必须含 `dsh-token-dash-<version>.tgz`。
9. body 为空、缺失或与 CHANGELOG 不一致时立即修复：

```bash
node scripts/release-notes.mjs <version> --out build/release-notes-<version>.md
gh release edit v<version> --notes-file build/release-notes-<version>.md
gh release view v<version> --json body
```

10. 发布成功后更新 `references/official-release-version.md`（版本、tag、日期、Release URL），单独提交并推送。

## 阻断条件

- 版本基准与 npm latest / GitHub latest Release / tag 不一致。
- 正式发布时 CHANGELOG 仍残留 `-local` 块，或正式块未聚合全部变更。
- 试图给 `-local` 版本打 tag 或发布。
- `npm test` 或 `npm run e2e` 失败。
- 工作区混入无关文件、`.tmp/`、`build/` 或真实凭证。
- Release body 为空、只有 Full Changelog、不是对应正式块，或与 CHANGELOG 不一致。
- npm latest 未指向目标版本（等待超过 10 分钟仍不生效）。

## 结果回报

本地打包：local 版本、CHANGELOG 块、测试、tarball、安装/提交状态。

正式发布：版本、合并的 local 块数量、正式 CHANGELOG 预览、测试、提交 SHA、tag、两个 workflow 结论、npm latest、Release URL / body 校验、版本记录提交 SHA。
