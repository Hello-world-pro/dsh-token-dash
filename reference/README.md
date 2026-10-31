# 第三方参考

仅用于本地研究 provider / 用量 / 计价实现，不参与构建，不提交源码。

| 目录 | 仓库 | 重点 |
|---|---|---|
| `third-party/dsh-spend` | `nonewind/dsh-spend` | `lib/knowledge.js`：provider / model 知识库与别名 |
| `third-party/dsh-stats-panel` | `zhang-jiazhi/dsh-stats-panel` | `src/index.ts`：从 settings / profile patch 扫描 providers |
| `third-party/dsh-ui-usage-billing` | `kenz1117/dsh-ui-usage-billing` | `src/aggregate.ts`：`message.source` 归属；`src/client/pricing.ts`：多供应商目录 |
| `third-party/dsh-cost-dashboard` | `mike-lee0120/dsh-cost-dashboard` | 费用看板与多模型价格表 |
| `third-party/dsh-token-usage-lao` | `LaoYueHanNi/dsh-token-usage` | `src/provider-label.ts`：provider 展示名与 route key 分离；`src/pricing.ts`：云价格表 + 历史价 |
| `third-party/dsh-token-usage-leeman` | `LeemanCheung/dsh-token-usage` | 持久化用量记录与 provider 归属 |
| `third-party/dsh-cockpit` | `Lxiayu/DshCockpit` | `src/cost.js` / `src/token-stats.js`：成本与用量看板 |

源码目录已加入 `.gitignore`，需要重新拉取时：

```powershell
git clone --depth 1 <repo> reference/third-party/<name>
```
