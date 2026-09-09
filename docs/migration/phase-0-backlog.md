# 阶段 0 迁移 Backlog

状态：完成（阶段 0.7）

本 Backlog 按依赖和业务价值排序。`P0` 是完成首个可用闭环的必要工作；`Blocked`
表示不能在没有外部材料的情况下正确实现。

## 范围冻结

- 旧版后台和旧版 Agent 在新版完成验收前保留。
- 新业务功能默认进入 `apps/console`、`services/api` 和共享包；旧版只处理阻断迁移的缺陷。
- 不在前端保存第三方密钥、直接调用 Booster 或直接调用 MCP 服务。
- 不拆分微服务；API 以模块化单体演进。
- 不在取得 sandbox 协议和凭据前伪造生产外部集成成功。

## P0：工程基础与地图

| ID | 工作项 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| FND-001 | 拆分 Console 应用结构 | 无 | Shell、路由、API client、页面和 feature 目录独立；不改变现有路由行为。 |
| FND-002 | 规范化 `@guide/ui` 使用 | FND-001 | Console 不再通过相对路径导入 `packages/ui/src`。 |
| FND-003 | Prisma migration 和数据库启动基线 | Docker Desktop | schema 有首个 migration，`migrate` + `seed` 可在空库运行。 |
| FND-004 | API 错误、当前用户与请求日志基础 | FND-003 | demo identity 不再散落在业务 service；错误符合 `apiErrorSchema`。 |
| FND-005 | 测试基础 | FND-001、FND-003 | contracts/API/Console 至少各有一个会实际执行的测试。 |
| MAP-001 | MapAsset 契约、列表和详情 API | FND-003、FND-004 | 已完成本地版本；当前用户可读取 PCD、PNG 预览和配准元数据。 |
| MAP-002 | 地图上传与本地存储 Provider | MAP-001 | 已完成本地版本；三件套校验、可配置大小限制和安全 storage key 可用。 |
| MAP-003 | 地图 Console 页面 | MAP-001、MAP-002 | 已完成；列表、上传、详情、预览、重命名、空/错/加载状态可用。 |
| MAP-004 | 地图删除引用保护 | MAP-001 | 已完成；被任务引用时返回 `409 RESOURCE_IN_USE`。 |

## P0：任务草稿与发布闭环

| ID | 工作项 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| TASK-001 | 补齐任务详情和写入契约 | FND-004 | detail/create/update/delete schema 覆盖点位、路径、动作和版本。 |
| TASK-002 | 修复动作模型缺口 | TASK-001 | `interaction.prompt` 有明确的 Prisma 表达和 migration。 |
| TASK-003 | 任务 CRUD API | MAP-001、TASK-001、TASK-002 | 事务写入编排、引用校验、排序和冲突处理可用。 |
| TASK-004 | 任务编辑 Console | MAP-003、TASK-003 | 三步流程保存真实地图、点位、路径和动作。 |
| TASK-005 | 发布/归档与版本 | TASK-003 | 只允许完整任务发布，版本递增且可读取状态。 |
| TASK-006 | 任务迁移/导入工具 | TASK-003 | `guide.appData` 可 export、dry-run 和事务导入；不表达的数据被拒绝。 |

## P1：人设、插件和技能

| ID | 工作项 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| PER-001 | Persona 自定义技能数据模型决策 | FND-003 | 选择独立模型或 JSON，并完成 migration。 |
| PER-002 | Persona API 和 Console | PER-001、FND-004 | CRUD、系统默认、插件绑定和任务引用规则可用。 |
| MCP-001 | 插件加密配置和密钥轮换策略 | FND-004 | 密钥只可写入、可解密给 Provider、不会在响应/日志泄露。 |
| MCP-002 | MCP 插件 API 和 Console | MCP-001 | CRUD、认证校验、请求头和引用提示可用。 |
| SKILL-001 | Demo Skill Catalog Provider | FND-004 | 可返回稳定的官方/云端技能目录与兼容性。 |
| MCP-003 | 工具刷新 Provider | MCP-002 | 刷新结果、失败和旧工具保留行为可验证。 |

## P1/P2：Agent

| ID | 工作项 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| AGENT-001 | 确定并创建 `apps/agent` | TASK-005 | 独立 React 应用可启动，替代静态 Agent 的页面壳。 |
| AGENT-002 | 已发布任务列表与下载 API | AGENT-001、TASK-005 | 设备能看到、下载和删除任务包；写入 `AgentDownload`。 |
| AGENT-003 | 版本更新状态 | AGENT-002 | 已下载版本与发布版本比较正确。 |
| AGENT-004 | 执行状态协议 | AGENT-002 | 暂停、继续、停止和进度的协议完成后再开发 UI。 |

## Blocked：外部接入

| ID | 所需外部材料 | 解除条件 |
| --- | --- | --- |
| EXT-001 | Booster SSO sandbox issuer、client、redirect、JWKS、scope 和错误约定 | 实现 sandbox identity Provider 并记录实测结果。 |
| EXT-002 | 云端技能列表、详情、下载、签名、撤销和限流协议 | 实现 sandbox skill catalog/package Provider。 |
| EXT-003 | Agent/机器人任务包格式、设备身份和执行事件协议 | 决定 package、同步和实时状态接口。 |

## 原始推荐执行顺序

```text
FND-001..005
    -> MAP-001..004
    -> TASK-001..006
    -> PER-001..002, MCP-001..003, SKILL-001
    -> AGENT-001..003
    -> AGENT-004 and external integrations when unblocked
```

阶段 1 从 `FND-001` 开始。每项完成时必须更新本文件的状态、补充对应验收证据，
并提交可独立回滚的代码变更。

## 当前执行顺序

地图文件协议已采用 `.pcd + .png + .json`；正式容量和对象存储仍在后续生产适配中，因此执行顺序调整为：

```text
FND-001..005 (completed)
    -> PER-001 -> SKILL-001 -> PER-002A
    -> TASK-001 -> TASK-002
    -> MAP-001..004 (local complete)
    -> TASK-003..006 -> Agent
```

任务的最终写入仍要求地图；本次调整仅提前独立的人设、技能和任务合同工作，不新增无地图任务。
完整状态和决策见 `docs/migration/revised-execution-plan.md`。

## 当前执行状态

- [x] FND-001：Console 已拆分为应用壳、路由、API client、功能页与通用页面；原有路由
  行为保留。验收：`pnpm --filter @guide/console typecheck`、`lint`、`build` 均通过。
- [x] FND-002：Console 已通过工作区依赖从 `@guide/ui` 导入组件与样式，不再引用
  `packages/ui/src`。UI 包导出并在构建时复制 `styles.css` 及其依赖。验收：UI 与 Console
  的 `typecheck`、`lint`、`build` 均通过。
- [x] FND-003：已生成首个 Prisma migration，并为 API 增加本地环境模板与 `.env` 加载。
  验收：Docker Desktop 引擎已恢复；`pnpm --filter @guide/api db:migrate` 成功应用
  `20260909000000_init`，`db:seed` 成功写入 1 个用户、1 个地图和 1 个任务；API 的
  `typecheck`、`lint`、`build` 以及 `/health`、`/tour-tasks` 冒烟检查均通过。
- [x] FND-004：已新增 `CurrentUserService`，业务服务不再自行硬编码 demo 邮箱；新增 Fastify
  `onRequest` request ID、响应头、请求日志与全局异常过滤器。验收：`/tour-tasks` 保持成功响应，
  自带及客户端提供的 `X-Request-Id` 均在响应头和错误体一致返回；未知路径返回符合
  `apiErrorSchema` 的 `404`。
- [x] FND-005：已为 `@guide/contracts`、`@guide/api` 和 `@guide/console` 添加实际断言的测试；
  contracts 校验 Zod 数据与必填 request ID，API 校验 request ID 与异常归一化，Console 校验
  API client 的成功和非成功响应。验收：三个包的测试共 8 项均通过。

迁移阶段一完成。地图文件支线的本地版本已完成；正式容量、对象存储和生产身份作为联调参数
后置，当前继续推进任务 CRUD 与详情。

- [x] PER-001：采用独立 `PersonaCustomSkill` 模型而非 JSON，并在 seed 中建立稳定的系统默认
  人设。验收：`20260909010000_persona_custom_skills` 已应用，migration 状态同步，系统默认人设
  已写入 PostgreSQL；全仓测试、类型检查、lint 和构建通过。
- [x] SKILL-001：已实现可替换的 Demo Skill Catalog Provider 与 `GET /skills`；支持来源和兼容性
  过滤，并有共享契约和 Provider 测试。真实云端 Provider 仍由 `EXT-002` 阻塞。
- [x] PER-002A：已完成 API 与 Console 的人设 CRUD、系统默认人设和自定义技能。API 具备当前账号
  隔离、系统默认只读、技能解析、版本冲突和删除时的任务默认人设回退；Console 具备列表、详情、
  创建和编辑，已验证桌面与窄屏。插件绑定后置。
- [x] TASK-001：任务详情、创建和更新契约已完成；任务保持地图必填，点位使用请求内唯一 key，路径按点位顺序连续连接，且移动途中禁止执行技能。
- [x] TASK-002：`20260909030000_task_action_integrity` 已应用；交互 prompt 可持久化，动作恰有一个点位或路径归属，且容器内动作序号唯一。
- [x] MAP-001..004：已完成本地地图资源闭环；合同、上传、存储、预览、改名和引用保护记录在
  `docs/migration/map-file-contract.md`。正式容量和对象存储不阻塞本地迁移，但仍需生产联调。
