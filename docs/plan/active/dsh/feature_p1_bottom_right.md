# P1 底栏右侧与官方 Agent 模式恢复

> 状态：待验收（2.0.0 候选；单测 + e2e 通过）<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（两轮迭代：位置事实 + 最小改动）<br>
> 基线：`8c0c0a9` / 2.0.0 P2 三组摘要<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[GitHub issue #1](https://github.com/spartawhy117/dsh-token-dash/issues/1)、[`ui-design.md`](../../../ui-design.md) v3.7、看板 plan [`feature_board_cards_redesign.md`](feature_board_cards_redesign.md)

## 一、最终需求与范围

| ID | 处置 | 需求 | 最终结论 |
|---|---|---|---|
| REQ-01 | 完成 | P1 从底栏左侧移到右侧 | 仍在 `conversation.composer.dock`，只改排序 + 右对齐，不换槽位 |
| REQ-02 | 完成 | 与 `shy3130/dsh-quota` 的位置一致 | 输入框下方状态栏，Pill 贴最右，位于 Host 的 ContextMeter 右侧 |
| REQ-03 | 完成 | 删除新会话 hero 槽位占用 | 删除 `conversation.hero.agentPreset` 注入，官方模式按钮恢复 |
| REQ-04 | 完成 | 不重复挂载 | 不再新增 `input.right` / `input.dock`；P1 只保留 `composer.dock` |
| REQ-05 | 完成 | 代码改动最小 | Pill 根节点 `order:10`；不改 P2/P3/VM |
| REQ-06 | 完成 | 文档、预览、测试同步 | UI / README / design / CHANGELOG / page-p1 / e2e / 静态测试 |
| BND-01 | 保持 | 不改官方模式选择器实现 | 不复制、不包裹、不替换 |
| BND-02 | 保持 | 不改 `main` / `sidebar.panellist` | P3 / 侧栏入口不动 |
| BND-03 | 保持 | 不改 `/summary`、`/usage`、`/prefs`、VM、provider | 纯客户端位置修复 |
| BND-04 | 保持 | 不做 DOM 测量 / 绝对定位 / MutationObserver | 只使用 `composer.dock` 槽位 |
| RSK-01 | 已验证 | `order` 必须落在 Pill 根节点头上，注册项 order 不足以跨 ContextMeter | 根节点 `order:10` 后 e2e 右缘断言通过 |
| RSK-02 | 已验证 | 空白页 `composer.dock` 不渲染 | 空白页无 P1 是宿主行为；不做 DOM 兜底 |
| RSK-03 | 已验证 | 右侧 Pill 过宽压缩 ContextMeter | 真机量宽；必要时压缩 P1，不改 P2 |
| RSK-04 | 已验证 | 面板从右侧打开溢出 | 既有 `measurePanel` 左移逻辑回归 |

## 二、代码事实与原因

### 2.1 当前 P1 为什么在左侧

`client.js` 的注册：

```js
slots.inject('conversation.composer.dock', () => {
  reportMount('conversation.composer.dock')
  return slots.register(
    { name: 'conversation.composer.dock', id: 'token-dash-input', order: -1 },
    LocaleRoot,
  )
})
```

宿主 `composer.dock` 的布局：

```css
display: flex;
justify-content: center;
align-items: center;
gap: 12px;
```

`order: -1` 让 P1 排在插件列表最前；`Pill` 的 `pillWrap` 仍有 `marginLeft: 8`，所以它贴在左侧。

### 2.2 为什么只改 order 不够

`composer.dock` 的 DOM 顺序是：

```text
[ slot 注册项（P1） ] → [ ContextMeter ]
```

`order` 必须同时落在 **Pill 根节点**（`pillWrap`）上，才会作为 `composer.dock` 的 flex 子项参与排序，排到宿主 ContextMeter 之后；只改注册项的 `order` 仍会被包在 slot 容器里，停在 ContextMeter 左侧。

因此最小改动是：

```text
注册项 order: -1 → 10   // slot 列表顺序
Pill 根节点 order: 10   // 关键：作为 dock flex item 越过 ContextMeter
```

`marginLeft: 8` 保留即可，不需要 `auto`。这不是换槽位，也不是 DOM 注入；只加一个 `order` 属性。

### 2.3 官方模式按钮冲突

`client.js` 仍在 `conversation.hero.agentPreset` 注册 `token-dash-home`。该槽位是 `single`，官方「标准 / 创造 / 自定义」被顶掉；issue #1 已证实停用插件即恢复。必须删除这段注入。

### 2.4 不成立的方案

| 方案 | 结论 |
|---|---|
| 只调 order | 不能跨 ContextMeter，P1 仍左 |
| 换到 `input.right` | 那是输入框工具条，不是底部状态栏 |
| 换到 `input.dock` | 位置在输入框上方，不是底栏 |
| DOM 测量 + 绝对定位 | 依赖哈希 class / React 重渲染，升级易坏 |
| 保留 hero | 官方模式按钮继续消失 |

## 三、不改动 / 边界

- 不改官方模式选择器的渲染、文案、顺序或样式。
- 不改 P2 / P3 布局、预算、provider、VM 与接口。
- 不新增 `input.right` / `input.dock` 注册，不重复挂载 P1。
- 空白新会话页没有 `composer.dock` 时不强行显示 P1。

## 四、改动总览

| 范围 | 改动 |
|---|---|
| `client.js` · hero | 删除 `slots.inject('conversation.hero.agentPreset', …)` 整段 |
| `client.js` · composer.dock | `order: -1` → `order: 10` |
| `client.js` · `styles.pillWrap` | 新增 `order: 10`，让 Pill 根节点越过 ContextMeter |
| `scripts/e2e.mjs` | 记录 `/log` 的 slot；空白页断言无 hero、P1 不出现；有会话时断言 composer.dock + 右缘 |
| `test/unit/client-slots.test.mjs` | 静态断言：无 hero；composer.dock order 10；无 input.right |
| `docs/ui-design.md` §3 | P1 改为「输入框底栏右侧 `composer.dock`」；不占用 hero |
| `README.md` / `README.en.md` | P1 说明改「输入框底栏右侧」 |
| `docs/design.md` | P1 槽位与右对齐说明 |
| `tools/preview/templates/page-p1.html` | 标题/说明改「输入框底栏右侧」；组件展示不变 |
| `CHANGELOG.md` | 2.0.0 追加 P1 右移 + hero 释放 |

### 结构

```text
slots.inject 保留：
  conversation.composer.dock → P1 Pill（注册项 order 10，Pill 根节点 order 10）
  main                       → P3 BoardPage
  sidebar.panellist          → BoardEntry

删除：
  conversation.hero.agentPreset → 官方模式按钮归还宿主
不再使用：
  conversation.input.right / conversation.input.dock
```

### 验收

- 有会话：P1 在输入框底部状态栏最右，位于 ContextMeter 右侧；
- 新会话空白页：官方模式按钮恢复，顶部无 P1；
- 槽位日志只有 `composer.dock` / `main` / `sidebar.panellist`；
- `npm test` 80 通过；e2e 在空白页与有会话场景分别通过；
- P2 三组摘要、P3、预算、provider 不回归。

## 五、两轮迭代记录

### 第一轮 · 初始方案

- 目标位置定为 `composer.dock`，与 shy3130 一致；只调 `order`，不换槽位。
- 删除 hero 注入，保留 composer.dock，不引入 `input.right`。
- 文档、预览、测试清单初步列出。

### 第二轮 · 代码与验证复核

- 确认注册项 `order` 仍被 slot 容器包住；关键是把 `order:10` 放到 `pillWrap` 根节点，才能作为 dock flex item 排到 ContextMeter 之后。
- 确认 `composer.dock` 只在会话 composer 渲染；空白页无 P1 是宿主行为，不补 DOM。
- 确认 `input.right` / `input.dock` 都不是底部状态栏，排除。
- e2e 空白页只能断言「无 P1 / 无 hero」；P1 右缘与 P2/P3 需要真实会话或后续 session fixture，不能伪造 session。
- 预览 `page-p1.html` 只是组件展示，不改布局；`shots.mjs` 重出后裁剪图不变。
- 补齐 `docs/design.md`、README、CHANGELOG、静态槽位测试，避免只改 UI 文案。
- 没有 VM / provider / 接口改动。

## 六、代码落点（本轮不执行）

| 文件 | 位置 | 内容 |
|---|---|---|
| `client.js` | `slots.inject('conversation.hero.agentPreset', …)` | 整段删除 |
| `client.js` | `slots.register({ name: 'conversation.composer.dock', … })` | `order: -1` → `order: 10` |
| `client.js` | `styles.pillWrap` | 新增 `order: 10`（保留 `marginLeft: 8`） |
| `scripts/e2e.mjs` | 页面初始化 / Pill 断言 | 记录 slot；空白页无 hero / 无 P1；会话页右缘 |
| `test/unit/client-slots.test.mjs` | 新增 | 源码槽位静态断言 |
| `docs/ui-design.md` | §3 | 单槽 + 右侧说明 |
| `README.md` / `README.en.md` | P1 段落 | 「输入框底栏右侧 Pill」 |
| `docs/design.md` | P1 槽位说明 | composer.dock + 右对齐 |
| `tools/preview/templates/page-p1.html` | 标题 / 说明 | 位置文案，不改组件 |
| `CHANGELOG.md` | 2.0.0 | 右移 + hero 释放 |

## 七、关联资料

- GitHub issue #1：<https://github.com/spartawhy117/dsh-token-dash/issues/1>
- 看板 plan：[`feature_board_cards_redesign.md`](feature_board_cards_redesign.md)
- 参考位置：`shy3130/dsh-quota` 输入框底栏右侧
- P1 设计：[`ui-design.md`](../../../ui-design.md) §3

## 九、自测反馈台

- 2026-11-05：`client.js` 已完成 hero 删除、`composer.dock` order 10、Pill 根节点 order 10；
- `test/fixtures/e2e-session.jsonl`：脱敏后的完整会话事件，e2e 启动时写入临时 `sessions/`，点击「未命名」打开；
- 空白页：断言无 P1、官方「标准模式」可见；
- 会话页：断言 P1 挂 `composer.dock`、无 `hero.agentPreset`、P1 右缘距 dock 右缘 ≤ 24px；
- `npm test` 80 通过；`npm run e2e` UI assertions passed；
- P2 面板在既有 fixture 会话中正常打开。

### Issue #6 · P2 真实余额右对齐（[已修复]）

**现象**

P2 按量摘要目前是：环 / 已用·预算 / 真实余额；真实余额仍在第三列左对齐，第四列留空，右侧出现一块空白。用户要求「真实余额右对齐」。

**代码事实**

`client.js` · `P2Summary` 的余额节点：

```js
h('span', {
  'data-testid': 'token-dash-summary-balance',
  style: styles.summaryCell,
  title: tr('账户真实余额，不受预算影响'),
}, ...)
```

`styles.summaryCell` 没有对齐设置；`summaryRow` 是 4 列网格，余额只占第 3 列，第 4 列空。

**规则**

- 环 / 已用·预算前两组位置不动；
- 真实余额跨第 3–4 列：`gridColumn: '3 / 5'`；
- `justifySelf: 'end'`、`alignItems: 'flex-end'`、`textAlign: 'right'`；
- 标签 11px 与值 12px 都贴右缘，值仍用 tabular-nums；
- 面板固定 380、内容宽 346 不变；不新增第四组，不改 VM / 接口。

**文档 / 预览**

| 范围 | 改动 |
|---|---|
| `docs/ui-design.md` §4.1 / §4.3 | 余额改为右对齐；第 4 列作为余额右对齐区 |
| `tools/preview/templates/page-p2.html` | `.summary .cell` 余额右对齐，截图目检 |
| `README` 截图 | `npm run shots` 重出 `panel-api.png` |
| `CHANGELOG.md` | 2.0.0 补余额右对齐 |

**测试**

- 删除旧断言「balance cell should keep the trailing slot empty」；
- 新增：`balanceBox.right >= panelBox.right - 18`；
- 保留：摘要 3 组、无本月已花、已用/预算仍在中间；
- `npm test` 80 通过；`npm run e2e` 通过。

**版本**

- 2.0.0 候选；完成后重新 `npm run pack` 并覆盖安装；不 tag、不 npm publish。

- 验证（2026-11-05）：`npm test` 80 通过；`npm run e2e` 通过，余额右缘距面板右缘 ≤18px；`page-p2` 预览与 `panel-api.png` 已重出。
