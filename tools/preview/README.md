# tools/preview

组件与布局的「真实比例」预览工具：模板 + 规格 → HTML → 截图，外加一份 ASCII 草图生成器。

## 为什么需要

- 手写带边框的 ASCII 草图会被 CJK 宽度搞歪；用 `ascii.mjs` 按字符宽度生成才对齐。
- 手搓临时 HTML 看比例，尺寸/字号会散落在各处，改一次要改三处；本目录把数值收进 `spec.mjs`。
- 预览图属于临时产物，不该进 `docs/pic/`；但生成图的**方法**要可复现、可入库。

## 三层约定

| 层 | 位置 | 入库 | 谁写 |
|---|---|---|---|
| 临时产物 | `.tmp/preview/` | 否 | `npm run preview` 自动写 |
| 预览工具 | `tools/preview/` | 是 | 人工维护模板与规格 |
| 定稿图 | `docs/pic/` | 是 | 仅 `npm run preview:publish` |

## 结构与命令

```text
tools/preview/
  spec.mjs              # 尺寸/字号单一来源
  render.mjs            # 模板 + spec → 截图
  ascii.mjs             # ASCII 草图
  templates/
    _base.css           # 公共样式（卡片、Gauge、kv 行）
    gauge.html          # Gauge 5 态
    cards-sub.html      # 订阅卡 6 态（带供应商名）
    cards-api.html      # 按量卡 5 态
```

```bash
npm run preview gauge          # → .tmp/preview/gauge.png（2x，按内容高度裁剪）
npm run preview cards-sub      # → .tmp/preview/cards-sub.png
npm run preview cards-api      # → .tmp/preview/cards-api.png
npm run preview gauge -- --scale 3
npm run preview:publish gauge  # → docs/pic/gauge.png（仅 README/设计文档定稿）
npm run sketch                 # 打印 ASCII 草图
```

## 新增一个预览

1. 在 `templates/` 加 `<name>.html`，尺寸只写 `var(--...)`，数值来源是 `spec.mjs`。
2. 需要新数值时先加进 `spec.mjs`，再由 `render.mjs` 注入 CSS 变量与 `window.__SPEC__`。
3. 跑 `npm run preview <name>` 看 `.tmp/preview/<name>.png`。
4. 定稿后才 `npm run preview:publish <name>`；并把 `spec.mjs` 的数值回写 checklist / 设计文档。

## 纪律

- 文档引用**命令**，不引用 `.tmp/` 路径（临时目录会被清理）。
- `docs/pic/` 只接受 publish 写入；分析跑一律留在 `.tmp/preview/`。
- 尺寸变更只改 `spec.mjs`；预览、ASCII 草图、后续 E2E 断言都从它取值。
- 一次性探索（只看个色块、不打算重画）不必建模板，临时写个 HTML 丢 `.tmp/` 即可。
