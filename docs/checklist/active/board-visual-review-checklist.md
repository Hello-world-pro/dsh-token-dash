# 看板视觉走查 checklist（假数据截图）

> 状态：待批准（2026-11-04 收首轮反馈，方案已定案，未改代码）<br>
> 依据方案：[`feature_fullpage_board.md`](../../plan/active/dsh/feature_fullpage_board.md)（已实施，`1.2.0-local.2`）<br>
> 证据来源：`npm run shots` 生成的假数据截图（分析跑输出到 `.tmp/shots/`，`docs/pic/` 只保留 README 定稿图）<br>
> 生命周期：回写 plan 后归档到 `docs/checklist/archived/board-visual-review-checklist.md`

## 一、阶段总览

| 批次 | 范围 | 状态 |
|---|---|---|
| V1 | P3 整页：订阅区大卡片 + 按量表 + 明细表 | 待批准 |
| V2 | P2 浮层：用量表样式 + 分隔与图标 | 待批准 |
| V3 | P1 细节与截图脚本（含 `.tmp/` 输出） | 待批准 |

## 二、决策记录（2026-11-04 首轮反馈定案）

| # | 问题 | 定案 |
|---|---|---|
| D1 | 测试 / 分析截图存哪 | 统一输出 `.tmp/shots/`；`docs/pic/` 只放 README 定稿图，定稿时才覆盖 |
| D2 | P2 用量表样式 | **补表格样式**：表头底色 + 下边线、行高 28、行间 1px 分隔、数值列右对齐、单元格左右内边距 2–6px |
| D3 | P3 订阅区太空、环太小 | **改为一张大卡片**：圆角 8 / 1px border-l3 / padding 16；卡片内按 provider 横向分列，窗口在列内竖排，环放大到 24/3 |
| D4 | 按量表宽度（Q1） | 表格限宽 760，名称列 `minmax(8ch, 220px)` + 末尾 spacer |
| D5 | 缺窗渲染（Q2） | 只保留 `月 —` 一个占位；所有 provider 都缺该窗时整列不渲染 |
| D6 | 明细表归属（Q3）/ `✎` 显示（Q4） | 模型名前加 provider 徽标；`✎` 改为 hover / focus 显示，常驻时 opacity .35 |

## 三、截图证据

| 图 | 覆盖 | 观察 |
|---|---|---|
| `panel-api.png` / `panel-sub-2/3.png` | P2 三种形态 | 用量表只有裸 grid，无表头底色与行分隔 |
| `settings.png` | P3 整页 | 订阅区四个 provider 松散连排、环 14 过小、右侧大片空白 |
| `pill-api.png` / `pill-sub.png` | P1 | 箭头为文本字形，小字号下有裁切风险 |

## 四、改进项

| # | 位置 | 现象 | 建议 | 优先级 | 落点 |
|---|---|---|---|---|---|
| UI-15 | P2 用量表 | 仅 `rowGap` + grid：无表头底色、无行分隔、无内边距，读起来像裸文本 | 表头 12px/500 + `border-bottom`；行高 28；行间 1px 分隔；首列左内边距 2；数值列右对齐 | **P0** | `client.js` `TokenTable` / `styles.table` |
| UI-16 | P3 订阅区 | 每窗一行、环 14；四块 provider 平铺，右侧留白大、整体空 | 一张大卡片（圆角 8 / 1px border-l3 / padding 16）；卡片内 provider 横向分列（≤760 两列、≤520 一列），每列窗口竖排、环 24/3、字段同 P2 | **P0** | `client.js` `QuotaTable` / `QuotaCell` |
| UI-02 | P3 订阅表 | 缺窗渲染 `月 ◌ — — · —`，一行四个占位 | 只保留 `月 —`；全 provider 都缺该窗时整列不渲染（D5） | P1 | `QuotaCell` |
| UI-01 | P3 按量表 | 名称列 `1fr` 吸收全部剩余宽度 | 限宽 760 + 名称列定宽（D4） | P1 | `BUDGET_COLS` |
| UI-05 | P3 明细表 | 同名模型来自不同 provider 无法区分 | 模型名前加 provider 徽标（D6） | P1 | `DetailTable` |
| UI-03 | P3 订阅区 | 块间无分组 | 由 UI-16 的大卡片 + 列间分隔解决 | P1 | 随 UI-16 |
| UI-04 | P3 明细表 | 8 列 `columnGap: 8` 偏挤、表头过长 | gap 12；表头改「费用」+ `title` | P2 | `DetailTable` |
| UI-07 | P3 按量表 | 「已用」列无金额 | 补 `title="¥91.90 / ¥100.00"` | P2 | `BudgetTable` |
| UI-06 | P3 按量表 | `✎` 常驻且贴金额 | hover / focus 显示（D6） | P2 | `BudgetTable` |
| UI-08 | P3 设置胶囊 | 第 2 行左右分置 | 四按钮同组左对齐 | P2 | `SettingsRows` |
| UI-09 | P2 浮层 | 主区与范围胶囊无分隔 | 1px 分隔线或间距 10 | P2 | `Panel` |
| UI-11 | P2 订阅态 | 窗口行与表头贴太近 | 表前 8px 或分隔线 | P2 | `Panel` |
| UI-10 | P2 头部 | 22px 实心图标压过 13px 标题 | 图标 12–13px 或按钮背景透明 | P3 | `PanelHeader` |
| UI-12 | P1 Pill | 箭头用文本字形 | 改旋转 SVG / CSS 三角 | P3 | `Pill` |
| UI-13 | 截图脚本 | P3 截图底部约 150px 空白；分析图混入 `docs/pic` | 支持 `--out`（默认 `docs/pic`，分析跑传 `.tmp/shots`）；按内容高度裁剪 | P1 | `tools/mock/shots.mjs` |
| UI-14 | 截图脚本 | 缺单窗订阅形态 | 补 `panel-sub-1`（分析图进 `.tmp/shots`，定稿再进 README） | P3 | `fixtures.mjs` / `shots.mjs` |

## 五、阶段详情（批准后执行）

**V1 · P3**

1. `QuotaTable` 改大卡片布局：provider 横向分列、窗口竖排、环 24/3；卡片 padding 16、列间 1px 分隔。
2. 缺窗按 D5 收口；按量表按 D4 限宽；明细表加 provider 徽标。
3. 重跑截图，确认卡片高度与四 provider 分布。

**V2 · P2**

1. `TokenTable` 补表头底色、行分隔、行高 28、内边距；保持四列与 Tokens 对齐基线。
2. 主区与胶囊、窗口行与表表头补分隔。
3. 重跑截图，确认表头与数字右缘对齐。

**V3 · P1 与脚本**

1. 箭头改 SVG；`shots.mjs` 加 `--out`，分析跑写 `.tmp/shots`。
2. 补单窗形态截图（仅 `.tmp`）。

**你收尾**

1. 目检 `.tmp/shots/` 新图，确认卡片布局与表格样式。
2. 回复暗号：`截图已确认，开始回写`。

## 六、测试 / 走查

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| P2 表头有底色与下边线 | 待执行 | 目检表头区域 |
| P2 行间有 1px 分隔且行高 ≥28 | 待执行 | 截图量行高 |
| P3 订阅卡片列数 = provider 数（≤760 两列） | 待执行 | 1000 / 760 两档截图 |
| P3 环直径 = 24 | 待执行 | 截图量环 |
| 缺窗只出现 1 个 `—` | 待执行 | 目检 `月` 列 |
| `npm run shots -- --out .tmp/shots` 不写 `docs/pic` | 待执行 | 对比目录文件时间 |

## 七、plan 回写候选

1. REQ-08 补「订阅区大卡片 + 环 24」形态。
2. REQ-06 补「P2 用量表表格样式」最小规格（表头 / 行高 / 分隔）。
3. REQ-07 补按量表限宽与已用 `title`；明细表补 provider 徽标。
4. 文档约定：分析截图进 `.tmp/`，`docs/pic` 仅定稿图。

## 八、执行日志

| 时间 | 轮次 | 结果 |
|---|---|---|
| 2026-11-04 | 首轮截图分析 | 提出 UI-01 ~ UI-14 |
| 2026-11-04 | 反馈定案 | 收 D1–D6；新增 UI-15（P2 表格样式）、UI-16（P3 订阅大卡片），P0 两项 |
