# dsh-token-dash 施工 checklist（UI 框线图版·归档压缩）

> 依据 plan：`../../../plan/active/feature_token_dash.md`<br>
> 状态：已完成并归档（2026-11-01）——v0.2 UI + #24-#47 五轮反馈闭环；L1 37/37、E2E pass、用户桌面验收；v1.0.0 已发布<br>
> 工程根：`dsh-token-dash`；本文件保留 UI 规格结论，执行细节见 git 历史与 plan 闭环卡

## 阶段总览

| 阶段 | 一句话 | 状态 |
|---|---|---|
| 0 页面组成 | UI 框线图与 P1/P2/P3 口径 | ✅ |
| 1 槽位与壳 | P1 两处位置、P2/P3 浮层壳 | ✅ |
| 2 VM 与数据 | catalog、providers、budgets、summary | ✅ |
| 3 订阅 adapter | DeepSeek / GLM / Kimi / OpenRouter；Qwen 仅 API | ✅ fixture |
| 4 客户端 | P1/P2/P3 重写 | ✅ |
| 5 测试 | L1-L4；L5 不覆盖 | ✅ L1/L2/L3 |
| 6 发布 | npm / GitHub / tarball | ✅ v1.0.0 |

## 决策记录

| # | 定案 |
|---|---|
| Q1 | P1 位置：首页工作区行；会话活动行左侧 |
| Q2 | P1 只保留 API / 订阅；未知默认 API |
| Q3 | P1 不显示对话 Token；API 显示预算%、今日、余额；订阅显示 5h/周 |
| Q4 | P2 全部 provider，不做范围筛选；API 卡 + 订阅卡 |
| Q5 | 每个 API provider 独立预算/进度条；无预算满格、无百分比 |
| Q6 | CNY / USD 分组，不换算、不跨币种合计 |
| Q7 | 费用表仅 API；订阅只进用量表 |
| Q8 | P3 只做 provider 模式 + 预算；不做价格编辑 |
| Q9 | 价格源：`catalog.json` + 社区表；Gitee 默认、GitHub 兜底 |
| Q10 | 新模型 exact → alias → 同 family 最新（近似）；跨代未定价 |
| Q11 | 订阅 adapter 严格参考 Lao / dsh-spend / usage-billing |
| Q12 | L4 fixture 为门槛；无订阅 Key，L5 不覆盖 |
| Q13 | P2/P3 只显示已配置/已检测 provider；不固定卡片数 |
| Q14 | 日志前缀 `[TD:<module>]`；固定 info；P3 只有打开目录/导出；不自动上传 |

## P1 底栏 Pill

```text
API    [API] 预算 91.9% · 今日 ¥0.04 · 余额 ¥87.66⌃
订阅   [订阅] 5h 42% · 周 18%⌃
```

- 首页在输入框上方工作区行；会话在输入框下方活动行左侧；两处都不撑开输入框。
- 只画 API / 订阅两态；判定不了默认 `[API]`；不显示 provider 名（hover title / aria-label 兜底）。
- API：`预算`（未设置为“未设置”）· 今日消耗 · 余额；金额按 provider 币种；余额开关只控制 P1。
- 订阅：5h/周窗口 + 重置时间；百分比是账户套餐，不拆单对话。
- 状态色：预算 <80% 主色、80%~100% 橙、≥100% 红；无数据 `--`，过期加 `~`。
- 高度 24、圆角 999、水平 padding 8、段间距 6；`Enter`/`Space` 展开，`aria-expanded` 同步。

## P2 浮层卡片

```text
Token 看板                          刷新  设置  关闭
自动侦测 API Key 类型：DeepSeek / Kimi / GLM / OpenRouter / Qwen
API 按量（已检测 N）
  [provider] 预算 ¥已用 / ¥总额 · %   今日 ¥      余额 ¥
  [==========------------------]
订阅套餐（已检测 N）
  [GLM Coding 5h 42% 周 18% 重置 14:05] [Kimi Coding ...]
API 费用明细（仅按量，按币种分组）  CNY 合计 / USD 合计
模型用量明细（全部供应商，合计 X）  请求 / 输入 / 命中 / 输出 / 命中率
```

- 卡片数量完全由 `summary.providers` 决定；无 API/订阅时隐藏对应区，两者皆无显示空态。
- API 卡：provider 名 + 预算段（已用/总额 · %，状态色）+ 今日 + 余额，第二行进度条；无预算显示“未设置预算”，满格中性色。
- 订阅卡：每 provider 一张，5h/周/月窗口、重置时间；百分比只来自官方配额。
- 费用表仅 API，按 CNY/USD 分组独立合计；订阅 token 只进用量表。
- 用量表全部 provider：请求、输入、命中、输出、命中率（`—` 表示无分母）。
- 卡片顺序：当前 provider 第一，其余按今日消耗降序；超过 3 个 API 卡内部滚动。
- 浮层从 pill 正上方弹出（左对齐、间距 8px、允许遮挡），宽 380-600，最大高 70vh；无底栏。
- 余额列恒显示；账户余额开关只控制 P1（#31）。

## P3 设置视图

```text
← 返回  Token 看板                                    [关闭]
API 计费（已检测 N）
  [DeepSeek 官方  月度预算 [100.00] CNY]
  [OpenRouter    月度预算 [50.00] USD]
订阅计费（已检测 N）                              [重新检测]
  [GLM Coding  订阅套餐 v  5h 42% / 周 18%]
显示        刷新间隔 [1 分钟 v]    账户余额 [开]
日志        查看日志 [打开日志文件夹] [导出日志]
价格与版本  查看价格明细  DeepSeek | GLM | Kimi | OpenRouter | Qwen
            版本 X.Y.Z                              [检查更新]
```

- 五个分区：API 计费 / 订阅计费 / 显示 / 日志 / 价格与版本；只列已配置 provider。
- API 卡单行：provider + 月度预算输入 + 币种；无计费模式下拉（#39），预算按 provider 币种。
- 订阅区只显示模式、窗口、重置时间；标题右侧一个“重新检测”，统一检查全部订阅 provider。
- 显示区只保留刷新间隔 + 账户余额开关；“本月 Token”开关删除（D-14）。
- 日志区只有打开固定目录 + 导出脱敏 `.log`；无诊断/级别/清空，不自动上传。
- 价格只读：内置 `catalog.json` + 社区表；OpenRouter 用 `/models`；未收录“未定价”；P3 不编辑单价。
- 预算输入：`3500`/`¥3,500.00` → 3500.00；`0` 视为未设置；空/非数/负数拒绝；`3500.999` 四舍五入 3501.00；上限 9,999,999.99。
- 自动保存：Enter、失焦、“← 返回”均保存；成功 1.5s 显示“已保存”；Esc 不处理（D-15）；无单独保存按钮。
- 检查更新：发现新版本 → 确认 → host 执行 `dsh plugin --profile <p> update <pkg>` → 提示重启；失败给可复制命令；不静默更新。

## P4 跳转与价格页

```text
首页/会话 P1 ──点击──> P2 看板 ──设置──> P3 设置视图
P3 ──← 返回──> P2；P2/P3 ──关闭按钮/点击外部──> 收起并归还焦点（Esc 不处理，D-15）
P3 ──查看价格明细──> 官方价格页（新窗口，插件不请求）
```

| 厂商 | 官方价格页 |
|---|---|
| DeepSeek | `https://api-docs.deepseek.com/quick_start/pricing` |
| GLM | `https://docs.bigmodel.cn/cn/guide/start/pricing` |
| Kimi | `https://platform.moonshot.cn/docs/pricing/chat` |
| OpenRouter | `https://openrouter.ai/models` |
| Qwen | `https://help.aliyun.com/zh/model-studio/billing-for-alibaba-cloud-model-studio` |

## P5 可访问性与文案（要点）

- Pill：`role=button`、`tabIndex=0`、Enter/Space、`aria-expanded`、完整 aria-label（provider/模式/预算或窗口/今日/余额）。
- Panel：`role=dialog`、焦点落标题；Settings 每行唯一 label，错误 `aria-live=polite`。
- 对比度正文 ≥4.5:1；预算状态不能只靠颜色；`prefers-reduced-motion` 关闭动效。
- i18n：`zh`/`en`，命名空间 `token-dash.*`；用 `{count}`/`{amount}` 占位，不拼句；金额按 provider 币种格式化。
- 关键空态：`未设置预算`、`本月暂无消耗`、`待配置`、`未定价`、`套餐查询失败`、`Token 数据不可用` + `重试`。
- 不显示“可用”“100% 可用”等无分母文案；订阅必须带“账户套餐”语义。

## P6 明确不做

- 不做右下角挂件、显示位置设置、OS 悬浮窗。
- 不做趋势图/热力图/请求日志页/逐条明细（交给官方后台）。
- 不做价格编辑、汇率换算、自定义币种；OpenRouter 只读 `/models`。
- 不做日志自动上传；只导出文件。

## 移交 / 遗留

| 编号 | 内容 | 去向 |
|---|---|---|
| M01 | P1 两处桌面视觉偏移 | 已实现；真实桌面走查确认 |
| M02 | 主题变量名未确认 | 宿主 CSS 变量 + 回退值 |
| M03 | OS 悬浮窗 | 首版不做（BND-04） |
| M04 | 官方峰谷价/社区表时效 | 发布前抽查 `catalog.json` 与社区 `updatedAt` |
| M05 | 余额适配 | 五家；Qwen 无余额/配额，只提示不请求 |
| M06 | 真实订阅 Key | L4 fixture 接受；L5 不覆盖 |

## 验证

| 用例 | 结果 | 证据 |
|---|---|---|
| L1 | ✅ | 37/37（pricing/VM/adapter/预算/币种） |
| E2E | ✅ | L2 + L3 全矩阵 pass（P1/P2/P3、空态、错误态） |
| 桌面走查 | ✅ | 真实环境验收（位置、浮层、明细、多轮反馈） |
| L5 | 不覆盖 | 无订阅 Key；不购买测试 Key |

## 施工踩坑（可复用）

- 客户端模块 id 必须等于包名，否则整个 Web 界面起不来。
- P1 槽位/DOM 失败不渲染 pill，但保留设置入口并记日志，不允许白屏。
- 浮层锚定必须以 pillWrap 为定位基准（Panel 必须渲染在 pillWrap 内）。
- E2E includes 断言易被相邻数字子串命中；用精确金额/行定位。
- `daily.json` 只存 token 与模型名，不落凭证/对话内容。

## 回写

VM/预算/币种、P1/P2/P3 位置与空态、adapter 参考与 L4、L1-L4 验收均已回写 plan §2.2/§五/§九/§十；本文件框线图作为 UI 规格结论保留。

