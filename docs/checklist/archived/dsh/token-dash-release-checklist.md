# dsh-token-dash 发布 checklist（npm + GitHub）

> 依据 plan：`../../../plan/active/feature_token_dash.md` §十<br>
> 状态：已完成并归档（2026-11-01）——npm v1.0.2（latest）、GitHub Release v1.0.0-v1.0.2 齐备、市场 PR #11130 已提；发版流程唯一来源：`docs/release.md`<br>
> 工程根：`dsh-token-dash`（包名 `dsh-token-dash`）

## 最终成果

| 通道 | 结果 |
|---|---|
| npm | ✅ `dsh-token-dash@1.0.2`（latest）；Trusted Publishing OIDC 直发，零 token、含 provenance |
| GitHub Release | ✅ v1.0.0 / v1.0.1 / v1.0.2 + tarball；`release.yml` 全自动 |
| 仓库直装 | ✅ `github:spartawhy117/dsh-token-dash` |
| 市场收录 | PR [#11130](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11130) 等评审 |
| 验证 | ✅ 干净 profile npm 安装；检查更新链路生效；npm 安装 / `update` 路径通过 |

发版形态：改版本（package.json + E2E fixture 两处）→ CHANGELOG → 测试 → 推 `v*` tag → GitHub Release + npm 全自动上线。

## 遗留

| 项 | 谁做 | 说明 |
|---|---|---|
| 删除 npm 侧 stage-only token | 用户 | token 曾暴露于对话明文；Trusted Publishing 后不再需要任何 token |
| 收录 PR 评审 | 自动 | 合并后 README 加 awesome badge |

## 踩坑沉淀

- granular token 无法预授权未发布的包：新包选 All packages（stage-only + 短过期可接受）。
- granular token 直发权限 2027-01 废弃：改用 staged publishing 或 Trusted Publishing（OIDC）。
- staged 审批后 `latest` 不自动移动：需 `npm dist-tag add <pkg>@<ver> latest`；OIDC 直发无此问题。
- Trusted Publishing 需包已存在才能配置，且须在 2 天内成功发布一次验证（v1.0.2 即验证首发）。
- `softprops/action-gh-release`（不是 gh-action-release）；workflow_dispatch 需显式 `tag_name`。

## 归档

2026-11-01 回写 plan §十后压缩归档；执行过程见 git 历史。

