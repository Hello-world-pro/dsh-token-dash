# 收录到 DSH 插件市场（awesome-dsh-plugin）操作指引

本目录准备好了可以直接提交的收录文件。**前置条件：GitHub 仓库创建满 1 天**（CI 会校验仓库年龄；本仓库 2026-11-01 首次推送，11-02 起可提交）。

## 前置检查

- [x] `package.json` 声明 `dsh.bundle.patch` + 根目录 `cordis.patch.yml` —— 已有
- [x] manifest：`spartawhy117__dsh-token-dash.yml`（category: usage，双语描述）
- [ ] 仓库创建满 1 天 —— 提 PR 前确认

## 提交流程

1. 确认前置检查完成。

2. Fork [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 并 clone。

3. 把本目录的 `spartawhy117__dsh-token-dash.yml` 复制到 fork 的 `data/plugins/`（文件名保持不变）。

4. 在 fork 根目录重新生成 README（**不要手改 README**）：

   ```bash
   node scripts/generate-readme.mjs
   ```

5. 提交 `data/plugins/spartawhy117__dsh-token-dash.yml` 与重新生成的 `README.md`、`README.zh.md`，推送。

6. 打开 Pull Request（base 为 awesome-dsh-plugin 的 main）。

## PR 标题

```
Add spartawhy117/dsh-token-dash
```

## 收录后

- 合并后 `awesome-dsh-plugin.com/plugins.json` 更新，dshmarket 自动收录（通常一天内）——dsh-cockpit 等插件管理器的市场可见本插件
- 回到本仓库：README 顶部加徽章 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`（参考 dsh-token-usage-lao）

## 说明

- 收录由 CI + 维护者人工评审：CI 校验 manifest / 仓库年龄 / 格式 / README 可重新生成，维护者核对描述与代码是否相符
- 描述需要修改时只改 yml 后重新生成 README 再提交，不要手改 README
