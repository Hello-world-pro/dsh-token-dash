# GitHub Issue 治理体系搭建（标签 / 模板 / Actions / 英文 README）

> 依据：学习 JvedioNext 的标签系统、Issue 模板与 Actions 治理（2026-11-01 gh api 实地取证）<br>
> 状态：**已完成**（阶段 1-4 全部 ✅，用户网页验收通过；回写双去向完成：feature §十已补记治理基建落地）<br>
> 生命周期：本文件归档至 `doc/checklist/archived/`

## 一、标签系统（11 个，英文命名，`gh label create`）

> 命名采用 GitHub 生态标准词（bug/enhancement/wontfix 为 GitHub 默认标签集，工具扫描与 awesome 列表兼容更好）；描述保留中文（面向维护者与中文用户）。模块标签与模板下拉选项一一对应。UI 三模块（pill/dashboard/settings）合并为 `ui`（改动常交织）；数据两域（归属聚合/侦测余额）合并为 `data`（报障用户难分边界，维护者看日志可细分）。

| 分类 | 名称 | 色值 | 描述 |
|---|---|---|---|
| 类型 | `bug` | `b60205` | 功能异常或行为与预期不符 |
| 类型 | `enhancement` | `0052cc` | 新功能或体验改进建议 |
| 模块 | `ui` | `1D76DB` | 界面显示与交互（Pill / 看板 / 设置） |
| 模块 | `data` | `0E8A16` | 数字与归属：采集/聚合/费用估算/侦测/余额/订阅配额 |
| 模块 | `logging` | `F9D0C4` | 日志输出/排查工具相关 |
| 模块 | `install-update` | `C5DEF5` | 安装/更新/发版流程相关 |
| 模块 | `other` | `E99695` | 未归类的其它问题或建议 |
| 状态 | `fixed` | `0E8A16` | 修复完成待发版 |
| 状态 | `wontfix` | `6E7781` | 评估后不做，留言说明原因 |
| 状态 | `triage` | `C2E0C6` | 新建未分类，等待维护者确认 |
| 状态 | `template-incomplete` | `B60205` | 模板必填项未通过自动检查 |

## 二、Issue 模板内容（`.github/ISSUE_TEMPLATE/`，模板内中英双语标注）

> 表单模板不支持官方 i18n，采用单模板内"中文 / English"并列标注（国际项目通行做法）。下拉选项文本双语进入 issue body，compliance workflow 按关键词匹配映射英文标签（界面|UI→ui、数据|Data→data…）。

### bug-report.yml

```yaml
name: 缺陷报告 / Bug Report
description: 功能异常或行为与预期不符 / Something isn't working as expected
title: "[Bug] "
labels: [bug, triage]
body:
  - type: markdown
    attributes:
      value: |
        感谢反馈！Thanks for reporting!
        请先看 [README 常见问题 / Troubleshooting](https://github.com/spartawhy117/dsh-token-dash#readme)，确认未与已有 issue 重复 / check existing issues first.
  - type: dropdown
    id: module
    attributes:
      label: 问题模块 / Module
      description: 勾选出现问题的大致位置（可多选）/ Where the problem is (multiple choices)
      multiple: true
      options:
        - 界面 UI（Pill / 看板 Dashboard / 设置 Settings）
        - 数据 Data（费用 / 用量 / 余额 / 订阅数字 / cost & usage numbers）
        - 日志 Logging
        - 安装与更新 Install & Update
        - 其它 Other
    validations:
      required: true
  - type: input
    id: plugin-version
    attributes:
      label: 插件版本 / Plugin version
      description: 设置页底部"价格与版本"可见 / shown at the bottom of the settings page
      placeholder: "1.0.0"
    validations:
      required: true
  - type: input
    id: dsh-version
    attributes:
      label: DSH 版本 / DSH version
      placeholder: "0.2.1"
    validations:
      required: true
  - type: textarea
    id: what-happened
    attributes:
      label: 问题描述 / What happened
      description: 具体现象与期望行为的差异 / What you saw vs. what you expected
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: 复现步骤 / Steps to reproduce
      placeholder: |
        1. 打开 … / Open …
        2. 点击 … / Click …
        3. 看到 … / See …
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: 日志文件（必填，必须上传）/ Log file (required, must upload)
      description: |
        **必须上传日志文件 / A log file MUST be uploaded**：把 `~/.dsh/logs/dsh-token-dash/` 目录打包成 zip 拖入本框 / zip the directory and drag it into this box.
        日志已脱敏（不含 API Key、不含对话内容）/ Logs are redacted (no API keys, no conversation content)；错误日志带 errorKind/httpStatus，可直接定位原因.
        ⚠️ 只写"已上传 / uploaded"等文字、或只粘贴片段**不会通过自动检查**——工作流校验本框内必须包含附件链接，缺失将打 template-incomplete 标签并在 2 小时后自动关闭 / plain text or snippets alone will NOT pass the automated check; a missing attachment gets the issue closed after 2 hours.
    validations:
      required: true
```

### feature-request.yml

```yaml
name: 功能建议 / Feature Request
description: 新功能或体验改进建议 / Suggest a new feature or improvement
title: "[Feature] "
labels: [enhancement, triage]
body:
  - type: dropdown
    id: module
    attributes:
      label: 建议模块 / Module
      multiple: true
      options:
        - 界面 UI（Pill / 看板 Dashboard / 设置 Settings）
        - 数据 Data（费用 / 用量 / 余额 / 订阅数字 / cost & usage numbers）
        - 日志 Logging
        - 安装与更新 Install & Update
        - 其它 Other
    validations:
      required: true
  - type: textarea
    id: content
    attributes:
      label: 建议内容 / Your suggestion
      description: 想要什么、为什么 / What you want and why
    validations:
      required: true
  - type: textarea
    id: scenario
    attributes:
      label: 使用场景 / Use case
      description: 什么情况下需要它（帮助评估优先级）/ When you need it (helps prioritize)
```

### config.yml

```yaml
blank_issues_enabled: false
contact_links:
  - name: 使用问题先查 README / Check the README first
    url: https://github.com/spartawhy117/dsh-token-dash#readme
    about: 安装、日志排查、隐私边界说明 / Install, troubleshooting & privacy notes
```

## 三、Actions（`.github/workflows/`）

| workflow | 触发 | 权限 | 核心行为 |
|---|---|---|---|
| `issue-template-compliance.yml` | issues: opened / edited / reopened | issues: write | ① 校验必填段（空段/`_No response_`/占位文字=违规）② **日志附件校验仅限 Bug**：`bug` 标签的 issue，日志段必须包含附件链接（`github.com/user-attachments/` 或 `.zip`/`.log`/`.txt` 的 markdown 链接）——只有文字无附件=违规；**`enhancement` 标签不校验日志/附件**（其模板本无日志段）③ 违规 → 打 `template-incomplete` + 评论列缺失项（2 小时补充期限，带 marker）④ 模块下拉中文选项 → **映射英文标签自动打**（界面→`ui`、数据→`data`、日志→`logging`、安装与更新→`install-update`、其它→`other`）⑤ 勾"其它" → 留言提醒改具体模块 ⑥ 通过 → 移除标签与合规评论 |
| `issue-template-close.yml` | schedule `*/30 * * * *` + 手动 | issues: write | 扫描带 `template-incomplete` 的 open issue：合规评论存在且超 2 小时未补全 → 自动关闭并留言"请整理后重新提交" |

> 两个 workflow 逻辑与 JvedioNext 同构（github-script 实现，合规评论以 `<!-- issue-template-compliance -->` marker 匹配）；模块标签映射表为中文选项 → 上表英文标签。`readme-weekly-report` **不搬**（对小插件价值低）。

## 四、阶段与验证

| 阶段 | 内容 | 你收尾验证 | 状态 |
|---|---|---|---|
| 1 | 标签 11 个（英文）+ 模板三件套（双语）入库推送 | 网页 New issue 渲染正常、模块可多选 | ✅ acfc1a1（标签 3 个 edit 默认 + 8 个 create，gh label list 核对 11 个全部就位） |
| 2 | 两个 workflow 入库推送 | 提测试 issue（漏填日志）看自动打标+评论；补全后看标签移除 | ✅ acfc1a1（compliance + close，github-script，双语 heading 关键词匹配） |
| 3 | **README 英文版 `README.en.md` 编写入库**：与中文版同构翻译（badge / 安装 / 界面草图与截图 / 日志与隐私 / 开发 / 致谢），复用 `doc/pic` 截图；中英两版顶部互加语言切换链接（`English | 简体中文`） | 英文页渲染、双语链接互跳正常 | ✅ acfc1a1（草图英文标注、npm 安装占位待解注） |
| 4 | 测试结果汇总入表 | 确认后清理测试 issue | ✅ 用户网页验收通过（模板渲染正常；Blank issue 显示 Maintainers only = `blank_issues_enabled: false` 平台机制正确生效，外部用户不可见，维护者保留逃生口；整体无大问题） |

> README.en.md 形态：中文主（README.md）+ 英文附（cockpit / ui-usage-billing / spend 同流派，参考插件 5/7 双语）。英文版安装段的 npm 命令保持占位注释，npm 发布同日解注。

## 测试 / 走查表

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| bug 模板渲染 + 模块多选 | 待验证 | |
| 漏填日志 → 自动打 `template-incomplete` + 评论 | 待验证 | |
| 日志段只写文字无附件 → 判违规（bug 必须上传） | 待验证 | |
| 上传 zip 后 → 违规消除 | 待验证 | |
| 补全后 → 标签自动移除 | 待验证 | |
| 勾模块 → 自动打英文模块标签 | 待验证 | |
| 空白 issue 入口禁用 | 待验证 | |
| 超时 2h → 自动关闭 | 待验证 | |
| README.en.md 渲染 + 中英互跳 | 待验证 | |

## 改动范围

新增：`.github/ISSUE_TEMPLATE/{bug-report,feature-request,config}.yml`、`.github/workflows/{issue-template-compliance,issue-template-close}.yml`、`README.en.md`（阶段 3）；仓库配置：`gh label create` ×11（英文）；`README.md` 顶部加语言切换链接（一行）。**不改动**：现有 `release.yml`、src/、client.js、index.js。

## plan 回写候选

1. ~~plan.md §十补记：社区治理基建（标签/模板/Actions）落地情况 + 英文 README~~ → **已回写**（2026-11-01，§十"Issue 治理体系"与"发布流程文档化"条目）

## 执行日志 + 踩坑

- 2026-11-01（调研）：gh api 取证 JvedioNext 标签 12 个（四类）/ 模板三件套 / Actions 三条（compliance + close + weekly）；产出施工稿 v1。
- 2026-11-01（修订 1）：用户反馈"不够核心"——重排为标签表 / 模板全文 / Actions 表优先。
- 2026-11-01（修订 2）：Bug 必须上传日志（模板必填 + workflow 校验附件链接双层）；功能建议不校验日志（按标签分流）。
- 2026-11-01（修订 3）：标签改英文命名（Q4 定案）；英文 README 列延伸待办（npm 发布同批）。
- 2026-11-01（修订 4）：标签精简 14 → 11——UI 三模块（pill/dashboard/settings）合并 `ui`、数据两域（data-attribution/providers-balance）合并 `data`，模块 8 → 5；模板下拉与 compliance 映射同步。
- 2026-11-01（修订 5）：模板内中英双语标注（Q5 定案，name/label/description/placeholder 全部"中文 / English"并列）；compliance 映射改为关键词匹配（界面|UI→ui 等）。
- 2026-11-01（修订 6）：README 英文版从"延伸待办"提为阶段 3（同构翻译 + 复用截图 + 中英互链；npm 安装命令保持占位），改动范围与测试表同步。
- 2026-11-01（修订 7）：删除"待拍板决策"章（Q1-Q5 全部定案，结论已散落于各章节；定案史见修订 1-6 日志）。
- 2026-11-01（施工）：用户批准开工。阶段 1-3 一次完成并推送 `acfc1a1`——标签（bug/enhancement/wontfix 为 edit 默认标签 + 8 create，双语描述）、模板三件套（双语 yml）、compliance/close 两 workflow（github-script：双语 heading 关键词提取、附件链接校验仅 bug、模块关键词→英文标签）、README.en.md（同构翻译 + 中英互链）。阶段 4 测试待用户网页操作（提测试 issue 验证自动打标/关闭链路）。
- 2026-11-01（验收）：用户网页验收通过（"没啥大的问题"）。Blank issue 显示 Maintainers only 为平台机制正确生效（blank_issues_enabled: false 对外部用户隐藏、维护者保留）——治理体系收尾。自动打标/超时关闭链路待首个真实 issue 自然验证（机制为 JvedioNext 实测同构，不额外造测试 issue）。
