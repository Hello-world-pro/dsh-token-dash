# 看板视觉走查 checklist（假数据截图）

> 状态：待批准（只记录问题与建议，未改代码）<br>
> 依据方案：[`feature_fullpage_board.md`](../../plan/active/dsh/feature_fullpage_board.md)（已实施，`1.2.0-local.2`）<br>
> 证据来源：`npm run shots` 生成的 `docs/pic/` 六张图（2026-11-04）<br>
> 生命周期：回写 plan 后归档到 `docs/checklist/archived/board-visual-review-checklist.md`

## 一、阶段总览

| 批次 | 范围 | 状态 |
|---|---|---|
| V1 | P3 整页表格与分区（UI-01 ~ UI-08） | 待批准 |
| V2 | P2 浮层（UI-09 ~ UI-12） | 待批准 |
| V3 | 截图脚本与缺失形态（UI-13 ~ UI-14） | 待批准 |

## 二、截图证据

| 图 | 覆盖 | 观察 |
|---|---|---|
| `panel-api.png` | P2 按量 | 四列紧凑、范围胶囊与表格衔接自然 |
| `panel-sub-2.png` | P2 两窗 | 两窗行对齐良好 |
| `panel-sub-3.png` | P2 三窗 | 第三窗与表头间距偏紧 |
| `settings.png` | P3 整页 | 名称列空白过大、缺窗占位噪声、明细表偏挤 |
| `pill-api.png` / `pill-sub.png` | P1 | 箭头为文本字形，小字号下有裁切风险 |

## 三、改进项

| # | 位置 | 现象 | 建议 | 优先级 | 落点 |
|---|---|---|---|---|---|
| UI-01 | P3 按量表 | 名称列 `1fr` 吸收全部剩余宽度，1000px 页内名称与数值间约 600px 空白 | 表格 `maxWidth: 760`，或名称列改 `minmax(8ch, 220px)` + 末尾 spacer | P1 | `client.js:1315` `BUDGET_COLS` |
| UI-02 | P3 订阅表 | 缺窗渲染 `月 ◌ — — · —`，一行四个占位 | 缺窗只保留 `月 —`；全部 provider 都缺该窗时整列不渲染 | P1 | `client.js:1425` `QuotaCell` |
| UI-03 | P3 订阅表 | 四个 provider 块连排，块间距 = 块内行距 | 块间 16 + 1px 分隔线，或 provider 行加 600 字重 + 底色 | P2 | `client.js:1443` `QuotaTable` |
| UI-04 | P3 明细表 | 8 列 `columnGap: 8` 偏挤；表头「费用（API 计价估算）」挤压末列 | gap 10–12；表头简化为「费用」+ `title` 说明 | P2 | `client.js:656/663` |
| UI-05 | P3 明细表 | `DeepSeek-V4.1-Flash` 同时来自 DeepSeek 与 OpenRouter，两行同名无法区分 | 模型名前加 provider 徽标，或按 provider 分组小标题 | P1 | `DetailTable` |
| UI-06 | P3 按量表 | `✎` 常驻且紧贴金额（`¥100.00 ✎`） | hover / focus 显示；或常驻降透明度到 .35 并留 6px | P2 | `client.js:1400-1407` |
| UI-07 | P3 按量表 | 「已用」列只有环 + 百分比，看不到已用金额 | 单元格补 `title="¥91.90 / ¥100.00"`，版面不变 | P2 | `client.js:1408` |
| UI-08 | P3 设置胶囊 | 第 2 行左右分置：日志两按钮在左、数据两按钮在右 | 四按钮同组左对齐，或中间加竖分隔 | P2 | `client.js:1277-1300` |
| UI-09 | P2 浮层 | 四列主区与范围胶囊之间无分隔（设计草图有横线） | 加 1px `border-top` 或把间距提到 10 | P2 | `Panel` 主体 |
| UI-10 | P2 头部 | 22×22 实心按钮视觉重量大于 13px 标题 | 图标 12–13px，或按钮背景透明、hover 才显 | P3 | `PanelHeader` |
| UI-11 | P2 订阅态 | 最后一个窗口行与用量表表头贴太近 | 表格前 8px 间距或 1px 分隔 | P2 | `Panel` 用量区 |
| UI-12 | P1 Pill | 展开箭头用文本 `⌃` / `⌄`，小字号下易裁切、基线偏 | 改旋转 SVG 或 CSS 三角 | P3 | `Pill` chevron |
| UI-13 | 截图脚本 | `settings.png` 底部约 150px 空白（`zoom:.72` + 固定视口） | 按内容高度 `clip`，或加高视口并解除容器滚动 | P2 | `tools/mock/shots.mjs` |
| UI-14 | 截图脚本 | 缺单窗订阅形态（P1/P2 均支持 1 窗） | 补 `panel-sub-1.png` 并在 README 增加一张 | P3 | `tools/mock/fixtures.mjs` / `shots.mjs` |

## 四、待拍板

| # | 问题 | 选项 |
|---|---|---|
| Q1 | 按量表宽度 | 全宽保留 / 限宽 760 / 名称列定宽 |
| Q2 | 缺窗渲染 | 保留四占位 / 只 `月 —` / 整列隐藏 |
| Q3 | 明细表归属 | 加 provider 前缀 / 分组小标题 / 维持现状 |
| Q4 | `✎` 显示 | hover 才显 / 常驻降透明度 |

## 五、阶段详情（批准后执行）

**AI 先行**

1. 按 Q1–Q4 定案改 `client.js` 样式与表格结构，不新增依赖。
2. 同步 `scripts/e2e.mjs` 中受影响的断言（仅当结构变化影响 testid）。
3. 重跑 `npm test` / `npm run e2e` / `npm run shots`。

**你收尾**

1. 目检重生成的 `docs/pic/` 六张图，确认空格、对齐、缺窗表现。
2. 回复暗号：`截图已确认，开始回写`。

## 六、测试 / 走查

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| 按量表名称与数值间距 ≤ 240px | 待执行 | 截图量 `名称右缘 → 数值列左缘` |
| 缺窗行占位 ≤ 2 个符号 | 待执行 | 目检 `月` 行 |
| 明细表同名列可区分 provider | 待执行 | 目检两行 DeepSeek |
| 胶囊第 2 行按钮同组 | 待执行 | 目检行内左缘 |

## 七、plan 回写候选

1. REQ-06/07 补「按量表限宽」与「已用单元格 title」口径。
2. REQ-08 补「缺窗只留标签 + 一个 `—`」的渲染规则。
3. D5（明细表）补 provider 归属方案。

## 八、执行日志

| 时间 | 轮次 | 结果 |
|---|---|---|
| 2026-11-04 | 截图分析 | 生成 6 张假数据截图，提出 UI-01 ~ UI-14；未改代码 |
