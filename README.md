<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/icon.png" alt="dsh-token-dash" width="96" height="96" />
</p>

<h1 align="center">dsh-token-dash</h1>

<p align="center">
  简体中文 | <a href="./README.en.md">English</a>
</p>

<p align="center">
  在 DSH 输入框旁看清每日/每月模型消耗与预算余量：<br />
  API Key 一填即自动识别订阅还是按量计费，月度预算可设、消耗实时估算；<br />
  当月数据可导出备份，换机或重装后一键导入恢复。
</p>

<p align="center">
  <a href="https://github.com/spartawhy117/dsh-token-dash/releases">最新版本</a> ·
  <a href="./CHANGELOG.md">更新日志</a> ·
  <a href="https://github.com/spartawhy117/dsh-token-dash/issues">问题反馈</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/spartawhy117/dsh-token-dash?label=version&sort=semver" alt="version" />
  <img src="https://img.shields.io/npm/dt/dsh-token-dash?logo=npm&label=npm%20downloads" alt="npm downloads" />
  <img src="https://img.shields.io/github/downloads/spartawhy117/dsh-token-dash/total?label=downloads" alt="downloads" />
  <img src="https://img.shields.io/github/license/spartawhy117/dsh-token-dash" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="node" />
  <a href="https://awesome-dsh-plugin.com/zh/p/spartawhy117/dsh-token-dash"><img src="https://img.shields.io/badge/awesome--dsh--plugin-listed-6ea8ff" alt="awesome-dsh-plugin" /></a>
</p>

- **厂商支持**：DeepSeek（DS 账号 / API Key）、GLM Coding（订阅）、Kimi Coding（订阅）、Kimi / OpenRouter / Qwen（按量，OpenRouter USD、Qwen 国内 CNY / 国际 USD）——填 Key 自动识别订阅或按量计费
- **页面**：底栏 Pill → 浮层「当前模型」（四列主区 + 时间范围 + 用量表）；浮层底部「全量看板」或左侧栏入口进入整页，按量卡片区与订阅卡片区、摘要带与明细、底部设置胶囊
- **看板数据**：时间范围（当天 / 近 7 天 / 近 30 天 / 全部）、月度预算与已用环、计划余额、账户真实余额、本月已花、订阅 5h / 周 / 月窗口与倒计时；摘要带显示**总费用（按币种）**与**真实 Tokens（含缓存读写）**
- **设置**：整页底部三行——立即刷新与刷新间隔、日志与数据导出导入、价格表与版本检查；按供应商的月度预算在按量卡输入框编辑（未填写默认 100）
- **数据口径**：每日 / 每月用量本地估算（内置价格表 + 社区价格表），三层模型归属，只读本地会话；订阅模型计入 Tokens 但不计费用，计费形态按 Key 固化，不随配额接口抖动

---

## 安装

需要 DSH `0.2.1` 或更新版本，三种方式任选：

```bash
# 方式一：npm 安装（推荐）
dsh plugin --profile desktop add dsh-token-dash

# 方式二：GitHub 仓库直装（纯 JS 无构建，源码即产物）
dsh plugin --profile desktop add github:spartawhy117/dsh-token-dash

# 方式三：从 Releases 下载 dsh-token-dash-x.y.z.tgz 后本地安装（离线场景）
dsh plugin --profile desktop add /path/to/dsh-token-dash-1.1.0.tgz
```

更新：`update` 同名命令（npm / github: 各自同名），或在插件设置页「价格与版本」右侧的 `⤓` 内完成。卸载：`remove` 同名命令，数据保留在 `$DSH_HOME/dsh-token-dash/`。

---

## 界面

以下截图使用假数据演示，便于一次看到完整效果：

**P1 · 底栏 Pill**（按量 / 订阅两种形态；点击展开浮层，点击浮层外、`×` 或 `Esc` 收起）

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/pill-api.png" alt="按量 Pill" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/pill-sub.png" alt="订阅 Pill" />
</p>

**P2 · 浮层（当前模型）**：环与百分比、已用 / 预算、真实余额、本月已花，时间范围与用量表

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/panel-api.png" alt="浮层 · 按量形态" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/panel-sub-2.png" alt="浮层 · 订阅两窗" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/panel-sub-3.png" alt="浮层 · 订阅三窗" />
</p>

**P3 · 整页看板**：按量卡片、订阅卡片、摘要带与明细、设置与数据管理

<p align="center">
  <img src="https://raw.githubusercontent.com/spartawhy117/dsh-token-dash/main/docs/pic/settings.png" alt="整页看板" />
</p>

---

## 日志与隐私

报障时附上 `$DSH_HOME/logs/dsh-token-dash/`（已脱敏），错误日志带 `errorKind`（http/timeout/network/parse）与 `httpStatus`，可直接定位原因：

```bash
npm run logs -- --tail 50                # 查看最近日志
npm run logs -- --module slot,adapter.*  # 按模块过滤
```

只读本地会话 `usage`，不统计标题生成开销；余额仅访问官方接口，凭据经宿主解析不落盘；费用为本地估算，不发起计费请求。

数据备份在本地完成：`导出数据` 生成一个 JSON 文件（设置 + 当月使用数据，不含订阅配额与余额），`导入数据` 只解析该文件，覆盖当月前自动备份原文件，全过程不经过网络。

---

## 开发

```bash
npm test      # 单元测试
npm run e2e   # 端到端（临时 DSH_HOME + web profile + Playwright）
npm run shots # 用假数据重新生成 docs/pic 的 P1/P2/P3 截图（tools/mock）
npm run pack  # 发布 tarball 生成到 build/
```

发版：推 `v*` tag 自动触发 GitHub Release（tarball）与 npm 直发（Trusted Publishing / OIDC，含 provenance 溯源，无需人工审批）；完整流程见 [docs/release.md](./docs/release.md)。

## 致谢

归属与计费语义参考了以下社区插件：

- [dsh-cost-dashboard](https://github.com/mike-lee0120/dsh-cost-dashboard)
- [dsh-token-usage-lao](https://github.com/LaoYueHanNi/dsh-token-usage)
- [dsh-ui-usage-billing](https://github.com/kenz1117/dsh-ui-usage-billing)
- [dsh-spend](https://github.com/nonewind/dsh-spend)
- [dsh-stats-panel](https://github.com/zhang-jiazhi/dsh-stats-panel)
- [DshCockpit](https://github.com/Lxiayu/DshCockpit)
