# 阶段二：地图资源迁移计划

状态：未开始；其前置的迁移阶段一正在执行，FND-001 至 FND-004 已完成。

## 目标

将“地图”从旧版 `localStorage` 原型迁移为当前账号范围内、由 API 与 PostgreSQL
持久化的资源。阶段二交付地图列表、文件上传、独立详情、仅改名和受引用保护的删除。
地图点位画布、拖拽和任务编排属于阶段四，不在本阶段实现。

## 已确认产品范围

- 用户可以查看账号下全部地图，按创建时间倒序。
- 用户可以输入名称并上传一个本地 OMap 导出文件。
- 用户可以查看地图名称和二维预览；编辑仅可修改名称，不可重新上传文件。
- 用户可以从列表或详情删除地图，并获得二次确认、成功 Toast 和返回列表。
- 上传中显示 loading；空、错误和无地图状态完整可见。

以上范围来自 `resources/导览一期 - 新增导览后台和Agent.md` 与
`docs/design-audit/design-spec.md`。

## 硬性准入条件

阶段二不能跳过以下基础项：

| Gate | 当前状态 | 为什么必须先完成 |
| --- | --- | --- |
| FND-001：拆分 Console 边界 | 已完成 | 地图不能继续堆入单一 `app.tsx`。 |
| FND-002：正式使用 `@guide/ui` | 已完成 | 地图的 Modal、Table、Toast、Confirm Modal 需要稳定组件边界。 |
| FND-003：Prisma migration 与可启动数据库 | 已完成 | 地图元数据不能只写到未迁移的 schema。 |
| FND-004：当前用户与统一错误 | 未完成 | 地图必须按账号隔离，上传和引用错误必须稳定返回。 |
| FND-005：测试基础 | 未完成 | 上传、删除保护和权限不能只靠手工验证。 |

PRD 仍有三个未定的产品参数，不能由工程侧任意填写：

| 参数 | PRD 当前文本 | 对实现的影响 |
| --- | --- | --- |
| 允许文件类型 | `.XXX` | 决定扩展名、MIME 校验和预览解析器。 |
| 单文件最大容量 | `XX MB` | 决定 API 限制、Fastify multipart 限制和错误文案。 |
| 二维预览来源 | 仅写“2D 地图” | 决定能否从上传文件渲染，或是否需要 OMap 提供独立预览资产。 |

## 顺序执行步骤

### 2.0 确认迁移阶段一准入条件（不属于阶段二实施）

状态：迁移阶段一执行中；第 1 至 4 项已完成，第 5 项待执行。

1. 完成 FND-001：将 Console 拆为应用壳、路由、API client、业务 feature 和页面。
2. 完成 FND-002：将 UI 引用收敛到 `@guide/ui` 的正式导出。
3. 完成 FND-003：生成首个 Prisma migration，启动 PostgreSQL，并验证 migrate/seed。
4. 完成 FND-004：引入 demo current-user service、统一 API 错误和 request ID。
5. 完成 FND-005：为 contracts、API 和 Console 建立可执行的最小测试。

退出条件：空数据库可迁移并 seed；Console/API 都有可重复运行的测试入口；业务服务
不再自行硬编码 demo email。

运行时验收记录：Docker Desktop 引擎已恢复，PostgreSQL 容器健康运行；migration、seed
和 API 冒烟检查均通过。当前用户、request ID、统一 API 错误也已接入；`dockerInference`
端点仍是 Docker 的运行时 reparse point，但已不再阻塞引擎启动。

### 2.1 定稿地图合同与存储 Provider

状态：等待产品参数。

1. 在 `@guide/contracts` 定义 `MapAssetSummary`、`MapAssetDetail`、分页列表、上传响应、
   改名输入和错误 code。
2. 明确定稿的扩展名、最大字节数、预览资产来源和文件校验策略。
3. 实现本地 `MapStorageProvider`，以 API 控制的 storage key 保存文件；不将用户路径作为
   storage key，不在响应中暴露文件系统绝对路径。
4. 定义预览策略：仅当 OMap 文件格式可安全解析时生成预览；否则以受控的预览资源或
   明确的不可预览状态替代。

退出条件：合同、文件限制、存储目录策略和预览行为均有测试数据与明确错误文案。

### 2.2 实现 Maps API

状态：未开始。

1. 新增 `maps` Nest 模块、Controller、Service、DTO 与 Prisma 查询。
2. 实现 `GET /maps`、`POST /maps`、`GET /maps/:mapId`、`PATCH /maps/:mapId`、
   `DELETE /maps/:mapId`。
3. 上传采用受限 multipart；在数据库写入失败时回收已写入文件。
4. 删除前检查 `TourTask` 引用；有引用时返回 `409 RESOURCE_IN_USE`。
5. 所有查询按当前用户 `ownerId` 限定，跨账户访问返回 `404`。

退出条件：API 集成测试覆盖成功、校验失败、跨账户、文件回收和引用保护。

### 2.3 实现 Console 地图体验

状态：未开始。

1. 新增 maps feature 的查询、mutation 和类型安全 API adapter。
2. 交付列表：loading、空、错误、创建时间、行详情、更多操作。
3. 交付添加地图 Modal：名称、文件、客户端辅助校验、上传进度、重复提交保护和 Toast。
4. 交付 `/maps/:mapId` 独立详情页：元数据、二维预览或不可预览说明、改名和删除。
5. 删除使用 Confirm Modal；成功后使列表缓存失效并回到列表。

退出条件：不再显示“接口尚未接入”的占位文案，所有地图状态从 API 读取。

### 2.4 验收与回归

状态：未开始。

1. 执行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、
   `pnpm build`。
2. 使用已启动的 PostgreSQL 验证 migration、seed 和 Maps API。
3. 验证流程：上传地图 -> 列表出现 -> 查看详情/预览 -> 改名 -> 删除未引用地图。
4. 创建引用地图的任务 fixture 后，验证删除返回 `RESOURCE_IN_USE`。
5. 执行桌面和窄屏渲染验证；记录截图、控制台错误和遗留限制。

退出条件：`docs/migration/acceptance-checklist.md` 的地图部分全部通过，且没有未解释的
API、构建或渲染错误。

## 不在阶段二的事项

- 地图点位、朝向、缩放、拖拽和排序。
- 任务创建、路径、动作、草稿和发布。
- 机器人本地地图下载、地图复用与设备侧删除。
- 真实 Booster SSO、云端对象存储和 OMap 格式解析，除非相应协议已提供。

## 当前下一步

先完成迁移阶段一的 FND-005 测试基础；此后再正式开始阶段二的 2.1。地图上传本身在产品方
确认文件扩展名、最大容量和预览来源前保持阻塞，避免把 `.XXX` 和 `XX MB` 误实现为不可逆
接口合同。
