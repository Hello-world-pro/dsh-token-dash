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

- 底栏 Pill：预算%、实际余额、今日消费、本月 Token
- 浮层：预算卡、按模型费用明细、按模型用量明细
- 设置页：预算、刷新三档、余额开关、版本
- 余额：DeepSeek / Kimi / GLM；其他显示“第三方不支持”
- 费用：内置 flash / pro 峰谷价，本地估算

## 边界

- 只读本地会话 `usage`，不统计标题生成开销
- 余额仅访问官方接口，凭据经宿主解析
- 不做系统级悬浮窗，只在 DSH 窗口内渲染
