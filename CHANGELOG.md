# 更新日志

本文件记录每个版本的**新增**与**修改**。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.0.5] - 2026-11-02

### 新增

- 月度账本：`$DSH_HOME/dsh-token-dash/months/YYYY-MM.json` 独立记录每月日级消费/用量；`daily.json` 缺失或被重置时自动读回
- 迁移备份自动恢复：启动时并回 `daily.json.pre-v2-*.bak`，再按日级 token 重算旧成本
- 社区价格表 `dailySlots` 映射为峰谷价；周末全天按闲时计价
- 回归测试：社区表解析、历史恢复、月度账本、补行判重、成本对齐；E2E 覆盖恢复/账本/非零费用/行数

### 修改

- 修复社区价格表二次归一化把单价清空、今日与本月费用恒为 ¥0.00（今日/费用/占比/预算全部恢复）
- 修复已配置供应商存在真实模型行时仍补默认 0 值行，导致两张明细表出现同名重复行
- 修复 1.0.3 清空迁移 + 会话 backfill 取不到数据导致历史统计“消失”：改为备份并回 + 就地重算，不删聚合
- 修正 DeepSeek Flash 内置价（闲 1/0.02/4、峰 2/0.04/8），重算前等待社区价格表（≤5s），`costVersion` 升到 3 重算历史
- E2E 宿主路径改按 `LOCALAPPDATA` 解析，移除用户目录与 Chromium 修订号硬编码

## [1.0.2] - 2026-11-01

### 新增

- npm 发布切换 Trusted Publishing（OIDC 直发）：推 tag 全自动上线，免 token、含 provenance 溯源

### 修改

- 文档：`doc/release.md` 发版流程对齐 Trusted Publishing 实录；双语 README 开发节补发版说明

