# 发版流程

一页 checklist。每步有易错点说明，照做即可。

## 步骤

1. **版本号**：`package.json` 的 `version` 改为目标版本（如 `1.0.2`）。
   - `index.js` 的 `CURRENT_VERSION` 读自 package.json，自动生效
   - 易错点：`scripts/e2e.mjs` 的 fixture 有两处版本字符串（`baseSummary.version` 与 update mock 的 `current`），**必须同步改**，否则 E2E 断言失败

2. **CHANGELOG**：`CHANGELOG.md` 顶部加新版本段（`## [X.Y.Z] - YYYY-MM-DD`），只写**新增**与**修改**两组。

3. **测试**：`npm test`（L1）+ `npm run e2e` 全绿再继续。

4. **提交**：`git add -A && git commit -m "chore: release X.Y.Z" && git push`。

5. **打 tag**：`git tag vX.Y.Z && git push origin vX.Y.Z`。push tag 自动触发两个 workflow：
   - `release.yml`：`npm pack` → 创建 GitHub Release 并附 tarball（**全自动**）
   - `publish.yml`：校验 tag 与版本一致 → L1 → `npm stage publish`（**npm 侧到暂存为止**）
   - 易错点：tag 必须带 `v` 前缀且与 package.json 版本一致（CI 有校验）

6. **npm 审批上线**（staged publishing，人工关口）：
   - npmjs.com → Packages → **Staged Packages** → 找到待审批版本 → **Approve**（2FA）
   - **移 latest 标签**：staged 审批后 `latest` 不会自动移到新版本，执行
     `npm dist-tag add dsh-token-dash@X.Y.Z latest`（用 stage-only token；不移的话用户 `npm i` 装到的还是旧版）
   - 新包首次 stage 会出现 `0.0.0-stage` 占位版本，属官方流程，可在 Versions 页 unpublish

7. **Release notes**：把 CHANGELOG 的新版本段存成临时文件，执行
   `gh release edit vX.Y.Z --notes-file <file>`。
   - **禁止** `--notes "内联多行字符串"`——shell 会破坏 ``` fence 导致渲染乱码（v1.0.0 踩过）
   - notes 末尾可附"安装"块（npm / github: / tgz 三种安装命令）

## 完全自动选项：Trusted Publishing

包设置（npmjs.com → dsh-token-dash → Settings → Trusted publishing）添加：
GitHub Actions / `spartawhy117` / `dsh-token-dash` / `publish.yml`，**Allowed actions 勾选 "npm publish"**。
之后推 tag 即全自动直发 npm（免 token、含 provenance），步骤 6 整个消失。
注意：`publish.yml` 需同步改回 OIDC 模式（`npm stage publish` → `npm publish`，去掉 NODE_AUTH_TOKEN）。

## 产物归位

- tarball 在 `build/`（gitignore，不入库）
- Release 页产物 = 自动 pack 的 tarball（可作离线安装源）
