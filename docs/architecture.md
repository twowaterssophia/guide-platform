# 导览平台架构决策（ADR-001）

## 结论

导览项目采用一个 `pnpm` 单仓库（monorepo），其中包含两套 React 前端、一个模块化后端和一个共享契约包：

```text
apps/
  console/       导览后台 Web
  agent/         Booster App 内的导览 Agent Web 界面
services/
  api/           导览业务 API（模块化单体）
packages/
  contracts/     前后端共享的数据类型和接口模型
```

| 层 | 选择 | 原因 |
|---|---|---|
| 导览后台 | React + TypeScript + Vite | 适合高交互的地图、编排、表单和列表界面；组件、类型和测试生态成熟。 |
| Agent Web 界面 | React + TypeScript + Vite | 与后台复用类型和基础组件，同时保持独立发布、独立页面壳。 |
| 前端数据与表单 | TanStack Query + React Hook Form + Zod | 服务端数据、缓存、表单校验和接口错误可控；不把业务数据长期放在浏览器 localStorage。 |
| 后端 | NestJS + TypeScript + Fastify | 团队协作时模块边界、依赖注入、校验、鉴权和 OpenAPI 文档清晰；Fastify 保持本地和生产性能。 |
| 数据库 | PostgreSQL + Prisma | 本机可用 Docker 一键启动；正式部署可直接迁移，不需要换数据模型。 |
| 接口 | REST JSON + OpenAPI | 方便前后端联调、外部团队审阅和生成测试；实时状态只在需要时补 WebSocket。 |
| 外部依赖 | Provider 适配器 | 将 Booster SSO 与云端技能读取/下载隔离，开发环境可真实跑自己的业务但使用可替换演示实现。 |

## 不采用的方案

- 不继续使用单文件原生 JavaScript 原型：当前 `src/app.js` 已承担多页面、状态、数据和渲染，无法安全承接真实鉴权、协作开发和服务端联调。
- 不选 Next.js：本项目首要是两个受控 Web 应用和本地 demo，不需要 SEO 或服务端页面渲染；Vite 的开发链路更直接。
- 不在第一阶段拆微服务：地图、任务、人设、插件、下载同步等业务还在快速定型。先用有明确模块边界的单体，后续出现独立扩缩容或团队归属需求时再拆分。
- 不让前端直连 Booster 或保存第三方密钥：所有令牌交换、下载鉴权和敏感配置都经 API 服务端处理。

## 后端模块边界

| 模块 | 负责内容 | 外部依赖状态 |
|---|---|---|
| `auth` | 本地演示登录、会话、Booster SSO 回调与用户映射 | Provider 可切换 |
| `maps` | 地图资源元数据、上传、版本和任务引用检查 | 项目自有逻辑 |
| `tours` | 点位、路径、动作、人设选择、任务版本与发布包 | 项目自有逻辑 |
| `personas` | 人设与插件绑定 | 项目自有逻辑 |
| `mcp-plugins` | 配置加密存储、初始化、工具列表刷新 | 需要真实 MCP 验证 |
| `skills` | 官方/云端技能目录、技能元数据、下载代理 | Provider 可切换 |
| `agent-sync` | Agent 查询、下载、更新、删除任务包 | 机器人协议待接入文档 |

## 外部能力的三种状态

外部能力不是“做或不做”的优先级，而是实现状态。每一个 Provider 在配置中明确选择：

| 状态 | 含义 | 可用于 |
|---|---|---|
| `demo` | 本地 Provider，返回稳定测试数据，不访问外网 | 没有凭据时的完整业务演示 |
| `sandbox` | 调用 Booster 或第三方测试环境 | 拿到接入文档、测试账号和测试资源后联调 |
| `production` | 调用正式环境 | 服务器、域名、密钥托管和安全审批完成后 |

业务服务只依赖 `IdentityProvider`、`SkillCatalogProvider` 和 `SkillPackageProvider` 等接口。切换状态不改变页面、业务流程或数据库模型。

## Hichat Hub 设计对齐方式

导览后台的视觉实现以 `docs/design-audit/design-spec.md` 为当前工程入口。Token 和基础 UI 组件将在 `packages/ui` 集中维护；业务页面不能自行硬编码色彩、间距、圆角或 Modal 行为。等待 Hichat Hub 会话产出的新增/修订规范时，只更新 Token 或组件，而不是逐页推翻实现。

## 本机运行形态

```text
浏览器 :5173 (导览后台) ─┐
                         ├── API :3000 ── PostgreSQL :5432
浏览器 :5174 (Agent Web) ─┘          │
                                     ├── Demo Provider（当前）
                                     └── Booster Provider（拿到文档后）
```

当前旧版静态原型继续保留在仓库根目录，作为功能迁移对照；新工程会逐模块替换其能力。

## 接入前需要的材料

### Booster SSO

- 测试环境 issuer / 授权地址 / token 地址 / JWKS 地址和用户信息接口
- 协议与授权方式（OAuth 2.0 / OIDC）、`client_id`、测试密钥和 scopes
- 允许的回调地址规则；若不支持 localhost，需要测试域名或受控隧道规则
- 登出、刷新令牌、用户禁用和错误码约定

### 云端技能读取与下载

- 测试环境 API 地址、鉴权方式和测试账号
- 技能列表、详情、版本、兼容性、下载/签名 URL 的接口文档
- 下载包格式、校验和、过期/撤销规则、限流与重试约定
- 官方技能与账号云端技能的可见范围规则

收到材料后先实现 `sandbox` Provider 并记录每个端点的实测结果；失败时保留错误证据，不把失败静默伪装为成功。
