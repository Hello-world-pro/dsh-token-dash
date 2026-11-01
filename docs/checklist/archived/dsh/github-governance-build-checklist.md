# GitHub Issue 治理体系搭建（标签 / 模板 / Actions / 英文 README）

> 依据：JvedioNext 治理体系（2026-11-01 gh api 取证）<br>
> 状态：已完成并归档（阶段 1-4 全部 ✅，用户网页验收通过；已回写 feature §十）<br>
> 工程根：`dsh-token-dash`；提交：`acfc1a1`

## 交付

| 项 | 结果 |
|---|---|
| 标签 | 11 个英文名：`bug` / `enhancement` / `ui` / `data` / `logging` / `install-update` / `other` / `fixed` / `wontfix` / `triage` / `template-incomplete`；描述中文，色值见 GitHub |
| 模板 | `.github/ISSUE_TEMPLATE/{bug-report,feature-request,config}.yml`；单模板内中英双语，下拉选项双语进入 issue body |
| Actions | `issue-template-compliance.yml`（必填 / 图标附件 / 模块标签映射）、`issue-template-close.yml`（2h 超时关闭） |
| 英文 README | `README.en.md` 与中文同构，中英互链；复用 `docs/pic` 截图 |
| 改动边界 | 不改 `release.yml`、`src/`、`client.js`、`index.js` |

## Actions 行为

| workflow | 核心行为 |
|---|---|
| compliance | 空段 / `_No response_` / 占位文字 = 违规；**日志附件校验仅限 `bug`**，必须含 `github.com/user-attachments/` 或 `.zip/.log/.txt` Markdown 链接；违规打 `template-incomplete` + 评论列缺失项（2h 补充期）；模块中文选项映射英文标签；通过后移除标签与评论 |
| close | 每 30 分钟扫描带 `template-incomplete` 的 open issue；合规评论超 2h 未补全 → 自动关闭并留言重新提交 |

## 验证

| 用例 | 结果 | 证据 |
|---|---|---|
| 标签 11 个就位 | ✅ | `gh label list` 核对；3 个 edit 默认 + 8 个 create |
| 模板渲染 / 模块多选 / 空白入口禁用 | ✅ | 用户网页验收通过；Blank issue 显示 Maintainers only = `blank_issues_enabled: false` 平台机制生效 |
| 自动打标 / 附件校验 / 2h 关闭 | 未逐项实测 | 与 JvedioNext 同构；不额外造测试 issue，待首个真实 issue 自然验证 |
| 英文 README | ✅ | 渲染正常、中英互跳正常；npm 安装命令当时占位，发布后解注 |

## 决策与踩坑

- 标签 14 → 11：UI 三模块合并 `ui`、数据两域合并 `data`，模块标签与模板下拉一一对应。
- 模板不依赖官方 i18n：单模板内“中文 / English”并列；compliance 按关键词匹配（界面|UI→`ui` 等）。
- 日志附件必填只针对 bug；enhancement 模板本无日志段，不校验附件。
- 合规评论用 `<!-- issue-template-compliance -->` marker 匹配；`readme-weekly-report` 不搬。

## 回写

- feature §十补记治理基建与英文 README（已回写，2026-11-01）。

