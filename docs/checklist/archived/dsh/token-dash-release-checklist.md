# dsh-token-dash 发布 checklist（npm + GitHub）

> 依据 plan：`../../../plan/active/dsh/feature_token_dash.md` §十<br>
> 状态：**已完成并归档**（2026-11-01）——npm v1.0.2 上线（Trusted Publishing OIDC 验证通过）、GitHub Release 齐备、市场收录 PR 已提；发版流程唯一来源：`docs/release.md`<br>
> 工程根：`dsh-token-dash`（包名 `dsh-token-dash`）

## 最终成果

| 通道 | 状态 | 说明 |
|---|---|---|
| npm | ✅ `dsh-token-dash@1.0.2`（latest） | Trusted Publishing OIDC 直发，零 token、含 provenance |
| GitHub Release | ✅ v1.0.0 / v1.0.1 / v1.0.2 + tarball | `release.yml` 全自动 |
| 仓库直装 | ✅ `github:spartawhy117/dsh-token-dash` | 纯 JS 源码即产物，长期可用 |
| 市场收录 | PR [#11130](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11130) | 等评审；合并后 dshmarket/Cockpit 自动收录 |
| 验证 | ✅ | 干净 profile npm 安装 `+1.0.1`；检查更新链路生效（registry latest 真实返回）；npm 安装/`update` 路径通过 |

**发版形态（终态）**：改版本（package.json + e2e fixture 两处）→ CHANGELOG → 测试 → 推 `v*` tag → GitHub Release + npm 全自动上线。流程细节与易错点见 `docs/release.md`。

## 遗留

| 项 | 谁做 | 说明 |
|---|---|---|
| 删除 npm 网站的 stage-only token | 用户 | token 曾暴露于对话明文；Trusted Publishing 后不再需要任何 token |
| 收录 PR 评审 | 自动 | 合并后 README 加 awesome badge |

## 踩坑沉淀（可复用）

1. **granular token 无法预授权未发布的包**：新包 token 选 "All packages"（stage-only 低危 + 短过期可接受）。
2. **granular token 直发权限（publish and stage）2027-01 废弃**：官方推荐 staged publishing（stage only + 2FA 审批）或 Trusted Publishing（OIDC）。
3. **staged 审批后 `latest` 不自动移动**：占位版本 `0.0.0-stage` 先占 latest——需 `npm dist-tag add <pkg>@<ver> latest`，否则用户装到空壳。
4. **Trusted Publishing 需包已存在才能配置**（包设置页菜单），且新建配置须在 **2 天内**成功发布一次验证（v1.0.2 即为验证首发）；OIDC 直发模式无踩坑 3 的 dist-tag 问题。
5. **`softprops/action-gh-release`**（不是 gh-action-release）；workflow_dispatch 模式需显式 `tag_name`（无 tag 上下文）。
6. **工具坑**：大段 replace 时 new_str 未含尾部章节会误删内容 + read_file 偶发误报空文件——python 直读写兜底。

## 执行日志

- 2026-10-31：初稿（npm 主分发 + GitHub 源 + tarball 兜底）。
- 2026-11-01：GitHub v1.0.0 → 治理体系 → npm v1.0.1（staged publishing 四轮修正后闭环：Trusted Publishing 不可预配置 → NPM_TOKEN 模式遇废弃警告 → 官方文档查证改 staged → CLI 版本修正）→ GitHub v1.0.1 Release 补齐 → awesome PR #11130 → Trusted Publishing 配置（用户）→ v1.0.2 OIDC 验证发布（2 天窗口内）→ 终态：推 tag 全自动。
- 2026-11-01：回写 feature §十（npm 通道上线 + 终态 + 待办）后压缩归档。
