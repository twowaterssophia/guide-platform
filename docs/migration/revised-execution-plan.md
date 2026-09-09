# 重排后的迁移执行计划

状态：地图资源本地迁移已完成；`TASK-003`、`TASK-004 / D3-04`、`TASK-005` 与 `TASK-006` 已完成，下一项进入 Agent 主线准备。

## 重排原因

地图上传依赖尚未确认的 OMap 扩展名、最大容量和二维预览来源。人设、技能目录和任务的非地图
数据模型不依赖这些参数，因此不应因地图文件协议而全部停摆。

本计划不将地图从导览任务中移除。任务最终仍必须绑定地图；点位的坐标与朝向也只在已绑定地图
时有业务语义。不会新增“无地图任务草稿”这一未获产品确认的状态。

## 执行主线

| 顺序 | 工作项 | 状态 | 范围与退出条件 |
| --- | --- | --- | --- |
| 1 | 迁移阶段一：FND-001 至 FND-005 | 完成 | 工程边界、数据库、当前用户、错误处理和测试基线均已验证。 |
| 2 | 地图文件支线：MAP-001 至 MAP-004 | 本地完成 | `.pcd + .png + .json` 合同、可配置容量、本地 Provider、Maps API、Console 和回归已完成；生产容量/对象存储待联调。 |
| 3.1 | PER-001：人设自定义技能模型 | 完成 | 建立可查询关联模型和 migration，seed 稳定系统默认人设。 |
| 3.2 | SKILL-001：Demo Skill Catalog Provider | 完成 | 提供稳定的官方/云端技能目录与兼容性，不伪造生产云端接入。 |
| 3.3 | PER-002A：人设基础 API 与 Console | 完成 | 已交付 API 与 Console 的人设 CRUD、系统默认人设和自定义技能；插件绑定留给 MCP 模块。 |
| 4.1 | TASK-001：任务详情与写入合同 | 完成 | 定义地图必填的最终任务 payload、点位、路径、动作和版本；创建和更新均校验连续路径。 |
| 4.2 | TASK-002：任务动作模型 | 完成 | `interactionPrompt` 已持久化；动作恰有一个归属目标，点位/路径内序号唯一。 |
| 5 | 任务 CRUD 与详情：TASK-003 | 完成 | 已实现任务列表/详情/创建/更新/删除 API、事务编排写入、归属校验、版本冲突保护；Console 已切换到独立详情页和真实删除。 |
| 6 | 任务编辑 Console：TASK-004 | 完成 | 三步编辑流已绑定真实地图、人设、点位、路径和动作；创建/编辑保存调用 TASK-003 API，并覆盖未保存保护、拖拽排序和移动端布局。 |
| 7 | 发布/归档与版本：TASK-005 | 完成 | 仅允许完整任务发布，发布递增版本；归档保持内容版本且不破坏 Agent 已下载版本；已发布任务不可直接编辑。 |
| 8 | 任务迁移/导入：TASK-006 | 完成 | 旧版导出、地图绑定 dry-run 和单事务导入已实现；无法表达的旧数据会拒绝并给出原因。 |
| 9 | Agent 应用壳：AGENT-001 | 完成本地壳 | `apps/agent` React/Vite 应用可独立启动；首页、设置页和任务同步入口可用，但同步 API 留给 AGENT-002。 |

## TASK-001 决策

任务写入使用有序 `points` 与 `paths` 数组；点位写入使用请求内唯一 `key`，路径通过相邻的
`fromPointKey` / `toPointKey` 连接。这避免新建任务在尚未拿到数据库 ID 时出现不稳定引用。

- 任务最终必须指定 `mapId`，至少包含一个点位；路径必须逐项连接相邻点位。
- 点位动作可为 `SPEECH`、`SKILL` 或 `INTERACTION`；路径动作只允许 `SPEECH` 或
  `INTERACTION`，因此无法将执行技能排入机器人移动途中。
- 语音播报必须有 `narration`；技能只从服务端目录以 `skillId` 解析；交互动作保留可选
  `interactionPrompt`，由 `TASK-002` 增加持久化字段后才能写入数据库。
- “新增导览后台和 Agent”一期的 Console 仍只展示语音播报、执行技能。`INTERACTION` 是另一份
  语音交互需求的前向兼容契约，未在一期 UI 或运行时中启用。

## TASK-002 决策

`TaskAction.interactionPrompt` 使用可空字符串持久化交互动作的 `prompt`。现有产品决策允许空
prompt，因此不将它设为数据库必填。

- migration `20260909030000_task_action_integrity` 已应用，保证每条动作恰好归属一个点位或一条
  路径，防止同时关联两者或完全没有归属。
- `(pointId, sequence)` 与 `(pathId, sequence)` 分别唯一。由于归属检查保证其中一个 ID 非空，
  这会保留各自容器内的稳定动作排序。
- 路径禁止技能仍通过 `TourTaskWriteInput` 在 API 写入边界执行；它涉及关联的目标类型，不能由
  单行 `TaskAction` 的数据库检查可靠表达。

## PER-001 决策

采用独立的 `PersonaCustomSkill` 模型，而不是在 `Persona` 中保存 JSON。

- 每项技能保存外部 `skillId`、显示名称、来源、模型调用说明和示例，便于校验、排序和查询。
- `skillId` 不建立数据库外键：官方或云端目录由 Provider 提供，可能暂时不可用；保存名称快照可让
  既有人设在目录变更时仍可解释。
- 通过 `(personaId, skillId)` 唯一约束防止重复选择；通过 `sequence` 保留用户配置顺序。
- 来源与共享契约保持一致，仅使用 `OFFICIAL` 和 `CLOUD` 两类。
- `PersonaPlugin` 与 MCP 凭据、插件可见性有关，不在本工作项实现。

## 地图后续参数

以下信息到位后做生产适配，不再阻塞本地迁移：

1. 正式单文件最大容量和对象存储配额。
2. 上游是否负责 PCD 与 PNG 的配准，以及生产坐标系命名约定。
3. 对象存储签名 URL、保留周期和下载权限。

## 已完成证据

- `20260909010000_persona_custom_skills` 已应用到本地 PostgreSQL，`prisma migrate status` 确认
  数据库与 schema 同步。
- `db:seed` 已创建 `__system_default__` 人设，名称为“默认”，并启用预置技能。
- `pnpm test`、`pnpm typecheck`、`pnpm lint` 和 `pnpm build` 均已通过。
- `GET /api/v1/skills` 已提供 Demo 技能目录，支持 `source` 与 `compatible` 过滤；非法来源
  返回统一的 `VALIDATION_ERROR`，Provider 与共享契约测试通过。
- `/personas` 的 CRUD 已验证：默认人设只读、创建和更新使用版本号、自定义技能由服务端目录解析；
  Console 已完成列表、详情、创建和编辑页，并在桌面与 390px 窄屏下验证关键展示及技能选择交互。
- `TASK-003` 已验证：任务服务集成测试覆盖创建/详情、点位与动作排序、不可用技能、跨账号地图/人设、
  正确的版本冲突顺序和删除级联；`pnpm exec playwright test e2e/console/d3-03-tour-tasks.spec.ts`
  在 desktop 与 mobile 项目共 4 项通过。详情截图已复核长动作文本和 390px 布局。
- `TASK-004 / D3-04` 已验证：`/tour-tasks/new` 与 `/tour-tasks/:taskId/edit` 使用真实地图、人设、技能和任务 API；
  支持地图预览、点击/拖动/排序点位、编辑坐标与朝向、点位/路径动作添加与排序、校验、固定操作栏和未保存草稿保护。
  `pnpm exec playwright test e2e/console/d3-04-task-editor.spec.ts` 为 5 项通过、1 项仅 desktop 合理跳过；
  `pnpm test:console:e2e` 全量回归为 35 项通过、3 项合理跳过。动作排序断言确认保存后详情页顺序与编辑结果一致。
- `TASK-005` 已验证：发布前检查地图三件套、配准、点位、路径、动作和可用技能；`DRAFT/ARCHIVED -> PUBLISHED`
  发布递增版本，`PUBLISHED -> ARCHIVED` 保持版本号，归档后编辑回到 `DRAFT`；已发布任务不会被直接更新。
  API 测试 19 项通过；`task-005-task-lifecycle.spec.ts` 桌面/移动 2 项通过，覆盖确认弹窗、Toast、状态和版本显示。
- `TASK-006` 已验证：旧版账户菜单可导出 `guide.appData`；迁移 CLI 支持地图绑定、dry-run 报告和单事务
  导入，任务导入为 `DRAFT`，历史 Agent 下载状态不导入。API 测试 21 项通过，包含缺地图/明文密钥拒绝、
  成功导入和重复导入保护。
- `AGENT-001` 已验证：`apps/agent` 可独立启动，保留相机视图、状态栏、模式控制、三组摇杆、任务操作栏、
  设置页和任务同步入口；桌面与 390px 视口交互测试 2 项通过。任务同步入口明确等待 `AGENT-002` API，
  不伪造云端状态。

## 当前下一步

进入 `AGENT-002`：实现已发布任务列表、地图包下载和 `AgentDownload` 记录。MCP 插件继续留给 `D3-05`，
不因本步骤提前伪造外部协议。
