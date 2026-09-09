# 旧版 `guide.appData` 迁移操作说明

状态：TASK-006 已完成本地版本（导出、dry-run、事务导入）。

## 1. 从旧版后台导出

打开旧版后台，进入右上角账户菜单，点击“导出迁移数据”。浏览器会下载
`guide-app-data-YYYY-MM-DD.json`。导出文件可能包含旧版 MCP 认证字段，必须按密
钥文件处理，不要提交到 Git 或上传到聊天工具。

## 2. 先上传新版地图

旧版 `guide.appData` 只保存地图名称和文件名，没有 PCD、PNG 与配准元数据。先在新版
Console 上传完整地图三件套，再用旧地图 ID 绑定新版地图 ID：

```powershell
pnpm --filter @guide/api migration:legacy -- `
  --file .\guide-app-data-2026-09-09.json `
  --dry-run `
  --map wangfujing-station-hall=<新版地图 ID>
```

可以重复传入多个 `--map <旧地图 ID>=<新版地图 ID>`。dry-run 报告只输出数量、路径和错误
代码，不回显认证密钥。

## 3. 检查报告后导入

确认报告中的 `ready` 为 `true` 后，再执行：

```powershell
pnpm --filter @guide/api migration:legacy -- `
  --file .\guide-app-data-2026-09-09.json `
  --apply `
  --map wangfujing-station-hall=<新版地图 ID>
```

导入在单个 Prisma transaction 中完成。任意记录冲突、引用缺失或无法表达的数据都会使
整个事务回滚，不会留下半套人设或任务。导入的任务统一为 `DRAFT`，需要在新版 Console
检查后再发布；历史 Agent 下载状态不会导入。

## 4. 当前明确拒绝的情况

- 旧地图没有对应的新版完整地图绑定。
- MCP 插件包含 bearer、API key 或 basic 的明文认证值；加密 Provider 接入后再扩展。
- 路径不连续、点位坐标无效、动作缺少必填字段或引用了不存在的插件/人设。
- 导入 ID 与当前用户已有记录冲突。

MCP 外部协议、云端技能和真实身份仍按迁移计划等待 sandbox 材料，不在本工具中伪造成功。
