# dsh-token-dash

DSH 底栏 Token 看板：月度预算、模型费用/用量、账户余额与官方 usage 入口。

## 安装

```bash
# npm（发布后）
dsh plugin --profile desktop add dsh-token-dash

# GitHub
dsh plugin --profile desktop add github:spartawhy117/dsh-token-dash

# 本地开发
dsh plugin --profile web add link:D:/MyProjects/dsh-tokenDash
```

安装后重启 DSH。

## 功能

- 底栏 Pill：预算%（状态色）、今日消费、账户余额；订阅显示 5h/周窗口与重置时间
- 浮层看板：API 卡（独立预算/进度条）、订阅卡（套餐窗口/重置时间）、按币种分组费用明细、模型用量明细
- 设置视图：provider 计费模式（按量/订阅/不显示）、月度预算、刷新间隔、余额开关、日志、检查更新
- 余额：DeepSeek / Kimi / OpenRouter 官方接口；Qwen 不支持余额；关闭开关后不请求
- 订阅配额：GLM Coding / Kimi Coding 官方接口，支持手动重新检测
- 费用：内置 catalog + 社区价格表，本地估算

## 边界

- 只读本地会话 `usage`，不统计标题生成开销
- 余额仅访问官方接口，凭据经宿主解析
- 不做系统级悬浮窗，只在 DSH 窗口内渲染

## 开发

```bash
npm test          # 单元测试
npm run e2e       # 端到端（临时 DSH_HOME + web profile + Playwright）
npm run logs -- --tail 50   # 查看插件日志
```

日志工具参数：`--module slot,adapter.*`（模块过滤，`*` 通配）、`--event mount`（事件子串）、`--home <dir>`（指定 DSH_HOME，默认 `~/.dsh`）、`--json`（原始 JSONL）。
