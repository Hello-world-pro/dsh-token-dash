# P3 设置卡片标题行

> 状态：待验收（2.0.0 候选）<br>
> 创建时间：2026-11-05<br>
> 更新时间：2026-11-05（文案确认 + 实现 + 测试）<br>
> 关联逻辑根：`dsh-token-dash`（`client.js`）<br>
> 关联资料：[`ui-design.md`](../../../ui-design.md) v3.8 §5.7、归档 plan [`feature_p1_bottom_right.md`](../../archived/dsh/feature_p1_bottom_right.md)

## 一、最终需求与范围

| ID | 处置 | 需求 | 建议结论 |
|---|---|---|---|
| REQ-01 | 完成 | P3 设置卡片增加一行标题 | 卡片内第一行，文案 **设置与数据管理** |
| REQ-02 | 完成 | 标题与现有三行区分 | 13px / 600、40px 高、左对齐，行下 1px 6% 分隔线 |
| REQ-03 | 完成 | 不改变现有控件顺序与行为 | 刷新间隔 / 日志 / 版本三行原样下移 |
| REQ-04 | 完成 | 文档、预览、截图、e2e 同步 | UI §5.7 / preview / settings.png / e2e |
| BND-01 | 保持 | 不加按钮、不加折叠、不改数据/接口 | 纯标题行 |
| BND-02 | 保持 | 不增加卡片高度之外的结构变化 | 只多一行 40px |
| BND-03 | 保持 | 不改 P1/P2 与 provider / VM | 仅 P3 设置胶囊 |
| RSK-01 | 待验证 | 标题与页面区块标题重复 | 建议用「设置与数据管理」；若嫌重复，降级为「设置」 |
| RSK-02 | 待验证 | 窄屏多一行后底部更贴底 | 保留胶囊底部 32px 留白 |

## 二、代码事实

`client.js` · `SettingsRows` 目前直接从「刷新间隔」行开始，没有标题行：

```js
h('div', {
  'data-testid': 'token-dash-settings-row',
  style: { ...styles.settingsRow, ...styles.settingsRowRefresh },
}, ...)
```

现有三行：

| 行 | 内容 |
|---|---|
| 1 | 刷新间隔 segmented / 账户余额 toggle |
| 2 | 日志：打开文件夹 / 导出日志 / 导出数据 / 导入数据 |
| 3 | 版本：`v2.0.0 · 价格表 …` / 检查更新 |

`EN` 字典已有 `设置与数据管理: Settings and data`，不需要新增翻译。

## 三、标题建议

**推荐：`设置与数据管理`**

理由：

- 与 `ui-design.md` §5.7 的区块名一致；
- 卡片里同时有日志、导入/导出、版本，单写「设置」偏窄；
- 文案已有中英文翻译，零新增 i18n；
- 与页面上方「范围与明细」形成同级区块语义。

不推荐：

- `设置`：太短，覆盖不了日志/导入导出；
- `更多`：无信息量；
- `选项`：与 DSH 宿主术语冲突。

视觉建议：

```text
┌────────────────────────────────────────────┐
│ 设置与数据管理                              │  ← 新增标题行，13px/600
├────────────────────────────────────────────┤
│ 刷新间隔   30秒 | 1分钟 | 5分钟   账户余额 ●│
│ 日志       打开日志文件夹 导出日志 …        │
│ 版本       v2.0.0 · 价格表 …       ⤓       │
└────────────────────────────────────────────┘
```

- 标题行 40px，左对齐，无右侧操作；
- 标题行下方 1px 6% 分隔线，后接原有三行；
- 卡片 padding 16 不变，总高度 +40；
- 窄屏不换行，不缩字号。

## 四、改动总览

| 范围 | 改动 |
|---|---|
| `client.js` · `SettingsRows` | 在首行前插入标题行，`data-testid='token-dash-settings-title'` |
| `client.js` · `styles` | 新增 `settingsTitle`（13px / 600 / 40px / 左对齐 / 下边框） |
| `docs/ui-design.md` §5.7 | 行表从 3 行改为 4 行；标题行规则 |
| `tools/preview/templates/page-p3.html` | 若模板有设置卡，补标题行；无则只改截图脚本 |
| `scripts/e2e.mjs` | 断言标题存在且在首个设置行之前 |
| `tools/mock/shots.mjs` | `settings.png` 重出，标题可见 |
| `CHANGELOG.md` | 2.0.0 补设置卡标题 |

### 结构

```text
settings capsule
  ├─ 设置与数据管理   ← 新增标题行
  ├─ 刷新间隔 / 账户余额
  ├─ 日志 / 数据
  └─ 版本 / 检查更新
```

### 不改动

- 不改三行控件、顺序、按钮样式与回调；
- 不加折叠、不加第二个标题、不加版本号到标题行；
- 不改 P1/P2、provider、VM、接口。

### 验收

- `settings.png` 顶部出现「设置与数据管理」；
- 原有三行位置整体下移 40px，功能不变；
- e2e 断言标题文本和顺序；
- `npm test` 80 通过，`npm run e2e` 通过；
- 2.0.0 候选包重打并安装。

## 五、关联资料

- UI §5.7：`docs/ui-design.md`
- 归档 P1/P2 plan：`docs/plan/archived/dsh/feature_p1_bottom_right.md`
- 设置卡代码：`client.js` · `SettingsRows`

## 九、自测反馈台

- 2026-11-05：标题文案确认「设置与数据管理」，代码插入 `token-dash-settings-title`；
- 标题行 40px / 13px / 600，原有三行下移，功能不变；
- `docs/ui-design.md` v3.8 §5.7 同步；
- `page-p3` 预览与 `settings.png` 已重出；
- `npm test` 80 通过；`npm run e2e` UI assertions passed（含标题顺序断言）。
