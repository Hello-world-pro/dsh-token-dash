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
    gauge.html          # Gauge 5 态
    cards-sub.html      # 订阅卡 6 态（带供应商名）
    cards-api.html      # 按量卡 5 态（预算可编辑）
  drafts/               # 探索稿：允许粗糙，定稿后移入 templates/
```

```bash
npm run preview gauge            # → .tmp/preview/gauge.png（2x，按内容高度裁剪）
npm run preview cards-sub
npm run preview cards-api
npm run preview drafts/explore   # → .tmp/preview/draft-explore.png
npm run preview gauge -- --scale 3
npm run preview:publish gauge    # → docs/pic/gauge.png（仅定稿）
```

- `cards-api` 的预算输入框可直接改值，环、状态与计划余额即时重算，用于验证阈值与超支表现。

## 模板对照

| 模板 | 对应设计章节 | 状态 | 覆盖 |
|---|---|---|---|
| `gauge.html` | `ui-design.md` §2.5 公共组件 | final | 5 态 |
| `cards-sub.html` | §5.4 订阅套餐 | final | 6 态 |
| `cards-api.html` | §5.3 按量计价 | final | 5 态 |

新增模板时补一行；状态用 `draft` / `final`，不写具体日期。

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
