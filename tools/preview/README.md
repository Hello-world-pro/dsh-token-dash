# tools/preview

组件与布局的「真实比例」预览工具：规格 + 模板 → HTML → 截图。原型本身是设计依据，会反向约束 `ui-design.md` 与实现。

## 为什么需要

- 手搓临时 HTML 看比例，尺寸/字号会散落在各处，改一次要改三处；本目录把数值收进 `spec.mjs`。
- 预览图属于临时产物，不该进 `docs/pic/`；但生成图的**方法**与原型要可复现、可入库、可 review。

## 四层约定

| 层 | 位置 | 入库 | 谁写 | 说明 |
|---|---|---|---|---|
| 定稿原型 | `templates/` | 是 | 人写 + review | 数值走 `spec.mjs`，可被设计文档引用 |
| 探索稿 | `drafts/` | 是 | 人写，可粗糙 | 允许硬编码；定稿后 promote |
| 生成物 | `.tmp/preview/` | 否 | 仅 `render.mjs` | 模板注入规格后的 HTML + PNG |
| 定稿图 | `docs/pic/` | 是 | 仅 `preview:publish` | README / 设计文档引用 |

## 结构与命令

```text
tools/preview/
  spec.mjs              # 尺寸/字号单一来源
  render.mjs            # 模板 + spec → 截图（支持 drafts/<name>）
  templates/
    _base.css           # 公共样式（卡片、Gauge、kv 行）
    _ring.js            # 环的统一绘制与状态判定（四个模板共用）
    ring.html           # 环全量状态：矩阵 / 阈值边界 / 尺寸档位 / 环心标签
    inline-ring.html    # InlineRing：P1/P2 内联组合 4 态 × 2 尺寸
    cards-sub.html      # 订阅卡 6 态（带供应商名）
    cards-api.html      # 按量卡 5 态（预算可编辑）
  drafts/               # 探索稿：允许粗糙，定稿后移入 templates/
```

```bash
npm run preview ring             # → .tmp/preview/ring.png（环的全量状态）
npm run preview inline-ring           # → .tmp/preview/inline-ring.png（P1/P2 内联组合）
npm run preview cards-sub
npm run preview cards-api
npm run preview drafts/explore   # → .tmp/preview/draft-explore.png
npm run preview ring -- --scale 3
npm run preview:publish ring     # → docs/pic/ring.png（仅定稿）
```

- `cards-api` 的预算输入框可直接改值，环、状态与计划余额即时重算，用于验证阈值与超支表现。

## 模板对照

| 模板 | 对应设计章节 | 状态 | 覆盖 |
|---|---|---|---|
| `ring.html` | `ui-design.md` §2.5.1 ProgressRing | final | 6 态 + 3 组边界 + 3 档尺寸 + 3 种环心 |
| `inline-ring.html` | §3 P1 / §4.4 订阅行 | final | 4 态 × 2 尺寸 + 组合示例 |
| `cards-sub.html` | §5.4 订阅套餐 | final | 6 态 |
| `cards-api.html` | §5.3 按量计价 | final | 5 态 |

新增模板时补一行；状态用 `draft` / `final`，不写具体日期。

## 改动联动

> 顺序固定：**先改 `spec.mjs` / 模板 → 看预览 → 再回写设计文档与 checklist**，不允许文档先行。

| 改动类型 | 需要同步的位置 | 验证 |
|---|---|---|
| 环径、字号、间距、颜色 | `spec.mjs` → 重跑预览 → `ui-design.md` 对应章节 → checklist §九 → 后续 E2E 尺寸断言 | `npm run preview <name>` 目检 |
| 新增 / 调整卡片状态 | `tools/mock/fixtures.mjs` 数据 + 对应模板 → `cards-*.png` → `tools/mock/AGENTS.md` §2 状态表 | 逐态对照，缺一态即不合格 |
| 新增 provider | fixtures 六处（provider / windows / usage / todayModels / monthModels / pricingLinks）→ 预览 → 状态覆盖表 | `npm run shots` + 预览 |
| 改交互（预算输入、展开、编辑） | 模板 JS + `ui-design.md` 交互章节（§5.6 等）+ checklist 对应 D 条目 | 预览里实际改值 / 点击一遍 |
| 新增或删除模板 | `templates/` + 本文件「模板对照」表；若进 README 另走 publish | `npm run preview <name>` |
| 定稿图换图 | `preview:publish` → `docs/pic/` → README / README.en 图片链接 | 目检 `docs/pic` 与 README |
| 只改文档规格 | 先回到原型确认，再改 `ui-design.md`；数字不复制到两处 | 原型与文档逐条对照 |

## 新增与晋升

**探索**：在 `drafts/` 写 `<name>.html`，`npm run preview drafts/<name>` 直接看效果，不必先接 `spec.mjs`。

**定稿**（晋升为 `templates/`）：

1. 把硬编码数值搬进 `spec.mjs`，模板改用 `var(--…)` 与 `window.__SPEC__`。
2. 移入 `templates/<name>.html`，删掉 `drafts/` 旧稿。
3. 跑 `npm run preview <name>` 确认与草稿一致。
4. 在「模板对照」表登记，并回写 checklist / `ui-design.md` 的对应章节。
5. 需要进 README 的图才 `npm run preview:publish <name>`。

## 纪律

- **手写 HTML 永不落 `.tmp/`**：探索进 `drafts/`，定稿进 `templates/`；`.tmp/preview/` 只接受渲染器输出。
- 文档引用稳定路径（`templates/…`）或命令，不引用 `.tmp/`。
- `docs/pic/` 只接受 publish 写入；分析跑留在 `.tmp/preview/`。
- 尺寸变更只改 `spec.mjs`；预览与后续 E2E 断言都从它取值。
