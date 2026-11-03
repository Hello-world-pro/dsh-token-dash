# 系统全局 skill 归属调整施工 checklist

> 依据：2026-11-02 决策——`doc-polish` 注册系统全局；`module-documentation-skill` / `ui-documentation-skill` 转 Jvedio 项目 skill<br>
> 状态：已完成并归档（2026-11-02；doc-polish 全局注册、Jvedio 两 skill 迁移、plan-workflow 旧源移除）<br>
> 工程根：`dsh-token-dash`；提交：Jvedio `4812ce3e`、CE `e26a432`、dsh-token-dash `421feac`

## 决策

| # | 定案 |
|---|---|
| Q1 | `doc-polish`：CE `skills/doc-polish` 通用化后 junction 到 `~/.agents/skills/doc-polish` |
| Q2/Q3 | `module-documentation-skill`、`ui-documentation-skill` 从系统全局移到 `Jvedio/.agents/skills/` |
| Q4 | 同时从 `Jvedio/skills-global/` 移除两个 skill，防 `sync-skills.ps1` 装回全局 |
| Q5 | `plan-workflow` 冲突采用方案 A：移除 `Jvedio/skills-global/plan-workflow`，由 CE 提供 |
| Q6 | Jvedio 内用 `git mv`；系统全局副本验证后删除 |
| Q7 | Jvedio / CE / dsh-token-dash 分别提交，推送前用户确认 |
| Q8 | 先改文档，后动 skill；checklist 获用户校验后开工 |

## 从哪到哪

| 对象 | 迁移 |
|---|---|
| `doc-polish` | CE 源保留 → junction 到 `~/.agents/skills/doc-polish` |
| `module-documentation-skill` | `Jvedio/skills-global` → `.agents/skills`（git mv）；系统全局副本最后删 |
| `ui-documentation-skill` | `Jvedio/skills-global` → `.agents/skills`（git mv）；系统全局副本最后删 |
| `plan-workflow` | `Jvedio/skills-global` 彻底移除，避免覆盖 CE junction |

## 阶段

| 阶段 | 状态 |
|---|---|
| 0 契约与基线（路径、哈希、规则） | ✅ |
| 1 `doc-polish` 通用化（去 CE、代码根、升 0.4） | ✅ |
| 2 `doc-polish` 全局 junction | ✅ |
| 3 Jvedio 两 skill `git mv` | ✅ |
| 4 清理系统全局副本 | ✅ |
| 5 处理 `plan-workflow` 冲突（方案 A） | ✅ |
| 6 验证、提交、推送 | ✅ |

## 验证

| 用例 | 结果 | 证据 |
|---|---|---|
| `doc-polish` junction | ✅ | `LinkType=Junction`，Target 指向 CE |
| `doc-polish` 内容 | ✅ | 0.4，无 `location: Context-Engineer` |
| Jvedio 项目 skill | ✅ | `.agents/skills` 下两目录完整 |
| `skills-global` 清理 | ✅ | 两 skill 与 `plan-workflow` 已移除 |
| 系统全局清理 | ✅ | `~/.agents/skills` 无两个 Jvedio skill |
| `plan-workflow` 未被覆盖 | ✅ | 仍为 CE junction 2.28 |
| 同步状态 | ✅ | `sync-skills.ps1 -Action Status` 7 项 OK |
| 提交 | ✅ | Jvedio `4812ce3e`（master）、CE `e26a432`、dsh `421feac` |

## 风险 / 遗留

| 编号 | 内容 | 处理 |
|---|---|---|
| R01 | Jvedio 旧 `plan-workflow` 会覆盖 CE junction | 已按方案 A 移除；否则禁止 `-Action Install` |
| R02 | 系统副本与 Jvedio 源重复 | 先 `git mv` 项目副本，再删系统副本 |
| R03 | `doc-polish` 仍有 CE 专用规则 | 通用化后再注册 |
| R04 | DSH skill 缓存 | junction 后重启/重载再验证 |

## 回写

三仓提交与验证已归档；旧全局备份 `plan-workflow.bak-2026-11-01` 已删除，系统全局只保留 CE 的 `plan-workflow` junction。

