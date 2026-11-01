# 更新日志

本文件记录每个版本的**新增**与**修改**。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.0.1] - 2026-11-01

### 新增

- npm 分发通道：`dsh plugin --profile desktop add dsh-token-dash`（README 安装段三方式）
- `publish.yml`：tag 触发自动发布 npm（provenance 附源信息）
- GitHub Issue 治理体系：标签 11 个、双语 Issue 模板（Bug 强制日志附件）、模板合规检查与超时自动关闭两个 Actions
- 英文版 `README.en.md`（中英互链）

### 修改

- 根目录整理：`catalog.json` 移入 `src/`（与消费者同目录）
- 新增 `tools/logs.mjs` 日志查看工具（`npm run logs`）、`doc/release.md` 发版 checklist、`doc/design.md` 设计文档

## [1.0.0] - 2026-11-01

首个正式版。

### 新增

- 底栏 Pill：预算%（状态色）、今日消耗、账户余额；订阅显示 5h/周窗口与重置时间
- 浮层看板：API 卡（独立预算 + 进度条）、订阅卡、按币种分组费用明细（/ 本月）、模型用量明细（/ 本月）
- 设置：月度预算（按供应商 + 币种）、刷新间隔三档、账户余额开关、日志查看 / 导出、检查更新（确认 → 自动执行 → 重启提示）
- 自动侦测五家供应商：DeepSeek（DS 账号 / API Key）、GLM Coding、Kimi Coding、OpenRouter、Qwen——配置即可见
- 三层模型归属：`message.source` → `request/header` → 模型名前缀，老数据也能正确归属
- 错误链路日志（`errorKind` / `httpStatus` 分类）与 `npm run logs` 排查工具
- GitHub Release 产物安装（tarball 离线安装）

### 修改

- 余额语义修正：显示账户余额而非预算剩余
- P2 费用 / 用量明细严格本月口径；空表保留表格结构（数值 0）
- 模型行跟随供应商配置：无消耗时补默认模型行（OpenRouter 显示 `-` 占位）
- P3 删除计费模式下拉（自动侦测）与"本月 Token"开关
- 浮层锚定 Pill 正上方弹出，支持点击浮层外收起；Pill 精简为 `[API] 预算% · 今日 · 余额`
- 日志模块 `adapter.*` / `slot` 落地；损坏数据文件与写盘失败不再静默
