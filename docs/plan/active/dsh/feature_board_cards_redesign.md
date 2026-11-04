# Token 看板卡片化与三色环（前端重构）

> 状态：**待批准**（设计已定稿，未改代码）<br>
> 创建时间：2026-11-04<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[`ui-design.md`](../../../ui-design.md)（v3.2）、走查清单 [`board-visual-review-checklist.md`](../../../checklist/active/board-visual-review-checklist.md)、原型 [`tools/preview/templates/`](../../../tools/preview/templates/)、旧方案 [`feature_fullpage_board.md`](feature_fullpage_board.md)（已实施 `1.2.0-local.2`）

## 〇、关键事实

**现状**

- `client.js` 已有 `ProgressRing`（纯几何）、P1 `Pill`、P2 `Panel`、P3 `BoardPage`；环只画前景色，P3 两区仍是表格。
- 现有 e2e 断言基于表格结构（`token-dash-budget-row-*` / `token-dash-quota-*`），重构时需同批更新。
- `docs/pic/*.png` 是旧实现截图，重构完成后由 `npm run shots` 重出。

**不变的部分**

- 数据契约不变：`/summary`、`/usage`、`/prefs`、`/providers/refresh`、`/logs/meta`、`/open-in-app/open`。
- 路由与入口不变：`main` + `sidebar.panellist`，`key = token-dash`。
- 预算持久化不变：`PUT /prefs`，空值 = 未设置。

**设计与预览**

- 四个组件契约见 ui-design §2.5.1 / §2.5.4–2.5.6；页面原型见 `page-p1/p2/p3.html`。
- 预览只出 HTML（`.tmp/preview/*.html`），IDE 直接看；PNG 仅在需要静态图时加 `--png`。

## 一、需求

| ID | 优先级 | 需求 | 成功信号 |
|---|---|---|---|
| REQ-01 | P0 | 组件拆分：`ProgressRing`（几何）/ `PercentValue`（文本+颜色）/ `InlineRing`（P1/P2）/ `QuotaGauge`（P3） | 环不再持有数字；三处复用同一 `stateOf` / `percentText` |
| REQ-02 | P0 | 三色语义：normal 低饱和绿、warn 黄、critical 红；环与数字同色 | 三态截图与 `ring.html` 一致 |
| REQ-03 | P0 | 金额去绿：费用与金额改前景色 + 600，负数 / 超支红 | 全页无「绿金额」 |
| REQ-04 | P1 | P1：`InlineRing` 14/2，最多 3 窗，箭头改 SVG，空态 `--` | 与 `page-p1.html` 一致 |
| REQ-05 | P1 | P2：`fit-content` 280–480；按量四列主区；订阅三窗两行；表格补表头线与行分隔 + aria | 实测宽 ~365 / ~349，320px 不横滚 |
| REQ-06 | P0 | P3 按量区：每 provider 一卡，卡宽 ≤260、末行居中；卡内竖排 `QuotaGauge` → 预算输入 → 三行 | 3 家一行 3 张、520 两行 2+1 |
| REQ-07 | P0 | P3 订阅区：`auto-fit` 卡片；窗口一排；缺窗不出列；辅助 68% | 1000/760/520 = 4/3/2 列 |
| REQ-08 | P0 | P3 范围与明细：底框内「范围 + 摘要带 + 8 列明细」；摘要带两半居中、多币种同字号；窄屏内部滚动 | 与 `page-p3.html` 一致 |
| REQ-09 | P1 | P3 设置胶囊：三行 40px 标签；主按钮仅「立即刷新」；版本行收敛 | 三行左对齐成列 |
| REQ-10 | P1 | 响应式：页宽 `max-width 952`；订阅 4/3/2；整页无横向滚动 | 三档 `scrollWidth === clientWidth` |
| REQ-11 | P1 | E2E 同步：环色 = 数字色、内联结构、P2 宽度、单币种居中、胶囊三行 | `npm run e2e` 全绿 |
| REQ-12 | P2 | 文档与截图：README / README.en 文案与图片、CHANGELOG、`npm run shots` | 截图与实现一致 |

## 二、范围

**做**

- `client.js` 组件拆分与 P1 / P2 / P3 视觉重构；`scripts/e2e.mjs`、`tools/mock/shots.mjs`、README、CHANGELOG 同步。

**不做**

- 不改数据接口、不新增 provider、不改预算持久化格式。
- 不改宿主槽位与入口机制；不做主题切换、不做自定义配色。
- 不引入组件库或 CSS 框架，继续内联样式 + token。

## 三、阶段与改动清单

> 阶段串行；每阶段结束跑 `npm test`，S4 后跑 `npm run e2e`。

### S0 · 组件层

| CHG | 文件 | 内容 |
|---|---|---|
| CHG-01 | `client.js` | 新增 `stateOf(percent, critical)` / `percentText(percent)`；`ProgressRing` 收窄为几何，去掉内部文字 |
| CHG-02 | `client.js` | 新增 `PercentValue`（格式化 + 状态色） |
| CHG-03 | `client.js` | 新增 `InlineRing`（环 + 右侧数字，14/2 与 20/2.5） |
| CHG-04 | `client.js` | 新增 `QuotaGauge`（环 40/4 + 环心 + 百分比 + 三行辅助） |

### S1 · P1

| CHG | 文件 | 内容 |
|---|---|---|
| CHG-05 | `client.js` | Pill 改用 `InlineRing`；订阅最多 3 窗；箭头换 SVG；空态 `--` |

### S2 · P2

| CHG | 文件 | 内容 |
|---|---|---|
| CHG-06 | `client.js` | 按量主区四列改用 `InlineRing(20/2.5)` + 三列标签 |
| CHG-07 | `client.js` | 订阅主区改三窗两行（`周期 + 环 + %` / `剩余 · 倒计时`） |
| CHG-08 | `client.js` | 用量表补表头线 / 行高 28 / 6% 行分隔 / aria role；模型名 190px 截断 |
| CHG-09 | `client.js` | 宽度 `fit-content` 280–480（320 视口可降到 260）；`ResizeObserver` 重定位保留 |

### S3 · P3

| CHG | 文件 | 内容 |
|---|---|---|
| CHG-10 | `client.js` | 按量区改卡片网格（flex、上限 260、末行居中）；卡内竖排 |
| CHG-11 | `client.js` | 订阅区改 `auto-fit` 卡片；窗口一排；缺窗不出列 |
| CHG-12 | `client.js` | 范围 + 摘要带 + 明细合并底框；摘要带两半居中、单币种居中、顶部行左对齐 |
| CHG-13 | `client.js` | 明细 8 列 + 内部滚动；金额前景色、负数红 |
| CHG-14 | `client.js` | 设置胶囊三行标签 + 主/ghost 按钮 + 版本行收敛 |
| CHG-15 | `client.js` | 整页 `max-width 952`、卡片 4/3/2 自适应 |

### S4 · 脚本、测试与文档

| CHG | 文件 | 内容 |
|---|---|---|
| CHG-16 | `scripts/e2e.mjs` | 断言改为卡片结构；新增环色=数字色、单币种居中、胶囊三行、三档宽度 |
| CHG-17 | `tools/mock/shots.mjs` | 截图适配新布局（P3 整页、P2 两形态） |
| CHG-18 | `README.md` / `README.en.md` | 功能说明与截图替换 |
| CHG-19 | `CHANGELOG.md` | 新增本地构建版本块 |

## 四、验收

| 项 | 验证方式 | 通过标准 |
|---|---|---|
| 三色环 | 截图 + e2e | 环 `stroke` 与数字 `color` 相同；normal 绿、warn 黄、critical 红 |
| P1 | 截图 | 14/2、最多 3 窗、空态 `--`、箭头 SVG |
| P2 按量 | 截图 + 量宽 | 四列主区；宽 ~365；320px 不横滚 |
| P2 订阅 | 截图 | 三窗两行；缺月不出列 |
| P3 按量 | 截图 | 3 家一行 3 张、520 两行；卡内竖排；改预算即时重算 |
| P3 订阅 | 截图 | 1000/760/520 = 4/3/2；辅助 68% |
| 范围与明细 | 截图 | 底框内范围 + 摘要带 + 8 列；摘要两半居中；顶部行左对齐 |
| 设置胶囊 | 截图 | 三行标签对齐；仅立即刷新主按钮 |
| 响应式 | 三档量宽 | `scrollWidth === clientWidth` |
| 回归 | `npm test` / `npm run e2e` | 全部通过 |

## 五、测试

- L1：`npm test`（host 侧聚合、备份、locale 词典）。
- L2/L3：`npm run e2e` 覆盖 P1/P2/P3、三色环、单币种、三档宽度、胶囊。
- 手工：`npm run preview page-p1/p2/p3` 目检；`npm run shots` 重出 README 图。

## 六、风险与回滚

| 风险 | 处理 |
|---|---|
| 环色断言在亮 / 暗主题下取色不同 | e2e 只断言「环与数字同色」，不断言具体 hex |
| P2 `fit-content` 在长 provider 名下变宽 | 模型名 190px 截断；`max-width 480` 兜底 |
| 卡片化改动面大，e2e 全红 | 按 S0→S3 串行提交，每阶段可独立回滚 |
| 窄屏摘要带堆叠后过高 | ≤560 单列；明细内部滚动，不撑高页面 |
| 截图脚本与新布局不同步 | S4 先跑 `shots` 再改 README，避免图文档不一致 |

## 七、文档回写

- 实施完成后：`ui-design.md` 状态由「待实施」改「已实现」；本 plan 移入 `docs/plan/archived/`。
- 新建 `docs/checklist/active/board-redesign-build-checklist.md` 记录阶段进度与偏差。
- README / CHANGELOG 按 S4 落地。
