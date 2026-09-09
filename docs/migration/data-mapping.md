# 旧版数据到 Prisma 的映射

状态：完成（阶段 0.4；TASK-006 导入工具已实现）

## 范围与原则

旧版业务数据来自浏览器 `localStorage`：主键为 `guide.appData`，当前版本为
`2`；无主键时会合并旧键 `guide.mcpPlugins`。目标数据模型在
`services/api/prisma/schema.prisma`。

迁移不得直接覆盖生产数据。正式实现前必须提供导出、dry-run、校验报告、事务导入
和失败回滚。旧 ID 是字符串，兼容 Prisma 的 `String @id`，应在导入时保留以维护引用。

## 顶层数据映射

| 旧版集合/概念 | 目标模型 | 映射规则 | 风险或待补工作 |
| --- | --- | --- | --- |
| 演示账户 `guide@booster.tech` | `User` | 创建或复用 demo 用户；`externalId=demo-guide-user` | 真实 SSO 用户映射另行实现。 |
| `maps[]` | `MapAsset` | 保留 `id`、`name`、`fileName -> originalFileName`、`createdAt` | 旧版没有文件字节、media type、size、storage key，不能伪造为可下载地图。 |
| `tourTasks[]` | `TourTask`、`TourPoint`、`TourPath`、`TaskAction` | 保留主键和引用；按照数组次序生成 `sequence` | 旧版无任务状态和更新时间。 |
| `personas[]` | `Persona`、`PersonaPlugin` | `pluginIds` 建立关联；`system -> isSystemDefault` | 自定义技能没有现有 Prisma 模型。 |
| `mcpPlugins[]` | `McpPlugin` | 元数据、请求头和工具可迁移；凭据进入加密配置 | 明文 demo token/password 不能迁入非 demo 环境。 |
| Agent 页面状态 | `AgentDownload` | 仅能迁移未来 API 记录，当前没有可靠持久化源 | 不执行历史导入。 |

## MapAsset

| 旧字段 | 目标字段 | 处理 |
| --- | --- | --- |
| `id` | `id` | 原样保留。 |
| `name` | `name` | 原样保留，导入时检查同一 owner 下的命名冲突策略。 |
| `fileName` | `originalFileName` | 原样保留。 |
| `createdAt` | `createdAt` | 转为 UTC `DateTime`。 |
| 无对应字段 | `ownerId` | 设为导入账户。 |
| 无对应字段 | `storageKey`、`mediaType`、`sizeBytes` | 标记为“缺少文件内容”；正式导入要求重新上传源文件。 |

地图记录缺少实际文件时，允许仅作为旧数据审计记录，不得被发布任务引用。文件上传流程
完成后才生成可用的 `MapAsset`。

## TourTask、点位、路径和动作

| 旧字段 | 目标字段 | 处理 |
| --- | --- | --- |
| `id` | `TourTask.id` | 原样保留。 |
| `name` | `TourTask.name` | 去首尾空格后导入。 |
| `mapId` | `TourTask.mapId` | 必须引用已成功导入且可用的地图。 |
| `mapName` | 不持久化 | 是旧版冗余显示字段；从 `MapAsset.name` 读取。 |
| `pointCount` | 不持久化 | 从 `TourPoint` 数量计算。 |
| `voicePersonaId` | `personaId` | 指向已导入 Persona；系统默认人设需先存在。 |
| 无状态字段 | `status` | 旧版没有发布概念；默认导入为 `DRAFT`。 |
| `createdAt` | `createdAt`、`updatedAt` | 旧版只有创建时间；初次导入时两者使用该时间。 |
| `points[]` 数组顺序 | `TourPoint.sequence` | 从 1 开始连续编号。 |
| `point.id/name/x/y/angle` | 同名 `TourPoint` 字段 | 原样保留；坐标需校验为有限数值。 |
| `paths[]` 数组顺序 | `TourPath.sequence` | 从 1 开始连续编号。 |
| `fromPointId/toPointId` | 同名 `TourPath` 字段 | 必须属于同一任务，且应与点位连续顺序一致。 |
| `actions[]` 数组顺序 | `TaskAction.sequence` | 从 1 开始连续编号。 |
| `speech`、`skill`、`interaction` | `SPEECH`、`SKILL`、`INTERACTION` | 枚举改为大写。 |
| `narration` | `narration` | 仅语音动作允许且必填。 |
| `skillId`、`skillName` | 同名字段 | 仅技能动作允许且 `skillId` 必填。 |
| `prompt` | `interactionPrompt` | 仅交互动作允许；当前产品决策允许为空。 |

### 任务模型缺口

`20260909030000_task_action_integrity` 已新增 `TaskAction.interactionPrompt String?`，因此导入器
应将旧版交互动作 `prompt` 原样写入，不能丢弃内容。该 migration 还在数据库层约束每个动作恰好
属于一个点位或一条路径，并使点位与路径内的动作 `sequence` 分别唯一。

## Persona 与技能

| 旧字段 | 目标字段 | 处理 |
| --- | --- | --- |
| `id/name/voice/prompt` | 同名 Persona 字段 | 原样保留。 |
| `system: true` | `isSystemDefault: true` | 仅系统默认人设设置；`ownerId=null`。 |
| 自定义人设 | `ownerId` | 设为导入账户。 |
| `presetSkillsEnabled` | 同名字段 | 原样保留。 |
| `pluginIds[]` | `PersonaPlugin` | 逐个创建复合主键关联；插件必须存在。 |
| `customSkills[]` | `PersonaCustomSkill` | 保留技能快照、来源、调用说明和示例；按数组顺序写入 `sequence`。 |

`PersonaCustomSkill` 已在阶段 3 定稿为独立模型，迁移器会保留技能快照并校验来源。

默认人设 `__system_default__` 也应在 seed 或 migration 中稳定创建，不能仅靠前端常量。

## McpPlugin

| 旧字段 | 目标字段 | 处理 |
| --- | --- | --- |
| `id/name/description/examples/serviceUrl` | 同名字段 | 原样保留并重新校验 URL。 |
| `authType` | `authType` | `none/bearer/api-key/basic` 映射至 `NONE/BEARER/API_KEY/BASIC`。 |
| `headers` JSON 字符串 | `customHeaders` JSON | 解析后写入对象；无效 JSON 拒绝导入。 |
| `tools` 字符串数组 | `tools` JSON | 保存为结构化数组；后续 Provider 可补详情。 |
| `refreshedAt` | `lastRefreshedAt` | 转为 UTC `DateTime`。 |
| `createdAt` | `createdAt` | 转为 UTC `DateTime`。 |
| `auth.token/apiKey/username/password` | `encryptedConfiguration` | 只在 demo 环境可迁入演示值；其他环境先加密再写入。 |
| `refreshCount` | 无 | 仅作为旧版显示状态，不迁移；可将来单独增加审计字段。 |

任何导入日志、API 响应和错误消息都不得回显明文认证配置。

## AgentDownload

旧版 Agent 没有稳定的设备 ID、已下载版本持久化或任务包校验和，不能可靠生成
`AgentDownload`。阶段 5 起由 Agent API 写入：`deviceId`、`tourTaskId`、
`downloadedVersion` 和时间戳。历史 Agent 原型不参与自动导入。

## 导入流程

```text
导出 guide.appData
    -> 校验版本、JSON 和引用
    -> 生成 dry-run 报告
    -> 创建/解析 User 与系统默认 Persona
    -> 导入可用 MapAsset
    -> 导入 Plugin，再导入 PersonaPlugin
    -> 导入 PersonaCustomSkill
    -> 导入 Task、Point、Path、Action
    -> 事务提交并输出旧 ID 到新 ID 报告
```

拒绝条件包括：缺失地图文件绑定、孤立引用、重复 ID、无效坐标、非连续路径、无法加密的
认证配置，以及当前模型无法表达的动作或字段。
