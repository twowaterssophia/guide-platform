# 代码边界与迁移归属

状态：完成（阶段 0.2）

本文以当前仓库为准，定义迁移期间每一块代码的职责、数据归属和处理方式。
它不改变产品行为，也不意味着旧版功能已经迁移完成。

## 决策摘要

- `src/` 和 `booster-app-agent/` 是当前行为的参照实现，不是后续新增功能的默认落点。
- `apps/console/`、`services/api/`、`packages/contracts/` 和 `packages/ui/` 是目标工程的权威落点。
- 业务事实应最终由 API 和 PostgreSQL 持有；浏览器只能保存短暂编辑状态，不能作为长期业务数据源。
- 在新版完成同一业务域的验收前，旧版不删除；旧版仅接受必要的缺陷修复。

## 模块归属

| 区域 | 当前路径 | 当前职责 | 数据归属 | 迁移处理 | 目标归属 |
| --- | --- | --- | --- | --- | --- |
| 旧版后台 | `index.html`、`src/app.js`、`src/styles.css` | 地图、任务、人设、MCP 插件的完整静态交互原型 | 浏览器 `guide.appData`，版本 `2`；兼容旧键 `guide.mcpPlugins` | 保留为行为参照，停止功能扩张 | `apps/console/` + `services/api/` |
| 旧版 Agent | `booster-app-agent/` | 导览设置、地图资源、任务下载和执行控制的静态原型 | 以当前 DOM 状态为主，无 API 持久化 | 保留到 Agent 读写 API 完成 | 未来 `apps/agent/` + `agent-sync` API |
| 新版 Console | `apps/console/` | React 后台壳、路由、任务列表、任务草稿界面和空状态 | 通过 REST 读取任务列表；新建/编辑暂未持久化 | 继续按业务域迁移 | React 前端唯一实现 |
| API | `services/api/` | NestJS/Fastify、Swagger、健康检查、运行模式和任务列表 | Prisma/PostgreSQL；当前用户硬编码为 `guide@booster.tech` | 扩展为模块化单体 | 业务规则、鉴权和外部 Provider 边界 |
| 数据库模型 | `services/api/prisma/schema.prisma` | 用户、地图、任务、点位、路径、动作、人设、插件和下载记录的目标模型 | PostgreSQL | 在写接口前补充 migration，并修复已识别的模型缺口 | 业务事实来源 |
| 共享契约 | `packages/contracts/` | Zod 输入/输出 schema 和 TypeScript 类型 | 不持有数据 | 所有 API DTO 在这里先定义或同步定义 | 前后端边界 |
| 共享 UI | `packages/ui/` | Token、Button、Table、Tag、Empty、Popover、Modal、Toast | 不持有业务数据 | 保持无业务依赖；转为正式包导入 | 设计系统基础层 |
| Console UI 适配 | `apps/console/src/ui-adapters.ts` | 将 DOM 型 UI primitive 接入 React 生命周期 | 不持有业务数据 | 临时桥接；逐步用 React 适配层或 React 组件替代 | Console 表现层 |
| 产品与设计资料 | `resources/`、`docs/design-audit/`、`diagrams/` | 需求、设计审计、流程图和图片参照 | Git 跟踪文件 | 只读参照，不作为运行时资源读取 | 设计与验收依据 |
| 开发与部署配置 | `.env.example`、`docker-compose.yml`、根脚本 | 本地环境、PostgreSQL、workspace 命令 | 本地环境变量和 Docker volume | 维护为可复现开发入口 | 开发基础设施 |
| 临时产物 | `.codex-preview/`、`_wbcheck/`、`tmp/` | 预览、检查或中间文件 | 无 | 保持忽略，不纳入产品实现 | 无 |

## 运行时依赖方向

```text
apps/console --------------> packages/contracts
      |                              ^
      | REST                         |
      v                              |
services/api ------------------------+
      |
      v
PostgreSQL via Prisma

booster-app-agent ---- future REST ----> services/api

packages/ui <---- Console presentation only
```

`packages/ui` 不应依赖 React、业务模型、API 或 Prisma。`packages/contracts`
不应依赖 NestJS、浏览器 DOM 或数据库实现。

## 当前边界问题与处理决定

| 问题 | 证据 | 风险 | 处理决定 |
| --- | --- | --- | --- |
| 新版 Console 直接导入 UI 源码 | `main.tsx` 和 `ui-adapters.ts` 使用 `../../../packages/ui/src/...` | 绕过 `@guide/ui` 包导出、构建和版本边界 | 阶段 1 改用包导入或显式的 React 适配入口。 |
| 新版 Console 页面集中在单文件 | `apps/console/src/app.tsx` 同时包含 shell、路由、请求和六个页面 | 业务域迁移时容易互相耦合 | 阶段 1 按 `app`、`api`、`pages`、`features`、`shared` 拆分。 |
| 旧版与新版数据不互通 | 旧版使用 `localStorage`，新版从 API 查询 | 用户可能看到两套不同数据 | 阶段 4 前不宣称新版替代旧版；按本文档的数据导入策略提供一次性迁移。 |
| API 契约并未覆盖全部 Prisma 模型 | 当前 contracts 只有 health、runtime、skill summary、task summary 和错误模型 | 页面容易先写出不可保存的表单 | 每个写接口先补 DTO/响应 schema，再实现 Controller。 |
| API 使用固定演示用户 | `TourTasksService` 固定查询 `guide@booster.tech` | 无法承载真实多用户权限 | 保留 demo provider；在真实 SSO 接入前通过身份 Provider 注入当前用户。 |
| 架构计划中的 Agent 应用缺失 | `docs/architecture.md` 规划 `apps/agent`，workspace 中没有该目录 | 根命令 `pnpm dev:agent` 无法运行 | 阶段 5 创建 `apps/agent`，此前以旧版 Agent 为交互参照。 |

## 业务域所有权

| 业务域 | 后端模块目标 | Console 页面目标 | Agent 影响 | 前置条件 |
| --- | --- | --- | --- | --- |
| 地图 | `maps` | 地图列表、上传、详情 | 下载或引用地图 | 存储 Provider、文件校验 |
| 人设 | `personas` | 列表、编辑、详情 | 任务运行时人设 | 插件/技能引用规则 |
| MCP 插件 | `mcp-plugins` | 列表、配置、详情、刷新工具 | 运行时工具调用 | 加密配置、工具发现 Provider |
| 技能 | `skills` | 技能选择器 | 任务包依赖 | demo/sandbox catalog Provider |
| 导览任务 | `tour-tasks` | 列表、详情、三步编排、发布 | 可下载任务包 | 地图；可选人设、技能和插件 |
| 设备同步 | `agent-sync` | 后台可见性按后续需求决定 | 列表、下载、更新、删除、执行状态 | 已发布任务和稳定任务包 |

## 迁移期间的变更规则

1. 新功能默认进入目标工程，不再在 `src/app.js` 新增平行业务逻辑。
2. 每次迁移一个业务域时，必须同时修改其 API、契约、Console 和验收用例或手工验收记录。
3. 不允许 Console 直连 Booster、MCP 服务或保存第三方密钥；敏感凭据仅由 API 接收和加密处理。
4. 不删除旧版数据字段，直到数据映射、导入和新旧验收均完成。
5. Provider 只通过 `demo`、`sandbox`、`production` 模式切换；页面和数据库模型不依赖具体外部厂商。
