# 发版流程

一页 checklist。发布动作以 `.agents/skills/dsh-token-dash-release/SKILL.md` 为准，本页只列操作顺序与易错点。

## 步骤

1. **版本基准**：读 `.agents/skills/dsh-token-dash-release/references/official-release-version.md` 的「最新已发布版本」，并用 `npm view dsh-token-dash dist-tags --json` 与 `gh release view vX.Y.Z` 核验；不一致时停止。
   - 版本号由用户确认；纯修复升 PATCH，新增功能升 MINOR，破坏性变更升 MAJOR。

2. **版本号**：`package.json` 的 `version` 改为目标版本。
   - `index.js` 的 `CURRENT_VERSION` 读自 package.json，自动生效
   - 易错点：`scripts/e2e.mjs` 有两处版本字符串（`baseSummary.version` 与 update mock 的 `current`），**必须同步改**，否则 E2E 断言失败

3. **CHANGELOG**：只保留**当前要发布版本** + **上次发布版本**两个块；当前块聚合上次发布以来的全部用户可见变更，固定 `### 新增` / `### 修改`。
   - 先在对话中输出完整预览并等用户确认，再跑测试/提交
   - Release body 必须与 CHANGELOG 当前块逐段一致；禁止内联 `--notes`

4. **测试**：`npm test`（L1）+ `npm run e2e` 全绿再继续。

5. **提交**：`git add -A && git commit -m "chore: release X.Y.Z" && git push`。
   - 确认工作区无 `.tmp/`、`build/`、真实凭证等无关文件

6. **打 tag**：`git tag -a vX.Y.Z -m "X.Y.Z" && git push origin vX.Y.Z`。push tag 自动触发两个 workflow：
   - `release.yml`：`npm run pack` → 从 CHANGELOG 生成 notes → 创建 GitHub Release 并附 tarball
   - `publish.yml`：校验 tag 与版本一致 → L1 → `npm publish --provenance`（OIDC Trusted Publishing，无需人工审批）
   - 易错点：tag 必须带 `v` 前缀且与 package.json 版本一致（CI 有校验）

7. **核验**：
   - `npm view dsh-token-dash dist-tags --json` 的 `latest` 必须是 X.Y.Z；npm 处理可能延迟数分钟，轮询而非立即判定失败
   - `gh release view vX.Y.Z --json body,assets`：body 必须包含 `### 新增` / `### 修改`，assets 必须含 `dsh-token-dash-X.Y.Z.tgz`
   - body 为空或只有 Full Changelog 时立即修复：
     `node scripts/release-notes.mjs X.Y.Z --out build/release-notes-X.Y.Z.md`
     然后 `gh release edit vX.Y.Z --notes-file build/release-notes-X.Y.Z.md`

8. **发布记录**：更新 `.agents/skills/dsh-token-dash-release/references/official-release-version.md`（版本、tag、日期、Release URL），单独提交并推送。

## 产物归位

- tarball 在 `build/`（gitignore，不入库）
- Release 页产物 = 自动 pack 的 tarball（可作离线安装源）
- npm 安装：`dsh plugin --profile desktop add dsh-token-dash@X.Y.Z`
