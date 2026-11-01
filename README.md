<h1 align="center">dsh-token-dash</h1>

<p align="center">
  简体中文 | <a href="./README.en.md">English</a>
</p>

<p align="center">
  在 DSH 输入框旁看清每日/每月模型消耗与预算余量：API Key 一填即自动识别订阅还是按量计费，月度预算可设、消耗实时估算。
</p>

<p align="center">
  <a href="https://github.com/spartawhy117/dsh-token-dash/releases">最新版本</a> ·
  <a href="./CHANGELOG.md">更新日志</a> ·
  <a href="https://github.com/spartawhy117/dsh-token-dash/issues">问题反馈</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/spartawhy117/dsh-token-dash?label=version&sort=semver" alt="version" />
  <img src="https://img.shields.io/github/downloads/spartawhy117/dsh-token-dash/total?label=downloads" alt="downloads" />
  <img src="https://img.shields.io/github/license/spartawhy117/dsh-token-dash" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="node" />
</p>

- **厂商支持**：DeepSeek（DS 账号 / API Key）、GLM Coding（订阅）、Kimi Coding（订阅）、Kimi / OpenRouter / Qwen（按量，OpenRouter USD、Qwen 国内 CNY / 国际 USD）——填 Key 自动识别订阅或按量计费
- **页面**：底栏 Pill → 浮层看板 → 设置；Pill 点击展开、点击浮层外收起
- **看板数据**：各供应商月度预算进度（已用 / 总额 / 百分比）、今日消耗、账户余额、订阅 5h/周窗口与重置时间、按币种分组的模型费用、token 用量与缓存命中率
- **设置**：按供应商的月度预算（带币种）、刷新间隔三档、账户余额开关、日志查看 / 导出、检查更新
- **数据口径**：每日 / 每月用量本地估算（内置价格表 + 社区价格表），三层模型归属，只读本地会话

---

## 安装

Requires DSH `0.2.1` or newer，三种方式任选：

```bash
# 方式一：npm 安装（推荐）
dsh plugin --profile desktop add dsh-token-dash

# 方式二：GitHub 仓库直装（纯 JS 无构建，源码即产物）
dsh plugin --profile desktop add github:spartawhy117/dsh-token-dash

# 方式三：从 Releases 下载 dsh-token-dash-x.y.z.tgz 后本地安装（离线场景）
dsh plugin --profile desktop add /path/to/dsh-token-dash-1.0.0.tgz
```

更新：`update` 同名命令（npm / github: 各自同名），或在插件设置页（P3 → 检查更新）内完成。卸载：`remove` 同名命令，数据保留在 `$DSH_HOME/dsh-token-dash/`。

---

## 界面

```text
P1 · 底栏 Pill（点击展开看板）
┌──────────────────────────────────────────────────────────┐
│ [API] 预算 91.9% · 今日 ¥0.04 · 余额 ¥87.66⌃               │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ [订阅] 5h 42% · 周 18%⌃                                    │
└──────────────────────────────────────────────────────────┘

P2 · 浮层看板（pill 正上方弹出；卡片与行随 API Key 侦测动态显示）
┌──────────────────────────────────────────────────────────┐
│ Token 看板                                   刷新 设置 关闭│
│ API 按量（已检测 3）                          刚刚        │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ DeepSeek 官方 预算 ¥79.13/¥95.80 · 91.9%  今日  余额 │ │
│ │ [=========================================-------]   │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ OpenRouter   预算 $23.52/$62.00 · 38.0%   今日  余额 │ │
│ │ [==================--------------------------------] │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Qwen（百炼） 预算 ¥0.02/¥0.25 · 8.0%      今日  余额 │ │
│ │ [====----------------------------------------------] │ │
│ └──────────────────────────────────────────────────────┘ │
│ 订阅套餐（已检测 2）                                      │
│ ┌────────────────────────────┐ ┌────────────────────────┐ │
│ │ GLM Coding                 │ │ Kimi Coding            │ │
│ │ 5h 42%    周 18%           │ │ 5h 30%    周 12%       │ │
│ │ 重置 14:05                 │ │ 重置 15:20             │ │
│ └────────────────────────────┘ └────────────────────────┘ │
│ API 费用明细 / 本月                        DSH 本机估算  │
│ CNY  合计 ¥4.96                                          │
│ DeepSeek 官方 / DeepSeek-V4.1-Flash  99.6%      ¥4.94   │
│ Qwen / Qwen3.8-Max                    0.4%      ¥0.02   │
│ USD   合计 $0.12                                         │
│ OpenRouter / DeepSeek-V4.1-Flash    100.0%     $0.12    │
│ 模型用量明细 / 本月                             合计 1.31M│
│ 模型                          请求    输入    命中    输出 │
│ DeepSeek 官方 / V4.1-Flash      48   0.11M  0.20M  0.02M│
│ OpenRouter / V4.1-Flash         12   0.02M  0.01M  0.01M│
│ Qwen / Qwen3.8-Max              24   0.05M  0.02M  0.01M│
│ GLM Coding / GLM-5.3            64   0.30M  0.60M  0.04M│
└──────────────────────────────────────────────────────────┘

P3 · 设置
┌──────────────────────────────────────────────────────────┐
│ ← 返回   Token 看板                              [关闭]  │
│ API 计费（已检测 2）                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ DeepSeek 官方      月度预算  [ 500.00 ]  CNY          │ │
│ │ OpenRouter         月度预算  [ 50.00 ]   USD          │ │
│ └──────────────────────────────────────────────────────┘ │
│ 订阅计费（已检测 2）                      [重新检测]      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ GLM Coding                    5h 42% / 周 18%         │ │
│ │ Kimi Coding                   5h 30% / 周 12%         │ │
│ └──────────────────────────────────────────────────────┘ │
│ 显示                                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 刷新间隔        [30 秒] [ 1 分钟 ] [5 分钟]            │ │
│ │ 账户余额                                        [开]  │ │
│ └──────────────────────────────────────────────────────┘ │
│ 日志                                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 查看日志        [打开日志文件夹]    [导出日志]         │ │
│ └──────────────────────────────────────────────────────┘ │
│ 价格与版本                                                │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 版本 1.0.0                                 [检查更新] │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

UI 交互转移
                点击 Pill / Enter
  ┌──────────┐ ──────────────────→ ┌──────────┐
  │ P1 收起  │                     │ P2 看板  │
  └──────────┘ ←────────────────── └──────────┘
        ↑       点击 Pill / 点击浮层外 / 「关闭」
        │                              │「设置」
        │                              ▼
        │    「← 返回」/ 点击浮层外 ┌──────────┐
        └───────────────────────── │ P3 设置  │
                                     └──────────┘
```

**P1 · 底栏 Pill**（首页工作区行 / 会话输入框下方活动行）

<p align="center">
  <img src="./docs/pic/pill-home.png" alt="首页 Pill" />
</p>

<p align="center">
  <img src="./docs/pic/pill-session.png" alt="会话 Pill" />
</p>

**P2 · 浮层看板**

<p align="center">
  <img src="./docs/pic/panel-dashboard.png" alt="浮层看板" />
</p>

**P3 · 设置**

<p align="center">
  <img src="./docs/pic/settings.png" alt="设置" />
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

发版：推 `v*` tag 自动触发 GitHub Release（tarball）与 npm 暂存（staged publishing，网页 2FA 审批后上线）；完整流程见 [docs/release.md](./docs/release.md)。

## 致谢

归属与计费语义参考了以下社区插件：

- [dsh-cost-dashboard](https://github.com/mike-lee0120/dsh-cost-dashboard)
- [dsh-token-usage-lao](https://github.com/LaoYueHanNi/dsh-token-usage)
- [dsh-ui-usage-billing](https://github.com/kenz1117/dsh-ui-usage-billing)
- [dsh-spend](https://github.com/nonewind/dsh-spend)
- [dsh-stats-panel](https://github.com/zhang-jiazhi/dsh-stats-panel)
- [DshCockpit](https://github.com/Lxiayu/DshCockpit)
