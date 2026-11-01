# dsh-token-dash 设计文档

> 面向贡献者的一页式架构说明。需求背景与决策记录见 [计划文档](../plan/active/token-dash/plan.md)。

## 总体架构

插件分为两端，随 DSH 宿主进程加载：

```text
┌──────────────────────────── DSH 宿主（Electron / web）────────────────────────────┐
│                                                                                    │
│  host 端（index.js，Node 环境）                client 端（client.js，浏览器环境）   │
│  ┌──────────────────────────────┐             ┌────────────────────────────────┐  │
│  │ 会话事件监听 session/event     │             │ P1 底栏 Pill（两槽位）          │  │
│  │ → collect.ingest 三层归属      │   /summary   │ P2 浮层看板 / P3 设置          │  │
│  │ → daily.json（本地存储）        │ ──────────→ │ fetch 轮询（refreshMs 可配）    │  │
│  │ readProviders 侦测五家供应商   │ ←────────── │ POST /prefs /log /refresh …    │  │
│  │ buildSummary 聚合 VM          │             └────────────────────────────────┘  │
│  │ web 路由 /token-dash/api/*    │                                          │
│  └──────────────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

- **host 端**只做数据：采集、归属、聚合、侦测、路由、日志；无 UI。
- **client 端**只做展示：Pill 常驻 + 浮层（P2 看板 / P3 设置），无业务计算。
- 两端只通过 `/token-dash/api/*` HTTP 前缀路由通信。

## 数据流

```text
会话事件（assistant/message 的 usage）
  → collect.recordFromEvent 提取 token 四桶
  → 三层归属：message.source（权威）
              → request/header 会话状态（回退）
              → 模型名前缀（最终兜底，视图层）
  → core.addRecord 按 天/provider/model 入账
  → store 持久化 daily.json（2s 防抖 flush，原子写 tmp+rename）

浏览器请求 /summary
  → readProviders（30s TTL 缓存；DeepSeek/Kimi/OpenRouter 余额、GLM/Kimi 订阅配额）
  → core.buildSummary（当月口径聚合 + 配置即可见的默认模型行）
  → VM JSON（providers / breakdown.models / apiTotals / version / refreshMs）
```

## 文件目录组织

```text
dsh-token-dash/
├── index.js               host 端入口：服务注册、web 路由、spawn 更新、日志接线
├── client.js              client 端 bundle：Pill / Panel（P2+P3）/ 全部 UI 组件与样式
├── src/
│   ├── core.js            纯聚合：buildSummary（VM）、addRecord、月/日键、排序、预算
│   ├── collect.js         会话事件采集：recordFromEvent / headerFromEvent / ingest / backfill
│   ├── adapters.js        供应商侦测（五家 API/订阅）+ 事件日志映射 logAdapterEvents
│   ├── providers.js       provider 常量：归一化、显示名、币种、模型前缀归属、默认模型表
│   ├── pricing.js         价格：内置 catalog + 社区价格表 + OpenRouter 路由价
│   ├── catalog.json       内置模型价格目录（官方价，随包发布，pricing.js 消费）
│   ├── store.js           持久化：DSH_HOME 解析、daily/prefs 读写（原子写）、flusher
│   └── diagnostics.js     日志器（JSONL、脱敏、轮转）与日志导出
├── locale/                预留 i18n 词条（zh.json，暂未接线）
├── tools/logs.mjs         常驻日志查看工具（npm run logs）
├── scripts/e2e.mjs        端到端测试（临时 DSH_HOME + web profile + Playwright）
├── test/unit/             L1 单元测试（node --test）
├── doc/                   文档与截图（本目录，纳入 git）
│   ├── design.md          本设计文档
│   └── pic/               README 展示用截图
├── build/                 生成物（npm pack tarball 等），.gitignore 忽略不入库
└── reference/third-party/ 本地调研用的第三方插件源码（.gitignore 忽略）
```

## 模块职责速查

| 模块 | 职责 | 不做什么 |
|---|---|---|
| core | VM 聚合、月/日口径、排序、预算计算 | 不做 IO、不读时钟（now 注入） |
| collect | 事件提取与归属、水位去重、历史回填 | 不落盘（交 store） |
| adapters | 外部接口请求与解析、错误分类 | 不做 UI、不做价格匹配 |
| store | 文件读写与原子性 | 不做业务逻辑 |
| client | 渲染与交互 | 不做业务计算（数字全部来自 VM） |

## 日志体系

- 文件：`$DSH_HOME/logs/dsh-token-dash/`，JSONL 格式；`[TD:<module>]` 前缀为导出格式
- 模块：`boot / slot / adapter.* / pricing / collect / vm / provider / update / diag / route`
- 错误带分类：`errorKind`（http/timeout/network/parse）+ `httpStatus`，报障可直接定位
- 脱敏：不记 API Key、不记对话内容、不记响应体

## 关键设计决策（摘要）

1. **严格本月口径**：费用/用量明细与预算均按当月；"配置即可见"兜底（已配置 provider 无消耗时补默认模型行）
2. **三层模型归属**：兼容老数据（无 source 标注的历史记录靠前缀兜底），不迁移 `daily.json`
3. **余额语义**：余额 = 账户余额（adapter 查询），预算剩余只进进度条
4. **纯 JS 无构建**：源码即产物——GitHub 安装长期可用；npm 发布时 `files` 字段控制包内容
5. **只读本地数据**（REQ-14）：不统计标题生成、不发起计费请求、凭据经宿主解析不落盘
