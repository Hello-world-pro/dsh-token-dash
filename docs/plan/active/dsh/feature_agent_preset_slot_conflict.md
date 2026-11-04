# P1 槽位与官方 Agent 模式冲突

> 状态：已对齐（待实施）<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（对照 GitHub issue #1 与当前代码）<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[GitHub issue #1](https://github.com/spartawhy117/dsh-token-dash/issues/1)、[`ui-design.md`](../../../ui-design.md) v3.5、归档看板 plan [`feature_board_cards_redesign.md`](../archived/dsh/feature_board_cards_redesign.md)

## 一、最终需求与范围

| ID | 处置 | 需求 | 最终结论 |
|---|---|---|---|
| REQ-01 | 待实施 | 不再占用 `conversation.hero.agentPreset` | 删除该槽位注入，官方「标准 / 创造 / 自定义」恢复 |
| REQ-02 | 待实施 | P1 Pill 仍在新会话 / 会话页可见 | 保留 `conversation.composer.dock` 注入 |
| REQ-03 | 待实施 | 不通过 `order` / 条件挂载绕过冲突 | 该槽位不是可共存列表；只移除占用 |
| REQ-04 | 待实施 | 文档同步「P1 只有一处槽位」 | `ui-design.md` §3 改单槽说明 |
| REQ-05 | 待实施 | e2e 覆盖官方模式按钮 + P1 | 新会话页模式可见、P1 在输入区 |
| BND-01 | 保持 | 不改官方模式选择器实现 | 不复制、不替换、不包裹官方组件 |
| BND-02 | 保持 | 不改 `main` / `sidebar.panellist` 入口 | 仅删除 hero 注入 |
| BND-03 | 保持 | 不改数据接口 / VM / provider | 纯客户端挂载修复 |
| RSK-01 | 待验证 | 删除后新会话页没有 Pill | composer dock 在空会话也存在；e2e 断言 |
| RSK-02 | 待验证 | 宿主槽位 DOM 变化导致 e2e 选择器不稳 | 以文本「标准 / 创造」为主，选择器兜底 |

## 二、代码事实与原因

### 2.1 直接落点

`client.js` · `slots.inject('conversation.hero.agentPreset')`：

```js
slots.inject('conversation.hero.agentPreset', () => {
  reportMount('conversation.hero.agentPreset')
  return slots.register(
    { name: 'conversation.hero.agentPreset', id: 'token-dash-home', order: 10 },
    LocaleRoot,
  )
})
```

`LocaleRoot` 最终渲染 `Pill`（`h(Pill, props)`）。

### 2.2 原因

- `conversation.hero.agentPreset` 是宿主「新会话 → 选择工作区」右侧 Agent 模式选择器的槽位，**不是可追加多个组件的容器**。
- 插件向同名槽位 `register` 了 `token-dash-home`，宿主的官方模式组件被顶掉；issue 中「停用插件即恢复」正好对应。
- `order: 10` 只在槽位支持多组件排序时有意义；这里改小或改大都不能解决，因为冲突来自**注册本身**。
- `conversation.composer.dock` 已经提供 P1 Pill；hero 注入是重复挂载，删掉不会失去主入口。

### 2.3 不成立的修法

| 方案 | 结论 |
|---|---|
| 把 `order` 调到比官方低 | 仍是同一槽位注册，不能保证官方保留 |
| 条件挂载 / 延迟挂载 | 只是把冲突推迟到某个时点 |
| 给官方按钮加 CSS 恢复 | 官方组件未被渲染，CSS 无法恢复 |
| 复制一份官方模式选择器进插件 | 越界维护宿主 UI，版本一变就坏 |

## 三、不改动 / 边界

- 不改官方模式选择器的渲染、文案、顺序或样式。
- 不改 `main` / `sidebar.panellist` 入口，也不改 P1 → P2 → P3 交互。
- 不改 `/summary`、`/usage`、`/prefs`、VM 与 provider。
- 不使用 `order`、条件挂载或 CSS 遮挡来“共存”。

## 四、改动总览

| 范围 | 改动 |
|---|---|
| `client.js` | 删除 `slots.inject('conversation.hero.agentPreset', …)` 整段；保留 `composer.dock`、`main`、`sidebar.panellist` |
| `client.js` | `reportMount` 不再记录 `conversation.hero.agentPreset`；日志只应有 3 个槽位 |
| `docs/ui-design.md` §3 | 「两处槽位」改为「一处：会话输入区 `composer.dock`；不占用 `agentPreset`」 |
| `scripts/e2e.mjs` | 新会话页断言官方模式按钮（`标准` / `创造` 文本）可见；断言 `token-dash-pill` 仍在；断言槽位日志不含 `agentPreset` |
| `CHANGELOG.md` | 归入 2.0.0 候选修复；不单独发版 |

### 结构

```text
slots.inject 保留：
  conversation.composer.dock  →  P1 Pill
  main                        →  P3 BoardPage
  sidebar.panellist           →  BoardEntry

删除：
  conversation.hero.agentPreset → 不再注册 token-dash-home
```

### 验收

- 启用插件、重启 DSH → 新会话页「选择工作区」右侧模式按钮恢复；
- P1 Pill 仍出现在输入区，点击可打开 P2；
- `npm test` 79 通过、`npm run e2e` 通过；
- `slot.mount.ok` 只出现 `conversation.composer.dock` / `main` / `sidebar.panellist`。

## 四、关联资料

- GitHub issue #1：<https://github.com/spartawhy117/dsh-token-dash/issues/1>
- 归档看板 plan：[`feature_board_cards_redesign.md`](../archived/dsh/feature_board_cards_redesign.md)
- P1 设计：[`ui-design.md`](../../../ui-design.md) §3

## 九、自测反馈台

本 plan 即 GitHub issue #1 的处理单，暂无额外反馈；实施后回填模式按钮与 P1 的 e2e 结果。
