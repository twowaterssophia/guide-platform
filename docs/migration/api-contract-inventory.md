# API 与共享契约清单

状态：完成（阶段 0.5）

本文区分已实现接口与后续提案。提案是阶段 1 至 5 的实现合同，不代表接口已经可用。

## 当前已实现 API

API 前缀为 `/api/v1`，由 NestJS/Fastify 在 `127.0.0.1:3000` 提供。

| 方法 | 路径 | 实现状态 | 响应契约 | 说明 |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | 已实现 | `healthResponseSchema` | 返回服务状态和 ISO 时间。 |
| `GET` | `/runtime` | 已实现 | `runtimeInfoSchema` | 返回 identity/skill provider 的 `demo`、`sandbox` 或 `production` 模式。 |
| `GET` | `/tour-tasks` | 已实现 | `tourTaskListSchema` | 使用固定 demo 用户返回按创建时间倒序的任务摘要。 |

Swagger 文档在 API 启动后位于 `/api-docs`。目前 API 没有全局异常转换器，
`apiErrorSchema` 是目标规范而非所有错误的现状保证。

## 共同约定

以下约定应在第一批写接口前落实到 `packages/contracts` 和 API：

| 主题 | 目标约定 |
| --- | --- |
| 身份 | demo 模式从 server-side demo identity 解析；sandbox/production 从身份 Provider 解析，客户端不传任意 owner ID。 |
| 时间 | 统一使用 ISO 8601 UTC 字符串。 |
| ID | API 将 ID 视为不透明字符串；客户端不得假设 cuid 格式。 |
| 错误 | 统一 `{ code, message, requestId? }`，对应 `apiErrorSchema`；认证、校验、冲突、找不到和外部 Provider 错误需有稳定 code。 |
| 分页 | 新列表接口默认 cursor 分页，返回 `{ items, nextCursor? }`；当前任务列表可在兼容窗口内保留数组响应。 |
| 并发 | 任务和可编辑资源更新需要 `expectedVersion` 或 `If-Match`；冲突返回 `409 VERSION_CONFLICT`。 |
| 删除 | 返回 `204`；被引用资源返回 `409 RESOURCE_IN_USE`，而非级联删除。 |
| 文件 | 上传使用 `multipart/form-data`；下载通过短时签名 URL 或 API 流，不暴露存储凭据。 |
| 密钥 | 插件认证字段只接受写入请求，不在读取响应中返回。 |

## 共享契约演进

| 契约区域 | 当前状态 | 下一步 |
| --- | --- | --- |
| Provider、health、runtime | 已定义 | 保持兼容。 |
| Task summary | 已定义 | 增加详情、写入 payload、版本冲突和发布状态。 |
| Skill summary | 已定义但无 API 使用 | 作为技能目录 API 的列表项。 |
| API error | 已定义但未全局应用 | API 增加异常过滤器后强制使用。 |
| Map、Persona、Plugin、Agent | 未定义 | 每个业务 API 前补 Zod schema、输入/输出类型和 fixture。 |

## 提议接口

### Maps

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/maps` | `cursor?`、`limit?` | `MapListPage` | 仅返回当前用户资产。 |
| `POST` | `/maps` | multipart：`name`、`file` | `MapAssetDetail` | 校验文件类型、大小和名称；服务端写存储。 |
| `GET` | `/maps/:mapId` | 无 | `MapAssetDetail` | 返回元数据、预览/下载引用和任务引用数。 |
| `PATCH` | `/maps/:mapId` | `name`、`expectedVersion?` | `MapAssetDetail` | 仅编辑元数据。 |
| `DELETE` | `/maps/:mapId` | 无 | `204` | 有任务引用时返回 `409 RESOURCE_IN_USE`。 |

### Personas

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/personas` | `cursor?`、`limit?` | `PersonaListPage` | 系统默认人设和当前用户人设可见。 |
| `POST` | `/personas` | `PersonaWriteInput` | `PersonaDetail` | 校验音色、插件、技能引用和自定义技能字段。 |
| `GET` | `/personas/:personaId` | 无 | `PersonaDetail` | 返回绑定的插件和技能元数据，不返回插件密钥。 |
| `PATCH` | `/personas/:personaId` | `PersonaWriteInput` + 版本 | `PersonaDetail` | 系统默认人设的可编辑范围要单独定义。 |
| `DELETE` | `/personas/:personaId` | 无 | `204` | 拒绝删除系统默认人设；其他被任务引用时按已确认的回退规则处理。 |

### MCP 插件和技能

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/mcp-plugins` | `cursor?`、`limit?` | `McpPluginListPage` | 响应不包含认证配置。 |
| `POST` | `/mcp-plugins` | `McpPluginWriteInput` | `McpPluginDetail` | 服务端加密认证配置，校验 headers JSON。 |
| `GET` | `/mcp-plugins/:pluginId` | 无 | `McpPluginDetail` | 返回工具列表及刷新时间。 |
| `PATCH` | `/mcp-plugins/:pluginId` | `McpPluginWriteInput` + 版本 | `McpPluginDetail` | 认证字段省略表示保留，显式清空才删除。 |
| `DELETE` | `/mcp-plugins/:pluginId` | 无 | `204` | 先解除 PersonaPlugin 或返回受影响人设信息。 |
| `POST` | `/mcp-plugins/:pluginId/refresh-tools` | 无 | `McpPluginDetail` | 调用 Provider；失败保留旧工具并返回外部错误。 |
| `GET` | `/skills` | `source?`、`compatible?`、分页 | `SkillListPage` | 由 demo/sandbox/production catalog Provider 提供。 |
| `GET` | `/skills/:skillId` | 无 | `SkillDetail` | 返回当前身份可见的技能详情。 |

### Tour tasks

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/tour-tasks` | 兼容现有；后续支持分页 | `TourTaskListPage` | 当前摘要接口保持可用。 |
| `POST` | `/tour-tasks` | `TourTaskWriteInput` | `TourTaskDetail` | 创建 `DRAFT`，原子写入点位、路径和动作。 |
| `GET` | `/tour-tasks/:taskId` | 无 | `TourTaskDetail` | 包含地图、人设、点位、路径、动作和版本。 |
| `PATCH` | `/tour-tasks/:taskId` | `TourTaskWriteInput` + 版本 | `TourTaskDetail` | 事务替换或差量更新编排；校验引用完整性。 |
| `DELETE` | `/tour-tasks/:taskId` | 无 | `204` | 清理任务下属点位、路径、动作和下载记录。 |
| `POST` | `/tour-tasks/:taskId/publish` | `expectedVersion` | `TourTaskDetail` | 仅完整编排可发布；递增版本。 |
| `POST` | `/tour-tasks/:taskId/archive` | `expectedVersion` | `TourTaskDetail` | 已下载任务的 Agent 可继续执行已下载版本。 |

`TourTaskWriteInput` 必须表达 `name`、`mapId`、可选 `personaId`、有序点位、连续路径和
有序动作。实现前需先解决交互动作 `prompt` 的持久化模型。

### Agent sync

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/agent/tour-tasks` | `deviceId` | `AgentTaskList` | 仅返回已发布且设备有权限下载的任务；含版本和本地同步状态。 |
| `GET` | `/agent/tour-tasks/:taskId/package` | `deviceId` | `TaskPackage` 或短时 URL | 任务包包含版本、地图、动作、人设和依赖技能清单。 |
| `POST` | `/agent/tour-tasks/:taskId/downloads` | `deviceId`、`downloadedVersion` | `AgentDownloadDetail` | 创建或更新 `AgentDownload`。 |
| `DELETE` | `/agent/tour-tasks/:taskId/downloads/:deviceId` | 无 | `204` | 删除设备本地下载记录。 |
| `POST` | `/agent/tour-tasks/:taskId/executions` | `deviceId`、任务版本 | `ExecutionState` | 阶段 5 后实现，记录开始/暂停/继续/停止。 |
| `PATCH` | `/agent/executions/:executionId` | 状态或进度 | `ExecutionState` | 实时状态是否使用 WebSocket 由阶段 5 决定。 |

## 未纳入首批实现的端点

- Booster SSO 回调、刷新令牌和登出端点。
- 生产云端技能包的签名、撤销、限流和审计端点。
- 实时位置、视频、语音流和多设备调度。

这些依赖外部协议，先由 Provider 接口隔离，待 sandbox 文档和凭据齐备后实现。
