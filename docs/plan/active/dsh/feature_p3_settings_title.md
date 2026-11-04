# P3 设置区块外置标题

> 状态：待验收（2.0.0 候选）<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（标题改为画框外 + 实现 + 测试）<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[`ui-design.md`](../../../ui-design.md) v3.8 §5.7、归档 plan [`feature_p1_bottom_right.md`](../../archived/dsh/feature_p1_bottom_right.md)

## 一、最终需求与范围

| ID | 处置 | 需求 | 结论 |
|---|---|---|---|
| REQ-01 | 完成 | P3 设置区增加标题 | **画框外**区块标题「设置与数据管理」，与「范围与明细」同级 |
| REQ-02 | 完成 | 标题不进入设置胶囊 | 胶囊内不加标题行，原有三行保持不变 |
| REQ-03 | 完成 | 标题样式与已有区块一致 | `styles.sectionTitle`：13px / 600，位于 `boardSectionHead` |
| REQ-04 | 完成 | 文档、预览、截图、e2e 同步 | UI §5.7 / page-p3 / settings.png / e2e |
| BND-01 | 保持 | 不改设置三行控件与行为 | 刷新间隔 / 日志 / 版本原样 |
| BND-02 | 保持 | 不改 P1/P2、provider、VM、接口 | 仅 P3 结构 |
| BND-03 | 保持 | 不加折叠、按钮或第二标题 | 纯区块标题 |
| RSK-01 | 已验证 | 标题与页面区块标题重复 | 与「范围与明细」同款，视觉层级一致 |
| RSK-02 | 已验证 | 胶囊间距变化 | 用 `boardSection` 的 12px gap，不额外加卡内高度 |

## 二、代码事实

当前 P3 `BoardPage` 直接把设置胶囊作为兄弟节点：

```js
h('div', {
  'data-testid': 'token-dash-settings-capsule',
  style: styles.capsule,
}, h(SettingsRows, { ... }))
```

`SettingsRows` 从「刷新间隔」行开始；上一版错误地在 `SettingsRows` 内部插入标题行。

正确结构应复用其它区块的 `boardSection`：

```js
h('section', { style: styles.boardSection },
  h('div', { style: styles.boardSectionHead },
    h('b', { 'data-testid': 'token-dash-settings-title', style: styles.sectionTitle }, tr('设置与数据管理'))),
  h('div', { 'data-testid': 'token-dash-settings-capsule', style: styles.capsule },
    h(SettingsRows, { ... })))
```

`styles.sectionTitle` 已是 13px / 600；不需要新增 `settingsTitle`。

## 三、视觉

```text
设置与数据管理                    ← 画框外 h2，与「范围与明细」同级
┌────────────────────────────────────────────┐
│ 刷新间隔   30秒 | 1分钟 | 5分钟   账户余额 ●│
│ 日志       打开日志文件夹 导出日志 …        │
│ 版本       v2.0.0 · 价格表 …       ⤓       │
└────────────────────────────────────────────┘
```

- 标题在胶囊上方，胶囊不再包含标题行；
- 标题与胶囊间距由 `boardSection` 的 12px 控制；
- 胶囊底部 32px 留白不变；
- 窄屏不换行，不缩字号。

## 四、改动总览

| 范围 | 改动 |
|---|---|
| `client.js` · `BoardPage` | 用 `section.boardSection` 包住胶囊，加 `sectionTitle` 标题 |
| `client.js` · `SettingsRows` | 删除内部 `settings-title` 行 |
| `client.js` · `styles` | 删除 `settingsTitle`，复用 `sectionTitle` |
| `docs/ui-design.md` §5.7 | 标题改为区块外；行表恢复 3 行 |
| `tools/preview/templates/page-p3.html` | 标题移到胶囊外，样式同「范围与明细」 |
| `scripts/e2e.mjs` | 断言标题在胶囊外、位于胶囊上方 |
| `tools/mock/shots.mjs` | `settings.png` 重出 |
| `CHANGELOG.md` | 2.0.0 补设置区块标题 |

### 结构

```text
section.boardSection
  ├─ boardSectionHead → 设置与数据管理
  └─ capsule
       ├─ 刷新间隔 / 账户余额
       ├─ 日志 / 数据
       └─ 版本 / 检查更新
```

### 不改动

- 不改设置三行控件、顺序、按钮样式与回调；
- 不把标题放回胶囊内部；
- 不改 P1/P2、provider、VM、接口。

### 验收

- `settings.png` 中「设置与数据管理」位于胶囊上方；
- 标题与「范围与明细」同为 13px / 600；
- 胶囊内部第一行仍是刷新间隔；
- e2e 断言标题存在、在胶囊外、标题底部早于胶囊顶部；
- `npm test` 80 通过，`npm run e2e` 通过；
- 2.0.0 候选包重打并安装。

## 五、关联资料

- UI §5.7：`docs/ui-design.md`
- 归档 P1/P2 plan：`docs/plan/archived/dsh/feature_p1_bottom_right.md`
- 设置区代码：`client.js` · `BoardPage` / `SettingsRows`

## 九、自测反馈台

- 2026-11-05：确认标题应在画框外，与「范围与明细」同级；
- 实现改为 `section.boardSection` 包裹胶囊，`SettingsRows` 删除内部标题；
- `page-p3` 预览已改为外置标题；
- `npm test` 80 通过；`npm run e2e` UI assertions passed；
- `settings.png` 已重出。
