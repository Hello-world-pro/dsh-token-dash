# 看板卡片化施工 checklist

> 状态：待施工（plan 待批准；本轮只做文档）<br>
> 方案：[`feature_board_cards_redesign.md`](../../plan/active/dsh/feature_board_cards_redesign.md)<br>
> 设计：[`ui-design.md`](../../ui-design.md) v3.2、[`board-visual-review-checklist.md`](board-visual-review-checklist.md)<br>
> 原型：[`tools/preview/templates/`](../../../tools/preview/templates/)（`page-p1/p2/p3` + 四个组件状态页）<br>
> 目标版本：`1.3.0-local.1`（暂定，施工完成后按需调整）

## 一、阶段

| 阶段 | 内容 | CHG | 完成判据 | 状态 |
|---|---|---|---|---|
| S0 | 组件层 | CHG-01 ~ 04 | `ProgressRing` / `PercentValue` / `InlineRing` / `QuotaGauge` 可用；旧页面行为不变；`npm test` 绿 | 待施工 |
| S1 | P1 Pill | CHG-05 | 14/2 内联环、三色、最多 3 窗、SVG 箭头、空态 `--`；与 `page-p1` 一致 | 待施工 |
| S2 | P2 浮层 | CHG-06 ~ 09 | 按量四列 / 订阅三窗两行；表格补表头线；`fit-content` 280–480；320px 不横滚 | 待施工 |
| S3 | P3 整页 | CHG-10 ~ 15 | 两区卡片网格；摘要带 + 明细底框；三行胶囊；1000/760/520 = 4/3/2 | 待施工 |
| S4 | 脚本与文档 | CHG-16 ~ 19 | e2e 全绿；`shots` 重出图；README / CHANGELOG 同步 | 待施工 |

> 阶段串行：上一阶段 `npm test` 未通过不进入下一阶段；每阶段结束在本表回填状态与一句话证据。

## 二、测试矩阵

| 层 | 命令 | 覆盖 | 结果 |
|---|---|---|---|
| L1 | `npm test` | host 聚合、备份、locale 词典 | 待跑 |
| L2+L3 | `npm run e2e` | 三页、三色环、单币种、三档宽度、胶囊 | 待跑 |
| 预览 | `npm run preview page-p1/p2/p3` | 设计稿目检（非验收依据） | 待跑 |
| 截图 | `npm run shots` | README 图 | 待跑 |
| 打包 | `npm run pack` | `build/dsh-token-dash-1.3.0-local.1.tgz` | 待执行 |

## 三、风险与偏差

| 项 | 说明 | 处理 |
|---|---|---|
| 环色断言 | 亮 / 暗主题取色不同 | e2e 只断言「环与数字同色」 |
| P2 宽度 | 长模型名可能撑宽 | 模型列 190px 截断 + `max-width 480` |
| 卡片化改动面 | e2e 旧断言大量失效 | 按 S0→S3 串行提交，逐阶段回滚 |
| 窄屏高度 | 摘要带堆叠 | ≤560 单列；明细内部滚动 |

## 四、执行日志

| 时间 | 阶段 | 结果 |
|---|---|---|
| 2026-11-04 | 建稿 | 设计冻结，等待 plan 批准后启动 S0 |

## 五、回写去向

- 施工结论 → `feature_board_cards_redesign.md` §四 验收结果。
- 版本记录 → `CHANGELOG.md` 顶部对应版本块。
- 设计变更 → 先改 `ui-design.md`，再改本清单，最后改代码。
- 完成后：本清单归档到 `docs/checklist/archived/`，plan 移入 `docs/plan/archived/`。
