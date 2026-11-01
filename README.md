<h1 align="center">dsh-token-dash</h1>

<p align="center">
  DSH 底栏 Token 看板：月度预算、订阅配额、账户余额与模型费用/用量明细，全程本地估算、只读本地数据。
</p>

<p align="center">
  <a href="https://github.com/spartawhy117/dsh-token-dash/releases">最新版本</a> ·
  <a href="./doc/design.md">设计文档</a> ·
  <a href="https://github.com/spartawhy117/dsh-token-dash/issues">问题反馈</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/spartawhy117/dsh-token-dash?label=version&sort=semver" alt="version" />
  <img src="https://img.shields.io/github/license/spartawhy117/dsh-token-dash" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="node" />
</p>

- **底栏 Pill**：预算%（状态色）、今日消费、账户余额；订阅显示 5h/周窗口与重置时间
- **浮层看板**：API 卡（独立预算 + 进度条）、订阅卡、按币种分组费用明细、模型用量明细（本月口径）
- **设置**：月度预算、刷新间隔、余额开关、日志查看/导出、检查更新（确认 → 自动执行 → 重启提示）
- **自动侦测**：DeepSeek / Kimi / GLM / OpenRouter / Qwen，填了 Key 或登录 DS 账号即出现在看板
- **三层模型归属**：`message.source` → `request/header` → 模型名前缀，老数据也能正确归属

---

## 安装

Requires DSH `0.2.1` or newer，两种方式任选：

```bash
# 方式一：GitHub 仓库直装（推荐，纯 JS 无构建，源码即产物）
dsh plugin --profile desktop add github:spartawhy117/dsh-token-dash

# 方式二：从 Releases 下载 dsh-token-dash-x.y.z.tgz 后本地安装（离线场景）
dsh plugin --profile desktop add /path/to/dsh-token-dash-1.0.0.tgz
```

更新：`update` 同名命令，或在插件设置页（P3 → 检查更新）内完成。卸载：`remove` 同名命令，数据保留在 `$DSH_HOME/dsh-token-dash/`。

---

## 界面结构

```text
P1 · 底栏 Pill（点击展开看板）
┌──────────────────────────────────────────────────────────┐
│ [API] 预算 91.9% · 今日 ¥0.04 · 余额 ¥87.66 ⌃            │
└──────────────────────────────────────────────────────────┘

P2 · 浮层看板（pill 正上方弹出）
┌────────────────────────────────────────────────────────┐
│ Token 看板                          刷新  设置  关闭   │
│ API 按量                            已检测 2 · 刚刚    │
│ ┌──────────────────────────────────────────────────┐  │
│ │ DeepSeek 官方                                    │  │
│ │   预算 ¥79.13 / ¥95.80 · 91.9%                   │  │
│ │   [=====================================----]    │  │
│ └──────────────────────────────────────────────────┘  │
│ API 费用明细 / 本月                      DSH 本机估算 │
│ 模型用量明细 / 本月                        合计 1.28M │
└────────────────────────────────────────────────────────┘

P3 · 设置
┌──────────────────────────────────────────────────────────┐
│ ← 返回  Token 看板                                关闭   │
│ API 计费（已检测 2）                                     │
│   DeepSeek 官方     月度预算  [ 500.00 ]  CNY            │
│ 显示                                                     │
│   刷新间隔  [30 秒] [1 分钟] [5 分钟]                    │
│   账户余额                                          [开] │
│ 日志 · 查看日志（打开日志文件夹 / 导出日志）             │
│ 价格与版本 · 版本 1.0.0                     [检查更新]   │
└──────────────────────────────────────────────────────────┘
```

## 预览

<p align="center">
  <img src="./doc/pic/pill-home.png" alt="首页 Pill" width="49%" />
  <img src="./doc/pic/pill-session.png" alt="会话 Pill" width="49%" />
</p>

<p align="center">
  <img src="./doc/pic/panel-dashboard.png" alt="浮层看板" width="49%" />
  <img src="./doc/pic/settings.png" alt="设置" width="49%" />
</p>

---

## 日志与隐私

报障时附上 `~/.dsh/logs/dsh-token-dash/`（已脱敏），错误日志带 `errorKind`（http/timeout/network/parse）与 `httpStatus`，可直接定位原因：

```bash
npm run logs -- --tail 50                # 查看最近日志
npm run logs -- --module slot,adapter.*  # 按模块过滤
```

只读本地会话 `usage`，不统计标题生成开销；余额仅访问官方接口，凭据经宿主解析不落盘；费用为本地估算，不发起计费请求。

## 开发

```bash
npm test      # 单元测试
npm run e2e   # 端到端（临时 DSH_HOME + web profile + Playwright）
npm run pack  # 发布 tarball 生成到 build/
```

设计文档见 [doc/design.md](./doc/design.md)。归属与计费语义参考了 [dsh-cost-dashboard](https://github.com/mike-lee0120/dsh-cost-dashboard)、[dsh-token-usage-lao](https://github.com/LaoYueHanNi/dsh-token-usage)、[dsh-ui-usage-billing](https://github.com/kenz1117/dsh-ui-usage-billing) 等社区插件。
