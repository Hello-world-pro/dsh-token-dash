# 更新日志

本文件记录每个版本的**新增**与**修改**。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> 正式版本按时间倒序保留完整历史；本地构建（`X.Y.Z-local.N`）在文件顶部写临时块，作为中间产物记录，不 tag、不发布；正式发布时合并进对应正式版本块并删除。

## [1.0.6] - 2026-11-02

### 修改

- 重构 provider / VM / UI 边界：provider 元数据收口到 registry，UI 价格链接统一由 VM 提供，适配器输出统一 `windows` / `error`；界面与计价结果不变。

## [1.0.5] - 2026-11-02

### 新增

- 月度账本：`$DSH_HOME/dsh-token-dash/months/YYYY-MM.json` 独立记录每月日级消费/用量；`daily.json` 缺失或被重置时自动读回
- 迁移备份自动恢复：启动时并回 `daily.json.pre-v2-*.bak`，再按日级 token 重算旧成本
- 社区价格表 `dailySlots` 映射为峰谷价；周末全天按闲时计价
- 回归测试：社区表解析、历史恢复、月度账本、补行判重、成本对齐；E2E 覆盖恢复/账本/非零费用/行数

### 修改

- 修复社区价格表二次归一化把单价清空、今日与本月费用恒为 ¥0.00（今日/费用/占比/预算全部恢复）
- 修复已配置供应商存在真实模型行时仍补默认 0 值行，导致两张明细表出现同名重复行
- 修复旧版迁移清空历史、会话 backfill 取不到数据导致统计“消失”：改为备份并回 + 就地重算，不删聚合
- 修正 DeepSeek Flash 内置价（闲 1/0.02/4、峰 2/0.04/8），重算前等待社区价格表（≤5s），`costVersion` 升到 3 重算历史
- E2E 宿主路径改按 `LOCALAPPDATA` 解析，移除用户目录与 Chromium 修订号硬编码

## [1.0.2] - 2026-11-01

### 新增

- npm 发布切换 Trusted Publishing（OIDC 直发）：推 tag 全自动上线，免 token、含 provenance 溯源

### 修改

- 文档：`doc/release.md` 发版流程对齐 Trusted Publishing 实录；双语 README 开发节补发版说明

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

