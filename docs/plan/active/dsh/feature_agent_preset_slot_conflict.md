# P1 槽位迁移与官方 Agent 模式恢复

> 状态：待验收（2.0.0 候选，未正式发布）<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（两轮迭代：槽位事实 + 右侧落点）<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[GitHub issue #1](https://github.com/spartawhy117/dsh-token-dash/issues/1)、[`ui-design.md`](../../../ui-design.md) v3.5、归档看板 plan [`feature_board_cards_redesign.md`](../archived/dsh/feature_board_cards_redesign.md)

## 一、最终需求与范围

| ID | 处置 | 需求 | 最终结论 |
|---|---|---|---|
| REQ-01 | 完成 | 不再占用 `conversation.hero.agentPreset` | 删除 hero 注入，官方「标准 / 创造 / 自定义」恢复 |
| REQ-02 | 完成 | P1 从输入区下方移到输入框右侧 | 改挂 `conversation.input.right`，不再用 `composer.dock` |
| REQ-03 | 完成 | 不重复挂载 Pill | 删除 `composer.dock` 注入；只保留 `input.right` 一处 |
| REQ-04 | 完成 | 空白页不再有顶部 hero Pill | 空白页只保留输入框右侧 P1（若宿主渲染 input.right） |
| REQ-05 | 完成 | 文档同步槽位与位置 | `ui-design.md` §3、README P1 说明 |
| REQ-06 | 完成 | e2e 防回归 | 无 hero / 无 composer.dock 日志；有 input.right；P1 可点开 P2 |
| BND-01 | 保持 | 不改官方模式选择器实现 | 不复制、不包裹、不替换官方组件 |
| BND-02 | 保持 | 不改 `main` / `sidebar.panellist` | P3 / 侧栏入口不动 |
| BND-03 | 保持 | 不改 `/summary`、`/usage`、`/prefs`、VM、provider | 纯客户端槽位迁移 |
| RSK-01 | 已验证 | input.right 位于提交按钮前，P1 过宽压缩输入框 | 真机/e2e 量宽；必要时压缩 P1，不改 P2 |
| RSK-02 | 已验证 | 面板从右侧打开可能溢出窗口 | 既有 `measurePanel` 左移逻辑需回归 |
| RSK-03 | 已验证 | 空白页 input.right 是否渲染 | 宿主按 session 条件渲染；实测确认，不强行兜底 |

## 二、代码事实与原因

### 2.1 官方模式为何消失

`client.js` 的 hero 注入：

```js
slots.inject('conversation.hero.agentPreset', () => {
  reportMount('conversation.hero.agentPreset')
  return slots.register(
    { name: 'conversation.hero.agentPreset', id: 'token-dash-home', order: 10 },
    LocaleRoot,
  )
})
```

`LocaleRoot` 渲染 `Pill`。DSH 槽位表：

```text
conversation.hero.agentPreset   single   session-maybe  ← 官方模式按钮独占
conversation.hero.options       list     session        ← 空白页不渲染
conversation.input.right        list     session        ← 提交按钮前，可追加
conversation.composer.dock      list     session        ← 输入区下方居中
```

`agentPreset` 是 `single`，插件注册后官方组件被顶掉；`order` 不能解决。`hero.options` 在空白页不存在，不能放 Pill。

### 2.2 为什么不是只删 hero

当前 P1 还挂在 `composer.dock`：

```js
slots.inject('conversation.composer.dock', () => {
  ...
  return slots.register(
    { name: 'conversation.composer.dock', id: 'token-dash-input', order: -1 },
    LocaleRoot,
  )
})
```

`composer.dock` 的宿主 CSS 是 `justify-content:center`，P1 在输入框下方居中，不是右侧；`order:-1` 只会把它放在该居中组的最左。要满足“输入框右侧”，应使用 `conversation.input.right`，它是提交按钮前的 `list` 槽位。

### 2.3 不成立的修法

| 方案 | 结论 |
|---|---|
| 继续占 `agentPreset` / 改 order | 单槽位冲突，官方模式消失 |
| 用 `hero.options` | 空白页 `sessionId` 不存在，不渲染 |
| DOM 测量 + 绝对定位 | 依赖哈希 class / React 重渲染，升级易坏 |
| 保留 `composer.dock` 只改 order | 父级居中，P1 仍不在右侧 |

## 三、不改动 / 边界

- 不改官方模式选择器的渲染、文案、顺序或样式。
- 不改 P2 / P3 布局、预算、provider、VM 与接口。
- 不引入 DOM 注入、绝对定位或 MutationObserver。
- 不改空白页为“必须有 Pill”；宿主不渲染 input.right 时接受无 P1。

## 四、改动总览

| 范围 | 改动 |
|---|---|
| `client.js` | 删除 `conversation.hero.agentPreset` 注入 |
| `client.js` | 删除 `conversation.composer.dock` 注入 |
| `client.js` | 新增 `conversation.input.right` 注入，`id: token-dash-input`，`order: 10` |
| `client.js` | `reportMount` 只记录 `input.right` / `main` / `sidebar.panellist` |
| `docs/ui-design.md` §3 | P1 改「输入框右侧 `conversation.input.right`」；不占用 hero |
| `README.md` / `README.en.md` | P1 说明改「输入框右侧」 |
| `scripts/e2e.mjs` | 记录 `/log` 的 slot；断言无 hero / 无 composer.dock、有 input.right；P1 仍可开 P2 |
| `test/unit/client-slots.test.mjs` | 静态断言源码不再出现 hero / composer.dock，出现 input.right |
| `CHANGELOG.md` | 2.0.0 追加槽位迁移说明 |

### 结构

```text
player:
  conversation.input.right → P1 Pill（提交按钮前，右侧）
  main                     → P3 BoardPage
  sidebar.panellist        → BoardEntry

removed:
  conversation.hero.agentPreset → 官方模式按钮归还宿主
  conversation.composer.dock    → 不再在输入框下方重复挂载
```

### 验收

- 新会话页官方模式按钮可见；顶部不再有 Pill；
- 输入框右侧出现 P1，点击可打开 P2；
- 槽位日志只有 `conversation.input.right` / `main` / `sidebar.panellist`；
- `npm test` 80 通过；`npm run e2e` 通过；
- 2.0.0 候选包可安装，P2/P3 截图不回归。

## 五、迭代记录

### 第一轮 · 初始删除方案

- 只删 hero，保留 `composer.dock`；结论：官方模式恢复，但 Pill 仍在输入框下方居中，不满足“右侧”。
- 补充 `input.right` 槽位事实：`list`、`session`、位于提交按钮前。
- 决定迁移 `composer.dock → input.right`，并删除 composer 注入，避免双挂载。

### 第二轮 · 代码与测试复核

- `composer.dock` 父级 `justify-content:center`，改 order 无法右移；必须换槽位。
- `input.right` 与 `composer.dock` 都按 `session` 渲染；空白页是否出现取决于宿主 sessionId，不能插件强行造节点。
- 删除 hero 后，e2e 不能再依赖 hero 找 P1；P1 断言改为 input.right，并记录 slot 日志。
- 面板从右侧打开会走既有 `measurePanel` 左移；e2e 继续覆盖面板边界，不新做浮层定位。
- 文档遗漏补齐：README P1 描述、UI §3、CHANGELOG、静态槽位单测。

## 六、关联资料

- GitHub issue #1：<https://github.com/spartawhy117/dsh-token-dash/issues/1>
- 归档看板 plan：[`feature_board_cards_redesign.md`](../archived/dsh/feature_board_cards_redesign.md)
- P1 设计：[`ui-design.md`](../../../ui-design.md) §3
- 参考位置：`shy3130/dsh-quota` 输入框底栏右侧；`InvisibleSirius/dsh-quota-dashboard` 侧栏底部

## 九、自测反馈台

本 plan 即 GitHub issue #1 的处理单。

- 2026-11-05：`client.js` 已删除 hero / composer.dock 注入，P1 只挂 `conversation.input.right`；
- e2e 已断言槽位日志：有 `input.right`，无 `hero.agentPreset` / `composer.dock`；
- e2e 截图中官方「标准模式」按钮恢复，P1 位于输入框右侧；
- `npm test` 80 通过 / 0 失败，`npm run e2e` UI assertions passed；
- P2 面板在 input.right 下补 `lineHeight: 1.4`，修复宿主行高导致的表格换行。
