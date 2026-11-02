# Token 看板 UI 迭代：用量/设置双 tab 与时间范围

> 状态：已实施<br>
> 完成时间：2026-11-02<br>
> 关联逻辑根：`dsh-token-dash`<br>
> 关联资料：[UI 设计](../../ui-design.md)、[token-dash 主计划](feature_token_dash.md)、[Provider 边界计划](feature_provider_boundary.md)

## 一、最终需求与范围

| ID | 最终处置 | 需求 / 边界 / 风险 | 最终结论或迁移去向 |
|---|---|---|---|
| REQ-01~05 | 完成 | 双 tab、时间范围、固定区、两格卡、行卡片明细 | P2/P3 同浮层；范围独立 `/usage`；两格卡与明细已实现 |
| REQ-06~08 | 完成 | 预算/余额区分、空态、范围只读 `state.days` | 月度预算与范围分离；订阅不参与范围；存储格式未改 |
| REQ-09~13 | 完成 | 可访问性、P1 不变、主题胶囊、头部动作、分区底框 | 键盘/tooltip/焦点可用；中性 Section + Tile；P3 单列分区 |
| REQ-14~17 | 完成 | P3 价格/版本、P2 底注、支持范围、P3 同构 | 价格链接/时间/社区链接完成；P3 五区与状态矩阵完成 |
| REQ-18~22 | 完成 | DSH 按钮 token、状态完整性、格式/校验、响应式、现场修正 | 主题 token；保留旧数据；预算校验；窄屏 clamp |
| REQ-23~30 | 完成 | tooltip、价格说明、状态行、唯一说明、更新控制、启动检查、i18n | Tooltip fixed/自适应；更新按钮常驻；跟随 DSH locale |
| REQ-31~34 | 完成 | 单行明细、168px 刷新胶囊、日志/价格单列、两格卡设计对齐 | E2E 通过；日志→价格顺序恢复；设计稿补 tile 框 |
| BND-01~05 | 保持 | 不做图表/分页/跨币种/价格编辑/诊断 | 全部保持 |
| RSK-01~04 | 已验证 / 接受 | 全量范围性能、预算混读、多币种、320 挤压 | 单次聚合 <100ms；视觉分离；币种分行；行卡片无列宽问题 |

## 二、最终实现

### 3.0 最终改动总览

| ID | 类型 | 文件 | 开发改动说明 |
|---|---|---|---|
| CHG-01~19 | 修改 | `client.js` | `Panel/UsageContent/SettingsContent/DetailGroup/Tooltip/IconButton`：双 tab、P2 固定/范围/单行明细、P3 五区、更新状态机、DSH locale、主题/状态处理 |
| CHG-04 | 修改 | `src/core.js` | 新增 `buildUsage(state, range, now)`：按范围/币种/模型聚合，不改变预算算法 |
| CHG-05 | 修改 | `index.js` | 新增 `/usage` 路由与参数校验；summary 暴露 `catalog` 元数据 |
| CHG-13 | 修改 | `src/pricing.js` | `catalogInfo` 增加社区来源 `url` |
| CHG-16 | 修改 | `locale/zh.json`、`locale/en.json` | 98 个 zh/en 词条，跟随 DSH locale |
| CHG-06 | 测试 | `test/unit/*.test.mjs`、`scripts/e2e.mjs` | `buildUsage` / `/usage` / UI 状态与布局回归 |
| CHG-07 | 修改 | `docs/ui-design.md` | v2.28 视觉真源：P2/P3、状态、格式、更新与 i18n |

### 2.1 最终结构

```text
client 用量 tab
  ├─ 固定区：summary.providers → 本月预算 / 订阅
  └─ 范围区：[range] → GET /usage?range=... → buildUsage(state, range, now)
                                                  └─ state.days
client 设置 tab
  └─ API / 订阅 / 显示 / 日志 / 价格与版本
```

### 2.2 关键代码骨架

```js
// src/core.js
buildUsage(state, range, now) -> { range, startAt, endAt, totals, models }

// index.js
GET /token-dash/api/usage?range=today|7d|30d|all
```

### 2.3 关键陷阱

| 项 | 约束 |
|---|---|
| 月度预算 vs 范围金额 | 固定区与范围区视觉分离；文案写“本月预算/统计范围” |
| 订阅 | 账户级，不参与范围聚合 |
| 多币种 | 卡片/明细按币种分组，禁止合计 |
| 范围切换 | 保留旧完整数据，新数据原子替换；失败保留旧数据 |
| 320 宽度 | MiniBar 固定 48×4；明细单行，Tokens 段可收缩；刷新胶囊 168px |
| P3 分区 | 普通 `div` + 单列 grid；日志→价格与版本顺序固定 |

## 三、不改动 / 边界

- P1 Pill 的结构、字段与交互不变。
- 不改价格算法、`state.days` 存储格式、订阅 adapter、provider 边界。
- 不做趋势图/热力图/请求日志页/分页/查看全部。
- 不跨币种合计、不做汇率换算/自定义币种。
- 不自动安装更新；更新动作只展示确认流程。

## 四、最终验收

| 项 | 来源 | 环境与方式 | 结果 |
|---|---|---|---|
| 范围聚合与预算 | REQ-02/06/08 | L1 `npm test` | 62 pass，1 个 local 版本预期 skip |
| `/usage` 路由 | REQ-08 | L2 mock | `today/7d/30d/all` 200；非法 range 400 |
| P1/P2/P3 主路径 | REQ-01~21 | L3 Playwright + mock | E2E-UI-01~27 通过 |
| P2/P3 最终布局 | REQ-31~34 | L3 E2E-UI-28~30 | 单行明细、168px 胶囊、日志/价格单列通过 |
| 桌面视觉 | REQ-22~34 | DSH desktop `1.1.0-local.5` | 用户确认“看起来没啥问题了”（2026-11-02） |
| i18n | REQ-30 | L1 locale 完整性 + 中文 UI | zh/en 词条完整；英文桌面未实测 |

## 五、计划—实际重大偏差

- 计划 v2.21 → 实际 v2.28：增加桌面反馈的 tooltip、更新状态、i18n、单行明细、P3 分区与两格卡框线修正；未改变核心数据边界。

## 六、诊断锚点

- LogCategory：`TokenDash`
- 前缀：`[TD:vm]` / `[TD:ui]` / `[TD:update]`
- 高价值日志：`usage range=... days/models`、range switch、update check 结果。

## 七、Issue 记录（已压缩）

| Issue | 结果 |
|---|---|
| #1 | 头部按钮统一 22×22；E2E-UI-16 |
| #2 | 行内 `ⓘ` 透明；E2E-UI-17 |
| #3 | tooltip 独立 fixed 浮层；E2E-UI-18 |
| #4 | 范围切换保留旧数据、原子替换；E2E-UI-19 |
| #5 | tooltip 内容宽度/向上居中；E2E-UI-20 |
| #6 | 删除“查看价格明细”；E2E-UI-21 |
| #7 | 价格时间格式化/社区链接；E2E-UI-22 |
| #8 | 版本与“已保存”互斥；E2E-UI-23 |
| #9 | 唯一说明移到 `真实 Tokens`；E2E-UI-24 |
| #10 | 更新按钮完成态复位；E2E-UI-25 |
| #11 | 启动静默检查与状态图标；E2E-UI-26 |
| #12 | 接入 DSH locale；中文 E2E 通过，英文桌面未实测 |
| #13 | Tokens/请求/命中单行；E2E-UI-28 |
| #14 | 刷新胶囊 168px、标题单行；E2E-UI-29 |
| #15 | 日志/价格单列恢复；E2E-UI-30 |
| #16 | 设计稿两格 tile 框补齐；文档核对通过 |
