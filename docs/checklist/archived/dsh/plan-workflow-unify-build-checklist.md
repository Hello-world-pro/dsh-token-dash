# Plan/Checklist 目录与全局 skill 单一化施工 checklist

> 依据：2026-11-01 决策——CE `skills/plan-workflow` + `skills/checklist` 作为唯一 skill 源，所有仓库统一 `docs/`；本轮无独立 plan。<br>
> 命名：CE checklist skill 规则为 `<topic>-<阶段>-checklist.md`；本文件 `plan-workflow-unify-build-checklist.md` 符合该规则。若改为 `checklist-` 前缀，必须先改 CE skill 与全部存量 checklist，不在本轮偷偷改。<br>
> 生命周期：**已归档**（原 active → `docs/checklist/archived/dsh/`）<br>
> 当前状态：**已完成并归档**（2026-11-01；文档迁移、CE skill 通用化、全局 junction 均完成）<br>
> 工程根：`dsh-token-dash`（包名 `dsh-token-dash`）<br>
> 关联：CE `skills/plan-workflow/SKILL.md`、`skills/checklist/SKILL.md`；本机 `C:\Users\SpartaWHY117\.agents\skills\`<br>
> 本文件位置：`docs/checklist/archived/dsh/plan-workflow-unify-build-checklist.md`<br>

## 〇、决策记录

| # | 问题 | 定案 |
|---|---|---|
| Q1 | 唯一 skill 源 | CE `skills/plan-workflow` + `skills/checklist`；不再维护简化版全局 skill |
| Q2 | 文档根 | 全部统一 `docs/`；`doc/`、根 `plan/` 迁移后删除 |
| Q3 | plan 路径 | `docs/plan/active/dsh/feature_<topic>.md`；当前文件为 `feature_token_dash.md` |
| Q4 | checklist 路径 | `docs/checklist/active/dsh/` 与 `docs/checklist/archived/dsh/` |
| Q5 | 全局 skill 安装 | 目录 junction 指向 CE；不手工复制、不手工改全局副本 |
| Q6 | CE skill 元数据 | 去掉 CE 限定，补 `dsh` 项目域，路径保持 workspace-relative |
| Q7 | 文件名 | 维持 CE 的 `<topic>-<阶段>-checklist.md` 后缀规则；不改 `checklist-` 前缀 |
| Q8 | 提交边界 | 代码仓与 CE 分别提交、分别推送；推送前由用户确认 |
| Q9 | 开工条件 | 阶段 0-6 全部通过，尤其 README Gate；用户确认后才开始业务开发 |

## 一、现状与基线

| 对象 | 当前状态 |
|---|---|
| 代码仓文档 | `plan/active/token-dash/plan.md`、`doc/design.md`、`doc/release.md`、`doc/pic/`、`doc/checklist/archived/*.md` |
| 代码仓目标 | `docs/plan/active/dsh/feature_token_dash.md`、`docs/checklist/archived/dsh/*.md`、`docs/design.md`、`docs/release.md`、`docs/pic/` |
| 代码仓 `docs/` | 当前只有本 checklist；迁移时把 `doc/` 内容并入，不对 `doc` 做整目录改名 |
| CE | dsh 的 plan/checklist 已删除；`skills/plan-workflow`、`skills/checklist` 保留 |
| 本机全局 skill | `~/.agents/skills/plan-workflow` 目前是简化版；无 `checklist` skill |

## 二、阶段总览

| 阶段 | 一句话 | 状态 |
|---|---|---|
| 0 契约与基线 | 确认命名、唯一 skill 源、目标树、现状基线 | ✅ |
| 1 文档迁移 | `doc/` + 根 `plan/` 并入 `docs/` | ✅ |
| 2 引用更新 | AGENTS / README / package / 文档互链 | ✅ |
| 3 README Gate | 目录变更后只读核对 README 与文档正确性 | ✅ |
| 4 CE skill 通用化 | 去 CE 限定、补 `dsh` 域、修可移植引用 | ✅ |
| 5 全局 skill 切换 | junction 指向 CE，验证 harness 加载 | ✅ |
| 6 全量验证与提交 | 测试、链接、pack、分别 commit/push、开工门槛 | ✅ |

## 三、阶段详情

### 阶段 0：契约与基线

**AI 先行**

1. 确认命名规则：CE checklist skill 使用后缀 `<topic>-<阶段>-checklist.md`；本文件符合。若要把 `checklist-` 作为新前缀，先停下，改 CE skill 与存量文件，不进入本轮迁移。
2. 确认唯一 skill 源为 CE 的 `skills/plan-workflow` 与 `skills/checklist`。
3. 确认目标树：

```text
docs/
├─ plan/
│  ├─ AGENTS.md
│  ├─ active/dsh/feature_token_dash.md
│  └─ archived/dsh/
├─ checklist/
│  ├─ AGENTS.md
│  ├─ active/dsh/plan-workflow-unify-build-checklist.md
│  └─ archived/dsh/token-dash-*.md
├─ design.md
├─ release.md
└─ pic/
```

4. 记录基线：当前 HEAD、README/README.en 的图片与链接、`package.json` 的 `files`；迁移后用同一清单复核。
5. 建议在迁移前建分支 `docs/plan-workflow-unify`，全部通过后再合并。

**你收尾**

1. 确认本机没有其它脚本/快捷方式依赖旧 `doc/` 或 `plan/` 路径。
2. 确认这批文档进入公开仓可接受。
3. 回复：`阶段 0 确认，开始阶段 1`。

### 阶段 1：文档迁移

**AI 先行**

1. 创建目标目录；`docs/checklist/active/dsh/` 已存在。
2. 用 `git mv` 保留历史，按以下映射移动：

| 当前 | 目标 |
|---|---|
| `plan/active/token-dash/plan.md` | `docs/plan/active/dsh/feature_token_dash.md` |
| `doc/checklist/archived/token-dash-release-checklist.md` | `docs/checklist/archived/dsh/token-dash-release-checklist.md` |
| `doc/checklist/archived/token-dash-ui-build-checklist.md` | `docs/checklist/archived/dsh/token-dash-ui-build-checklist.md` |
| `doc/checklist/archived/github-governance-build-checklist.md` | `docs/checklist/archived/dsh/github-governance-build-checklist.md` |
| `doc/design.md` | `docs/design.md` |
| `doc/release.md` | `docs/release.md` |
| `doc/pic/*.png` | `docs/pic/*.png` |

3. 迁移后删除空的 `doc/`、`plan/` 目录。
4. 不改 plan 状态；`feature_token_dash.md` 仍保持“待归档”。
5. 检查 `git status`，确认 Git 识别为 rename，而不是全量删除 + 新增。

**你收尾**

1. 抽查 `docs/` 树与上表一致，旧 `doc/`、`plan/` 不存在。
2. 回复：`阶段 1 完成，开始阶段 2`。

### 阶段 2：引用更新

**AI 先行**

1. 更新 `AGENTS.md`：
   - 文档位置改为 `docs/design.md`、`docs/release.md`、`docs/plan/active/dsh/feature_token_dash.md`、`docs/checklist/archived/dsh/`。
   - Git 管理表改为 `docs/**`，移除 `doc/**`、`plan/**`。
   - 发布 checklist 路径改为 `docs/checklist/archived/dsh/token-dash-release-checklist.md`。
2. 更新 `README.md` 与 `README.en.md`：`./doc/release.md`、`./doc/pic/*` 全部改为 `./docs/...`。
3. 更新 `package.json` 的 `files`：`doc/pic` → `docs/pic`。
4. 更新 `docs/design.md`：计划链接改为 `plan/active/dsh/feature_token_dash.md`；文件树中的 `doc/` 改为 `docs/`。
5. 更新 plan 与 checklist 互链：
   - plan 头部 checklist 链接：`../../../checklist/archived/dsh/...`（从 `docs/plan/active/dsh` 出发）。
   - checklist 头部 plan 链接：`../../../plan/active/dsh/feature_token_dash.md`（从 `docs/checklist/archived/dsh` 出发）。
   - release checklist 的发版手册：`docs/release.md`。
   - plan 内历史引用 `doc/pic`、`doc/release.md` 一并改 `docs/...`。
6. 创建本仓最小入口：
   - `docs/plan/AGENTS.md`：本仓 plan 统一 `docs/plan`，域 `dsh`，命名 `feature_<topic>.md`，操作前加载全局 plan-workflow。
   - `docs/checklist/AGENTS.md`：本仓 checklist 统一 `docs/checklist`，操作前加载全局 checklist。
7. 历史 `CHANGELOG.md` 条目保留原文，不改写；只保证当前文档链接有效。
8. 全局搜索旧路径并清零：
   - `doc/design.md`、`doc/release.md`、`doc/pic`、`doc/checklist`
   - `plan/active/token-dash`
   - 旧 `docs/` 引用（迁移后只应存在目标路径）

**你收尾**

1. 审阅 `AGENTS.md`、`README.md`、`README.en.md`、`package.json`、`docs/design.md` 的 diff。
2. 回复：`阶段 2 完成，开始阶段 3`。

### 阶段 3：目录变更后 README / 文档正确性 Gate

> 本阶段只读核对，不改文件。任何一项失败都回到阶段 2；不进入 skill 调整。

**AI 先行**

1. 按「四、README / 文档正确性矩阵」逐项核对。
2. 运行 Markdown 链接检查：README、README.en、AGENTS、docs 下全部 Markdown；0 缺失。
3. 检查图片：`docs/pic/` 四张 PNG 存在，README 两版都指向 `./docs/pic/...`。
4. 检查包清单：`npm pack --dry-run` 含 `docs/pic`，不含 `doc/pic`。
5. 检查旧路径：`git grep` 无 `doc/checklist`、`doc/release.md`、`doc/pic`、`plan/active/token-dash`。
6. 检查 README 功能文案未因目录移动丢失：安装三种方式、开发命令、发版说明、语言切换链接。
7. 检查 `docs/design.md` 文件树与 plan 链接、plan/checklist 互链。

**你收尾**

1. 在本地预览 README / README.en，确认图片、链接、安装命令正常。
2. 确认 Gate 通过；失败则回复具体项，回到阶段 2。
3. 回复：`阶段 3 通过，开始阶段 4`。

### 阶段 4：CE skill 通用化

**AI 先行**

1. 编辑 CE `skills/plan-workflow/SKILL.md`：
   - frontmatter 去掉 `location: Context-Engineer`，或改为 `location: workspace`。
   - description 从“管理 Context-Engineer 的 Plan”改为“管理当前 workspace 的 Plan”；保留 `docs/plan` 契约。
   - 在项目域表补 `dsh`：代码根为 `dsh-token-dash` 或用户明确指定时使用。
   - 所有 `docs/plan/AGENTS.md`、`skills/checklist/SKILL.md` 引用改为可移植写法：
     - 当前仓库存在 `docs/plan/AGENTS.md` 时读取；
     - checklist skill 用相对路径 `../checklist/SKILL.md` 或“加载 checklist skill”。
2. 编辑 CE `skills/checklist/SKILL.md`：
   - 同样去掉 CE 限定，description 改为当前 workspace。
   - 保持 `docs/checklist/...` 契约；plan skill 引用改为 `../plan-workflow/SKILL.md`。
   - `docs/checklist/AGENTS.md` 改为“存在时读取”，不强制每个仓库都有。
3. 更新 CE `skills/plan-workflow/references/CHANGELOG.md`：增加 2.28 条目，说明通用化与 `dsh` 域。
4. 两个 SKILL.md 的 `version`、`updated` 同步递增。
5. 在 CE 根目录运行：

```bash
python skills/plan-workflow/tests/test_validate_plan.py
python skills/plan-workflow/scripts/validate_plan.py --help
```

**你收尾**

1. 审阅 CE skill diff，确认没有把 CE 专属路径写死到全局 skill。
2. 确认 `dsh` 域命名可以接受。
3. 回复：`阶段 4 完成，开始阶段 5`。

### 阶段 5：本机全局 skill 切换

**AI 先行**

1. 备份当前全局 skill（存在才备份）：

```powershell
$skills = Join-Path $HOME '.agents\skills'
Move-Item (Join-Path $skills 'plan-workflow') (Join-Path $skills 'plan-workflow.bak-2026-11-01')
if (Test-Path (Join-Path $skills 'checklist')) { Move-Item (Join-Path $skills 'checklist') (Join-Path $skills 'checklist.bak-2026-11-01') }
```

2. 创建 junction：

```powershell
New-Item -ItemType Junction -Path (Join-Path $skills 'plan-workflow') -Target 'D:\Projects\Context-Engineer\skills\plan-workflow'
New-Item -ItemType Junction -Path (Join-Path $skills 'checklist') -Target 'D:\Projects\Context-Engineer\skills\checklist'
```

3. 验证链接类型与内容：

```powershell
Get-Item (Join-Path $skills 'plan-workflow'),(Join-Path $skills 'checklist') | Format-List FullName,LinkType,Target
Get-Content (Join-Path $skills 'plan-workflow' 'SKILL.md') -TotalCount 12
```

4. 失败回退：junction 创建失败时保留备份，改用 `robocopy` 生成副本；在执行日志记录“生成副本”而非“唯一源 junction”，并说明同步责任。
5. 确认 DSH 重新加载后，`plan-workflow` 为 CE 版本，`checklist` 出现在可用 skill 列表。

**你收尾**

1. 重启 DSH（或触发 skill 重新加载）。
2. 在设置/技能列表确认 `plan-workflow`、`checklist` 均可见。
3. 若仍缓存旧版，记录缓存路径并重启后再验。
4. 回复：`阶段 5 完成，开始阶段 6`。

### 阶段 6：全量验证、提交、推送与开工门槛

**AI 先行**

1. 代码仓验证：

```bash
npm test
npm pack --dry-run
```

2. 检查 pack 清单包含 `docs/pic`，不包含 `doc/pic`。
3. 检查 `docs/` 树、链接、旧路径清零。
4. 代码仓提交：

```bash
git add -A
git commit -m 'docs: migrate to docs layout and unify plan workflow'
git push origin main
```

5. CE 提交：

```bash
git -C D:\Projects\Context-Engineer add skills
git -C D:\Projects\Context-Engineer commit -m 'skills: generalize plan workflow and checklist for docs layout'
git -C D:\Projects\Context-Engineer push origin main
```

**你收尾**

1. 确认两个仓的推送范围与提交信息。
2. 确认公开仓文档暴露范围可接受。
3. 确认具备开工条件后，回复：`阶段 6 完成，允许开工`。

## 四、README / 文档正确性矩阵

| 文件 | 检查点 | 期望 |
|---|---|---|
| `README.md` | 4 张界面图 | 全部 `./docs/pic/*.png`，文件存在 |
| `README.md` | 发版链接 | `./docs/release.md` |
| `README.md` | 安装三种方式 / 开发命令 / 语言切换 | 文案与链接未丢失 |
| `README.en.md` | 4 张界面图 / 发版链接 / 语言切换 | 同中文版，全部 `./docs/...` |
| `AGENTS.md` | 文档位置、Git 表、发布 checklist | 全部 `docs/**`，无 `doc/**`、`plan/**` |
| `package.json` | `files` | 含 `docs/pic`，不含 `doc/pic` |
| `docs/design.md` | plan 链接、文件树 | 指向 `plan/active/dsh/feature_token_dash.md`，树中为 `docs/` |
| `docs/plan/active/dsh/feature_token_dash.md` | checklist 互链 | 指向 `docs/checklist/archived/dsh/...` |
| `docs/checklist/archived/dsh/*.md` | plan 互链 / release 链接 | 指向 `docs/plan/...`、`docs/release.md` |
| `docs/plan/AGENTS.md`、`docs/checklist/AGENTS.md` | 最小入口 | 路径与加载规则正确 |
| 全仓 | 旧路径 | `git grep` 无 `doc/checklist`、`doc/release.md`、`doc/pic`、`plan/active/token-dash` |
| 全仓 | Markdown 链接 | 本地链接 0 缺失 |

## 五、测试 / 走查表

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| 代码仓 `npm test` | ✅ | 37/37 pass |
| Markdown 本地链接 | ✅ | 14 个 md，0 缺失 |
| `npm pack --dry-run` | ✅ | 含 `docs/pic`，22 files |
| 旧路径清零 | ✅ | 仅 `CHANGELOG.md` 历史条目保留旧路径 |
| `docs/` 树 | ✅ | `doc/`、`plan/` 已删除；目标树就位 |
| README 图片 / 链接 | ✅ | 两版 README 均指向 `docs/` |
| 全局 plan skill | ✅ | CE 2.28，含 `dsh` 域；junction 生效 |
| 全局 checklist skill | ✅ | `~/.agents/skills/checklist` 可见；1.3 |
| DSH 重启后加载 | ✅ | skill 目录已出现 `plan-workflow` 与 `checklist` |
| 代码仓 git 状态 | ✅ | `3dc715b`，已推送 `origin/main` |
| CE git 状态 | ✅ | `d13530f`，已推送 `origin/main` |

## 六、移交 / 遗留

| 编号 | 内容 | 原因 / 去向 |
|---|---|---|
| M01 | junction 是本机配置 | 其它机器需重复阶段 5，或用同步脚本 |
| M02 | CE 私有仓路径依赖 | `D:\Projects\Context-Engineer` 移动后需重建 junction |
| M03 | DSH skill 缓存 | 切换后必须重启/重新加载；旧内容残留时查缓存 |
| M04 | `docs/plan/AGENTS.md`、`docs/checklist/AGENTS.md` | 只做最小入口，不复制 CE 全文；后续按需补 |
| M05 | 公开仓文档暴露 | 迁移后 `docs/` 会进入公开仓；敏感内容需先审 |

## 七、施工提醒

1. **不要对 `doc/` 做整目录改名**：`docs/checklist/active/dsh/` 已存在，必须把 `doc/` 内容并入 `docs/`。
2. 全部移动用 `git mv`，保留历史；不要用复制 + 删除。
3. 改全局 skill 前必须先备份；junction 建好后只改 CE 源，不改全局目录。
4. 两个仓分别提交、分别推送；推送前给用户看范围。
5. CE 里 dsh 文档已经删除，不要重新加回。
6. plan 文件保持“待归档”状态；本次迁移不改业务结论。
7. 如果 junction 不可用，不要手工维护两份 skill；改用生成副本并记录同步责任。
8. 阶段 3 是只读 Gate；Gate 失败不得进入阶段 4。

## 八、开工门槛

全部满足才允许开始业务开发：

1. 阶段 0-6 全部 ✅。
2. README / README.en / AGENTS / package / docs 链接与图片全部通过阶段 3 Gate。
3. `npm test`、Markdown 链接、`npm pack --dry-run` 全部通过。
4. CE skill 通用化完成，`plan-workflow` 与 `checklist` 全局 junction 加载正确。
5. 代码仓与 CE 均已提交、推送，工作区干净。
6. 用户明确回复：`允许开工`。

## 九、plan 回写候选

1. 回写 `AGENTS.md`：文档位置、规划目录、Git 管理边界。
2. 回写 CE `references/CHANGELOG.md`：skill 通用化与 `dsh` 域。
3. 回写本 checklist：阶段状态、测试结果、最终提交号。
4. 如迁移改变 plan 存放位置，在 `feature_token_dash.md` 头部补一行“文档位置”说明。
5. 如 junction 有机器差异，在 `AGENTS.md` 补“本机全局 skill 安装方式”。

## 十、执行日志 + 踩坑

- 2026-11-01：创建 checklist，仅规划；未移动现有文档、未修改 CE skill、未切换全局 skill。
- 2026-11-01：迭代 v2——确认文件名后缀规则、增加 README Gate、增加开工门槛；仍未执行迁移。
- 2026-11-01：阶段 1-5 执行完成——`doc/` + 根 `plan/` 并入 `docs/`；AGENTS/README/package/design/plan/checklist 引用更新；README Gate 通过；CE `plan-workflow` 2.28、`checklist` 1.3 通用化；全局 junction 生效（skill 目录已出现 `checklist`）。
- 2026-11-01：验证——`npm test` 37/37；Markdown 本地链接 0 缺失；`npm pack --dry-run` 含 `docs/pic`；CE validator 16 tests OK（1 skipped）。
- 2026-11-01：本 checklist 归档至 `docs/checklist/archived/dsh/`。
- 2026-11-01：代码仓提交 `3dc715b`、CE 提交 `d13530f`，均已推送 `origin/main`。
- 2026-11-01：迁移关闭；业务开发未自动开始，等待具体任务/用户指定。
- 2026-11-02：后续 skill 归属调整另开 checklist：`docs/checklist/active/dsh/skill-ownership-adjust-build-checklist.md`；本文件不重开。
- 踩坑 0：无阻断；junction 创建一次成功。
