# API 与共享契约清单

状态：完成（阶段 0.5）

本文区分已实现接口与后续提案。提案是阶段 1 至 5 的实现合同，不代表接口已经可用。

## 当前已实现 API

API 前缀为 `/api/v1`，由 NestJS/Fastify 在 `127.0.0.1:3000` 提供。

| 方法 | 路径 | 实现状态 | 响应契约 | 说明 |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | 已实现 | `healthResponseSchema` | 返回服务状态和 ISO 时间。 |
| `GET` | `/runtime` | 已实现 | `runtimeInfoSchema` | 返回 identity/skill provider 的 `demo`、`sandbox` 或 `production` 模式。 |
| `GET` | `/tour-tasks` | 已实现 | `tourTaskListSchema` | 使用 server-side 当前用户返回按创建时间倒序的任务摘要；demo 模式由 `DEMO_USER_EMAIL` 配置。 |
| `GET` | `/skills` | 已实现 | `skillListSchema` | Demo Provider 返回稳定技能目录；支持 `source` 和 `compatible` 过滤。 |
| `GET` | `/personas` | 已实现 | `personaListPageSchema` | 返回系统默认人设与当前账号人设，支持 cursor 分页。 |
| `POST` | `/personas` | 已实现 | `personaDetailSchema` | 创建当前账号人设；自定义技能必须来自可用且兼容的目录项。 |
| `GET` | `/personas/:personaId` | 已实现 | `personaDetailSchema` | 读取系统默认或当前账号人设。 |
| `PATCH` | `/personas/:personaId` | 已实现 | `personaDetailSchema` | 仅可更新当前账号人设；`expectedVersion` 不匹配时返回 `409 VERSION_CONFLICT`。 |
| `DELETE` | `/personas/:personaId` | 已实现 | `204` | 系统默认人设不可删除；删除用户人设时，关联任务回退到系统默认人设。 |

Swagger 文档在 API 启动后位于 `/api-docs`。API 已通过全局异常过滤器强制输出
`apiErrorSchema`，并在每个响应的 `X-Request-Id` 头和错误体中返回相同的 request ID。

## 共同约定

以下约定应在第一批写接口前落实到 `packages/contracts` 和 API：

| 主题 | 目标约定 |
| --- | --- |
| 身份 | demo 模式从 `CurrentUserService` 解析 server-side demo identity；sandbox/production 从身份 Provider 解析，客户端不传任意 owner ID。 |
| 时间 | 统一使用 ISO 8601 UTC 字符串。 |
| ID | API 将 ID 视为不透明字符串；客户端不得假设 cuid 格式。 |
| 错误 | 已统一 `{ code, message, requestId }`，对应 `apiErrorSchema`；认证、校验、冲突、找不到和外部 Provider 错误需有稳定 code。 |
| 分页 | 新列表接口默认 cursor 分页，返回 `{ items, nextCursor? }`；当前任务列表可在兼容窗口内保留数组响应。 |
| 并发 | 任务和可编辑资源更新需要 `expectedVersion` 或 `If-Match`；冲突返回 `409 VERSION_CONFLICT`。 |
| 删除 | 返回 `204`；被引用资源返回 `409 RESOURCE_IN_USE`，而非级联删除。 |
| 文件 | 上传使用 `multipart/form-data`；下载通过短时签名 URL 或 API 流，不暴露存储凭据。 |
| 密钥 | 插件认证字段只接受写入请求，不在读取响应中返回。 |

## 共享契约演进

| 契约区域 | 当前状态 | 下一步 |
| --- | --- | --- |
| Provider、health、runtime | 已定义 | 保持兼容。 |
| Task summary/detail/write | 已定义，动作模型已可持久化 | `TASK-003` 在 `MAP-001` 可校验地图归属后实现写入 API。 |
| Skill summary/list | 已定义并由 `/skills` 使用 | 真实云端接入后保持相同摘要合同。 |
| Personas | 已定义并由 `/personas` 使用 | Console 接入进行中；插件绑定由 MCP 模块后续补齐。 |
| API error | 已定义并全局应用 | 后续资源模块补充业务级稳定错误 code。 |
| Map | 已定义并由 `/maps` 使用 | 生产容量、对象存储和真实身份接入后保持相同摘要/详情合同。 |
| Plugin、Agent | 未定义 | 每个业务 API 前补 Zod schema、输入/输出类型和 fixture。 |

## 提议接口

### Maps

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/maps` | `cursor?`、`limit?` | `MapListPage` | 仅返回当前用户资产。 |
| `POST` | `/maps` | multipart：`name`、`pcd`、`preview`、`metadata` | `MapAssetDetail` | 校验 `.pcd + .png + .json`、大小、配准尺寸和名称；服务端写存储。 |
| `GET` | `/maps/:mapId` | 无 | `MapAssetDetail` | 返回 PCD 元数据、PNG 预览引用、配准和任务引用数。 |
| `GET` | `/maps/:mapId/preview` | 无 | `image/png` | 当前账号范围内返回二维预览流。 |
| `PATCH` | `/maps/:mapId` | `name`、`expectedVersion?` | `MapAssetDetail` | 仅编辑元数据。 |
| `DELETE` | `/maps/:mapId` | 无 | `204` | 有任务引用时返回 `409 RESOURCE_IN_USE`。 |

### Personas

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/personas` | `cursor?`、`limit?` | `PersonaListPage` | 已实现；系统默认人设和当前用户人设可见。 |
| `POST` | `/personas` | `PersonaWriteInput` | `PersonaDetail` | 已实现；校验可用且兼容的自定义技能。插件绑定后置。 |
| `GET` | `/personas/:personaId` | 无 | `PersonaDetail` | 已实现；返回自定义技能元数据，不含插件密钥。 |
| `PATCH` | `/personas/:personaId` | `PersonaUpdateInput` | `PersonaDetail` | 已实现；系统默认人设不可编辑，更新需传版本。 |
| `DELETE` | `/personas/:personaId` | 无 | `204` | 已实现；拒绝删除系统默认人设，其他人设的任务引用回退默认人设。 |

### MCP 插件和技能

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/mcp-plugins` | `cursor?`、`limit?` | `McpPluginListPage` | 响应不包含认证配置。 |
| `POST` | `/mcp-plugins` | `McpPluginWriteInput` | `McpPluginDetail` | 服务端加密认证配置，校验 headers JSON。 |
| `GET` | `/mcp-plugins/:pluginId` | 无 | `McpPluginDetail` | 返回工具列表及刷新时间。 |
| `PATCH` | `/mcp-plugins/:pluginId` | `McpPluginWriteInput` + 版本 | `McpPluginDetail` | 认证字段省略表示保留，显式清空才删除。 |
| `DELETE` | `/mcp-plugins/:pluginId` | 无 | `204` | 先解除 PersonaPlugin 或返回受影响人设信息。 |
| `POST` | `/mcp-plugins/:pluginId/refresh-tools` | 无 | `McpPluginDetail` | 调用 Provider；失败保留旧工具并返回外部错误。 |
| `GET` | `/skills` | `source?`、`compatible?` | `SkillList` | Demo Provider 已实现；sandbox/production Provider 待外部协议。 |
| `GET` | `/skills/:skillId` | 无 | `SkillDetail` | 返回当前身份可见的技能详情。 |

### Tour tasks

| 方法 | 路径 | 请求 | 响应 | 规则 |
| --- | --- | --- | --- | --- |
| `GET` | `/tour-tasks` | 兼容现有；后续支持分页 | `TourTaskListPage` | 当前摘要接口保持可用。 |
| `POST` | `/tour-tasks` | `TourTaskWriteInput` | `TourTaskDetail` | 已接入；创建 DRAFT 并在事务中原子写入点位、路径和动作，校验地图/人设归属与技能可用性。 |
| `GET` | `/tour-tasks/:taskId` | 无 | `TourTaskDetail` | 已接入；包含地图、人设、点位、路径、动作和版本，按当前账号隔离。 |
| `PATCH` | `/tour-tasks/:taskId` | `TourTaskUpdateInput` | `TourTaskDetail` | 已接入；使用 `expectedVersion` 做乐观并发控制，更新时重建编排结构。 |
| `DELETE` | `/tour-tasks/:taskId` | 无 | `204 No Content` | 已接入；当前账号删除并由数据库级联清理点位、路径和动作。 |
| `DELETE` | `/tour-tasks/:taskId` | 无 | `204` | 清理任务下属点位、路径、动作和下载记录。 |
| `POST` | `/tour-tasks/:taskId/publish` | `expectedVersion` | `TourTaskDetail` | 仅完整编排可发布；递增版本。 |
| `POST` | `/tour-tasks/:taskId/archive` | `expectedVersion` | `TourTaskDetail` | 已下载任务的 Agent 可继续执行已下载版本。 |

`TourTaskWriteInput` 已表达 `name`、必填 `mapId`、可选 `personaId`、有序点位、连续路径和
有序动作。输入点位使用请求内 `key`，路径引用相邻点位 key；`interactionPrompt` 已由
`TASK-002` 持久化。任务写 API 已在 `TASK-003` 接入，并依赖 `MAP-001` 提供受当前用户保护的地图查询。

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
