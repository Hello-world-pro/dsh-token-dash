# 发版流程

一页 checklist。每步有易错点说明，照做即可。

## 步骤

1. **版本号**：`package.json` 的 `version` 改为目标版本（如 `1.0.1`）。
   - `index.js` 的 `CURRENT_VERSION` 读自 package.json，自动生效
   - 易错点：`scripts/e2e.mjs` 的 fixture 有两处版本字符串（`baseSummary.version` 与 update mock 的 `current`），**必须同步改**，否则 E2E 断言失败

2. **CHANGELOG**：`CHANGELOG.md` 顶部加新版本段（`## [X.Y.Z] - YYYY-MM-DD`），只写**新增**与**修改**两组。

3. **测试**：`npm test`（L1）+ `npm run e2e` 全绿再继续。

4. **提交**：`git add -A && git commit -m "chore: release X.Y.Z" && git push`。

5. **打 tag**：`git tag vX.Y.Z && git push origin vX.Y.Z`。
   - push tag 会触发 `.github/workflows/release.yml`：自动 `npm pack` → 创建 GitHub Release 并附 tarball
   - 易错点：tag 必须带 `v` 前缀且与 package.json 版本一致（CI 有校验）

6. **Release notes**：把 CHANGELOG 的新版本段存成临时文件，执行
   `gh release edit vX.Y.Z --notes-file <file>`。
   - **禁止** `--notes "内联多行字符串"`——shell 会破坏 ``` fence 导致渲染乱码（v1.0.0 踩过）
   - notes 末尾可附"安装"块（两种安装命令）

7. **（未启用）npm 发布**：接入后走 tag 触发的 publish workflow（参考 dsh-token-usage-lao 的 Trusted Publishing 模式），并提醒用户从 `github:` 名切 npm 名需先 remove 再 add。

## 产物归位

- tarball 在 `build/`（gitignore，不入库）
- Release 页产物 = 自动 pack 的 tarball（可作离线安装源）
