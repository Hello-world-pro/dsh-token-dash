# Checklist 目录规则

- 本仓 checklist 统一在 `docs/checklist/`；单项目仓，`active/` 使用单层（不再建 `active/dsh/`），与 `docs/plan/AGENTS.md` 口径一致。
- `archived/` 同为单层，不建项目域子目录（`archived/dsh/` 已撤除，历史文档上移一层）；归档时同名移入即可，不改名。
- 施工稿命名遵循 `<topic>-<阶段>-checklist.md`；操作前加载全局 `checklist` skill。
- 第三方参考项目**不写进 checklist**：现状描述放 `docs/reference/<repo>.md`（不带 `-checklist` 后缀），只写「定位 / 规模 / 现状 / 特点 / 已知取舍」，不写我方改造结论。
- 参考类清单按层拆两份，**只定能力与形态，不写实现步骤**：
  - `ui-reference-checklist.md`：UI 参考，按 UI 设计文档体例写 P1 / P2 / P3 的结构、规格、状态与草图；施工步骤在 §8，方案批准后才填。
  - `backend-capability-checklist.md`：后端能力，含输出契约、错误语义、缓存与安全边界。
- 参考类清单**不构成施工授权**；实施步骤、验收项、测试用例一律写 `docs/plan/active/feature_*.md`，按 plan-workflow 批准后执行。
- 回写 plan 时走 `docs/plan/`，并先加载全局 `plan-workflow` skill。
- 当前参考清单（均待评审）：
  - `docs/checklist/active/ui-reference-checklist.md`
  - `docs/checklist/active/backend-capability-checklist.md`
- 参考档案命名 `docs/reference/<owner>-<repo>.md`，与 `docs/reference/images/<owner>-<repo>--<名称>.png` 同规则：
  - `docs/reference/invisiblesirius-dsh-quota-dashboard.md`（`InvisibleSirius/dsh-quota-dashboard`）
  - `docs/reference/shy3130-dsh-quota.md`（`shy3130/dsh-quota`）
  - `docs/reference/2026heshao-dsh-armory.md`（`2026heshao/dsh-armory`，全局面板 / 整页机制）
- 最近归档施工稿：`docs/checklist/archived/provider-boundary-build-checklist.md`。
- 上一份归档施工稿：`docs/checklist/archived/skill-ownership-adjust-build-checklist.md`。
