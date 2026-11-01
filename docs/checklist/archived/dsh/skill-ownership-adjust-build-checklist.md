# 系统全局 skill 归属调整施工 checklist

> 依据：2026-11-02 决策——`doc-polish` 注册到系统全局；`module-documentation-skill`、`ui-documentation-skill` 从系统全局移出，改为 Jvedio 项目 skill。<br>
> 命名：遵循 CE checklist skill 的 `<topic>-<阶段>-checklist.md`；本文件为 `skill-ownership-adjust-build-checklist.md`。<br>
> 生命周期：**已归档**（原 active → `docs/checklist/archived/dsh/`）<br>
> 当前状态：**已完成并归档**（2026-11-02；doc-polish 已全局注册，Jvedio 两个 skill 已转项目 skill，plan-workflow 旧源已移除）<br>
> 工程根：`dsh-token-dash`（本 checklist 所在仓）；目标 skill 仓：`D:\Projects\Jvedio`、`D:\Projects\Context-Engineer`<br>
> 本文件位置：`docs/checklist/archived/dsh/skill-ownership-adjust-build-checklist.md`<br>

## 〇、决策记录

| # | 问题 | 定案 |
|---|---|---|
| Q1 | `doc-polish` | 以 CE `skills/doc-polish` 为源，通用化后 junction 到系统全局 `~/.agents/skills/doc-polish` |
| Q2 | `module-documentation-skill` | 从系统全局移出，落到 Jvedio 项目 skill `D:\Projects\Jvedio\.agents\skills\module-documentation-skill` |
| Q3 | `ui-documentation-skill` | 从系统全局移出，落到 Jvedio 项目 skill `D:\Projects\Jvedio\.agents\skills\ui-documentation-skill` |
| Q4 | Jvedio 全局源 | 同时从 `D:\Projects\Jvedio\skills-global\` 移除两个 skill，避免 `sync-skills.ps1` 再次安装回系统全局 |
| Q5 | `plan-workflow` 冲突 | **方案 A**：移除 `D:\Projects\Jvedio\skills-global\plan-workflow`；Jvedio 不再提供 plan-workflow，由 CE 提供 |
| Q6 | 历史保留 | Jvedio 内移动用 `git mv`；系统全局副本是未跟踪副本，验证后删除 |
| Q7 | 提交边界 | Jvedio、CE、dsh-token-dash 分别提交；推送前由用户确认 |
| Q8 | 开工条件 | 本 checklist 获用户校验通过；先改文档，后动 skill |

## 一、从哪到哪

| 对象 | 当前位置 | 目标位置 | 方式 | 备注 |
|---|---|---|---|---|
| `doc-polish` | `D:\Projects\Context-Engineer\skills\doc-polish` | `C:\Users\SpartaWHY117\.agents\skills\doc-polish` | Junction | CE 源保留；先通用化，再建 junction |
| `module-documentation-skill` | `C:\Users\SpartaWHY117\.agents\skills\module-documentation-skill` | `D:\Projects\Jvedio\.agents\skills\module-documentation-skill` | 删除系统副本 | 与 Jvedio `skills-global` 源字节一致；Jvedio 项目副本就位后再删 |
| `module-documentation-skill` | `D:\Projects\Jvedio\skills-global\module-documentation-skill` | `D:\Projects\Jvedio\.agents\skills\module-documentation-skill` | `git mv` | 保留 Jvedio 历史；源目录移除 |
| `ui-documentation-skill` | `C:\Users\SpartaWHY117\.agents\skills\ui-documentation-skill` | `D:\Projects\Jvedio\.agents\skills\ui-documentation-skill` | 删除系统副本 | 与 Jvedio `skills-global` 源字节一致；Jvedio 项目副本就位后再删 |
| `ui-documentation-skill` | `D:\Projects\Jvedio\skills-global\ui-documentation-skill` | `D:\Projects\Jvedio\.agents\skills\ui-documentation-skill` | `git mv` | 保留 Jvedio 历史；源目录移除 |
| `plan-workflow`（冲突项） | `D:\Projects\Jvedio\skills-global\plan-workflow` | 彻底移除 | `git rm -r` | 旧简化版；移除后 Jvedio 不再同步 plan-workflow，CE junction 不会被覆盖 |

> 说明：系统全局的 `module-documentation-skill`、`ui-documentation-skill` 与 Jvedio `skills-global` 下的副本已核对为同一内容。移动以 Jvedio `git mv` 为主，系统全局副本最后删除，避免中间态丢文件。

## 二、阶段总览

| 阶段 | 一句话 | 状态 |
|---|---|---|
| 0 契约与基线 | 确认路径、哈希、Jvedio 项目 skill 规则 | ✅ |
| 1 `doc-polish` 通用化 | 去 CE 限定、改代码根规则、升版本 | ✅ |
| 2 `doc-polish` 全局注册 | junction 到 `~/.agents/skills/doc-polish` | ✅ |
| 3 Jvedio 项目 skill 迁移 | `git mv` 两个 skill 到 `.agents/skills` | ✅ |
| 4 清理系统全局副本 | 删除 `~/.agents/skills` 下两个旧副本 | ✅ |
| 5 处理 `plan-workflow` 冲突 | 防止 Jvedio 同步覆盖 CE junction | ✅ |
| 6 验证与提交 | 目录、哈希、同步脚本、skill 加载、提交推送 | ✅ |

## 三、阶段详情

### 阶段 0：契约与基线

**AI 先行**

1. 确认 Jvedio 项目 skill 位置为 `D:\Projects\Jvedio\.agents\skills\`；全局源为 `D:\Projects\Jvedio\skills-global\`。
2. 记录两个 skill 在系统全局与 Jvedio `skills-global` 的哈希，确认字节一致。
3. 记录当前系统全局 `plan-workflow` 是 CE junction，不能被 Jvedio 同步覆盖。
4. 确认 Jvedio `.agents/skills` 与 `skills-global` 均为 Git 跟踪目录。
5. 建议在 Jvedio 建分支 `skill/ownership-adjust`，在 dsh-token-dash 建分支 `docs/skill-ownership-adjust`。

**你收尾**

1. 确认 Jvedio 项目 skill 只放 `.agents/skills`，不再复制到用户层。
2. 确认 `plan-workflow` 冲突的处理方案（见阶段 5）。
3. 回复：`阶段 0 确认，开始阶段 1`。

### 阶段 1：`doc-polish` 通用化

**AI 先行**

1. 编辑 CE `skills/doc-polish/SKILL.md`：
   - 去掉 `location: Context-Engineer`。
   - description 改为“当前 workspace 的文档表达优化”。
   - 代码根规则从 S1Game / BunnySeek 专用改为“当前 workspace 的 AGENTS / workspace 配置”；没有配置时停止询问。
   - `ueTools/uemcp` 改为“当前 workspace 存在时使用”，不作为通用硬依赖。
   - `version` 升到 `0.4`，`updated` 改为 `2026-11-02`。
2. 更新 CE `skills/doc-polish/SKILL.md` 的变更记录。
3. 更新 CE `skills/AGENTS.md`：
   - 删除或弱化“`location: Context-Engineer` 固定值”；
   - 说明 skill 可通过 junction 注册到系统全局。
4. 不修改 `references/` 的规则内容；只检查路径和 CE 专属引用。
5. 运行 Markdown/引用检查，确认 `doc-polish` 内无硬编码 CE 绝对路径。

**你收尾**

1. 审阅 `doc-polish` 的通用化 diff。
2. 回复：`阶段 1 完成，开始阶段 2`。

### 阶段 2：`doc-polish` 全局注册

**AI 先行**

1. 确认系统全局没有旧 `doc-polish`；如有，先备份。
2. 创建 junction：

```powershell
New-Item -ItemType Junction -Path (Join-Path $HOME '.agents\skills\doc-polish') -Target 'D:\Projects\Context-Engineer\skills\doc-polish'
```

3. 验证 `Get-Item` 的 `LinkType=Junction`、`Target` 指向 CE。
4. 读取 `~/.agents/skills/doc-polish/SKILL.md`，确认是 0.4 通用化版本。

**你收尾**

1. 重启 DSH 或触发 skill 重载。
2. 确认 `doc-polish` 出现在可用 skill 列表。
3. 回复：`阶段 2 完成，开始阶段 3`。

### 阶段 3：Jvedio 项目 skill 迁移

**AI 先行**

1. 在 Jvedio 用 `git mv` 迁移：

```powershell
git -C D:\Projects\Jvedio mv skills-global/module-documentation-skill .agents/skills/module-documentation-skill
git -C D:\Projects\Jvedio mv skills-global/ui-documentation-skill .agents/skills/ui-documentation-skill
```

2. 确认 `.agents/skills/module-documentation-skill/SKILL.md`、`agents/openai.yaml` 存在。
3. 确认 `.agents/skills/ui-documentation-skill/SKILL.md`、`evals/evals.json` 存在。
4. 更新 Jvedio `skills/README.md`：说明这两个 skill 已归项目 skill，不再由 `skills-global` 同步。
5. 不改两个 skill 的 `name`；目录名必须与 `name` 一致。

**你收尾**

1. 抽查 Jvedio `.agents/skills` 两个目录内容完整。
2. 确认 `skills-global` 下旧目录已移除。
3. 回复：`阶段 3 完成，开始阶段 4`。

### 阶段 4：清理系统全局副本

**AI 先行**

1. 再次比对 Jvedio 项目副本与系统全局副本的哈希；确认项目副本完整。
2. 删除系统全局副本：

```powershell
Remove-Item (Join-Path $HOME '.agents\skills\module-documentation-skill') -Recurse -Force
Remove-Item (Join-Path $HOME '.agents\skills\ui-documentation-skill') -Recurse -Force
```

3. 确认 `~/.agents/skills` 下只剩 `plan-workflow`、`checklist`、`doc-polish` 及其它非本次 skill。
4. 不删除 Jvedio 项目副本；不删除 CE 的 `doc-polish` 源。

**你收尾**

1. 确认系统全局不再出现两个 Jvedio skill。
2. 回复：`阶段 4 完成，开始阶段 5`。

### 阶段 5：处理 `plan-workflow` 冲突

> 这是本轮的关键风险：Jvedio `skills-global/plan-workflow` 是旧简化版，`sync-skills.ps1 -Action Install` 会用旧版覆盖 `~/.agents/skills/plan-workflow` 的 CE junction。

**AI 先行**

1. 检查 Jvedio `skills-global/plan-workflow/SKILL.md`，确认它是旧简化版，不是 CE 2.28 通用版。
2. 执行方案 A：`git -C D:\Projects\Jvedio rm -r skills-global/plan-workflow`。
3. 更新 Jvedio `skills/README.md`：注明 `plan-workflow` 由 Context-Engineer 提供，Jvedio 不再维护全局副本。
4. 不修改 `sync-skills.ps1`；源目录中不再有 `plan-workflow`，脚本自然不会同步它。
5. 验证 `Get-ChildItem D:\Projects\Jvedio\skills-global` 不含 `plan-workflow`，并确认 `~/.agents/skills/plan-workflow` 仍是 CE junction。

**你收尾**

1. 选择 A 或 B；或明确“暂不处理，禁止 Install”。
2. 回复：`阶段 5 完成，开始阶段 6`。

### 阶段 6：验证与提交

**AI 先行**

1. 验证 `doc-polish` junction、Jvedio 项目 skill、系统全局清理。
2. 运行 Jvedio 同步脚本：

```powershell
pwsh D:\Projects\Jvedio\scripts\sync-skills.ps1 -Action Status
```

3. 运行 `pwsh D:\Projects\Jvedio\scripts\sync-skills.ps1 -Action Status`，确认剩余全局 skill 一致；不运行 `-Action Install`，避免无谓覆盖其它全局 skill。
4. 再次确认 `~/.agents/skills/plan-workflow` 仍为 Junction，Target 指向 CE。
5. 检查 Jvedio `git status`，确认 `git mv` 为 rename。
6. 提交 Jvedio 项目 skill 迁移与 `plan-workflow` 移除；提交 CE `doc-polish` 通用化；提交 dsh-token-dash checklist。
7. 分别推送三个仓；推送前由用户确认。

**你收尾**

1. 确认三个仓的提交范围与推送目标。
2. 确认 `sync-skills.ps1 -Action Status` 通过。
3. 回复：`阶段 6 完成，skill 归属调整关闭`。

## 四、验证 / 走查表

| 用例 | 结果 | 一句话证据 |
|---|---|---|
| `doc-polish` junction | ✅ | `LinkType=Junction`，Target 指向 CE |
| `doc-polish` 内容 | ✅ | 0.4，无 `location: Context-Engineer` |
| Jvedio 项目 skill | ✅ | `.agents/skills` 下两个目录完整 |
| Jvedio `skills-global` | ✅ | 两个旧目录与 `plan-workflow` 已移除 |
| 系统全局清理 | ✅ | `~/.agents/skills` 下无两个 Jvedio skill |
| `plan-workflow` 未被覆盖 | ✅ | 仍为 CE junction，2.28 |
| Jvedio 同步状态 | ✅ | `sync-skills.ps1 -Action Status` 7 项 OK |
| Jvedio git 状态 | ✅ | `4812ce3e`，已推送 `origin/master` |
| CE git 状态 | ✅ | `e26a432`，已推送 `origin/main` |
| dsh-token-dash git 状态 | ✅ | `421feac`，已推送 `origin/main` |

## 五、风险 / 遗留

| 编号 | 内容 | 处理 |
|---|---|---|
| R01 | Jvedio `skills-global/plan-workflow` 会覆盖 CE junction | 阶段 5 必须处理；否则禁止 `-Action Install` |
| R02 | 系统全局副本与 Jvedio 源副本重复 | 先 `git mv` 项目副本，再删系统副本，避免中间态丢文件 |
| R03 | `doc-polish` 仍有 CE 专用规则 | 阶段 1 通用化后再注册 |
| R04 | DSH skill 缓存 | junction 后重启/重载再验证 |
| R05 | Jvedio `.agents/skills` 是否被 git 跟踪 | 已确认跟踪；提交时检查 rename |

## 六、开工门槛

1. 用户校验本 checklist 的“从哪到哪”表。✅
2. 阶段 5 的 `plan-workflow` 冲突方案已确认（方案 A）。✅
3. 用户明确回复：`允许执行 skill 归属调整`。✅

## 七、执行日志 + 踩坑

- 2026-11-02：创建本 checklist，仅规划；未移动 skill、未改系统全局目录、未改 Jvedio。
- 2026-11-02：用户确认方案 A，开始施工。
- 2026-11-02：`doc-polish` 通用化至 0.4，去掉 location，代码根改为当前 workspace；junction 到 `~/.agents/skills/doc-polish`，skill 目录已出现 `doc-polish`。
- 2026-11-02：Jvedio 两个 skill 从 `skills-global` `git mv` 到 `.agents/skills`；系统全局副本删除；Jvedio `skills-global/plan-workflow` 按方案 A 移除。
- 2026-11-02：Jvedio `sync-skills.ps1 -Action Status` 通过（7 项 OK）；`~/.agents/skills/plan-workflow` 仍为 CE junction。
- 2026-11-02：Jvedio 提交 `4812ce3e`（origin/master）；CE 提交 `e26a432`（origin/main）。
- 2026-11-02：本 checklist 归档；dsh-token-dash 提交 `421feac`，已推送 `origin/main`。
- 2026-11-02：删除旧全局备份 `~/.agents/skills/plan-workflow.bak-2026-11-01`；系统全局只保留 CE 的 `plan-workflow` junction。
- 踩坑 0：无阻断；系统全局副本与 Jvedio 源副本哈希一致后删除。
