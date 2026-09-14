# 导览平台接口部署就绪度

状态：`2026-09-11` 基于当前 API 代码和本地 OpenAPI（`/api-docs-json`）核对。本文件是正式部署评审的唯一接口状态基线；它区分“代码存在”与“可安全上线”，不把历史方案当作已交付能力。

API 前缀为 `/api/v1`。

## 1. 状态定义与结论

| 状态 | 含义 | 当前结论 |
| --- | --- | --- |
| READY | 已实现，且不依赖缺失的业务能力；完成基础环境配置后可部署 | 仅健康检查可作为存活探针使用 |
| NEEDS_WORK | 端点和核心逻辑已实现，但正式环境还缺少安全、身份、持久化或真实外部 Provider 能力 | 地图、导览任务、人设、技能、MCP、Agent 资源同步 |
| NOT_IMPLEMENTED | 当前 OpenAPI 和控制器均没有实现，必须新开发 | 登录认证、就绪探针、真实技能接入、运行控制等 |
| CONFIRM | 不应由代码自行假设，需产品、平台或外部系统负责人确认后才能完成实现或上线配置 | SSO、存储、MCP 出网、Agent 桥接等 |
| DEMO_ONLY | 仅用于本地演示；正式环境不得对外开放 | 重置演示数据 |

**正式部署结论：当前不能把业务 API 直接开放给真实用户。** 所有业务接口目前都由 `DEMO_USER_EMAIL` 固定解析当前用户，尚未接入请求级 SSO、Session 或 JWT 身份。即使资源服务里已包含 owner 校验，在多用户生产环境中也不能成立。

## 2. 已注册接口与部署状态

### 2.1 READY

| 方法 | 路径 | 用途 | 上线边界 |
| --- | --- | --- | --- |
| GET | `/health` | 进程存活检查 | 可用作 liveness probe；不能证明数据库、文件存储或外部依赖可用 |

### 2.2 NEEDS_WORK：已有实现，正式部署前仍需补齐

| 接口组 | 当前端点 | 当前已具备能力 | 正式部署还需开发/加固 |
| --- | --- | --- | --- |
| 地图 | `GET/POST /maps`、`GET/PATCH/DELETE /maps/:mapId`、`GET /maps/:mapId/preview` | ZIP 地图包上传、校验、预览、重命名、引用保护删除 | 接入真实身份；将本地文件存储替换为持久卷或对象存储；补备份、容量、清理和下载策略 |
| 导览任务 | `GET/POST /tour-tasks`、`GET/PATCH/DELETE /tour-tasks/:taskId` | 任务、点位、路径、任务动作、人设关联及版本冲突校验 | 接入真实身份；确认任务交付/发布的流程；接入真实技能校验后再允许生产写入 |
| 人设 | `GET/POST /personas`、`GET/PATCH/DELETE /personas/:personaId` | 系统默认人设、自定义人设、插件关联、删除后的任务回退 | 接入真实身份；确认默认人设的运营归属和迁移策略 |
| 技能目录 | `GET /skills` | 按来源和兼容性筛选目录 | 当前永久使用 `DemoSkillCatalogProvider`；需实现真实技能库 Provider、失败降级和兼容性校验 |
| MCP 插件 | `GET/POST /mcp-plugins`、`GET/PATCH/DELETE /mcp-plugins/:pluginId`、`POST /mcp-plugins/:pluginId/refresh-tools` | 配置插件、加密保存凭据、调用 `initialize` 和 `tools/list` | 增加 SSRF/出网策略、HTTPS/域名白名单、重定向限制、审计与超时策略；生产必须配置强随机 `MCP_CREDENTIALS_KEY`，不能使用本地回退密钥 |
| Agent 资源同步 | `GET /agent/tasks`、`POST/DELETE /agent/tasks/:taskId/download` | 查看同步状态、下载任务和地图资源包、记录下载版本 | 设备身份、设备授权和撤销；资源包传输/校验策略；避免大 PCD/PNG 以 Base64 嵌入 JSON 的规模与内存风险 |

上述接口的“需要开发”不是纯文档项，而是正式环境阻塞项。身份接入完成前，不应以 API Gateway、前端传 owner ID 或隐藏入口来替代服务端认证。

### 2.3 DEMO_ONLY

| 方法 | 路径 | 当前用途 | 正式部署要求 |
| --- | --- | --- | --- |
| POST | `/demo/reset` | 重置本地演示数据 | 禁止在公网/生产路由注册；如保留，仅限受审计的内部运维命令 |

## 3. NOT_IMPLEMENTED：需要新开发的接口

以下不是“配置一下即可”，当前没有对应的正式接口实现。

| 能力 | 建议接口或协议 | 说明 |
| --- | --- | --- |
| 用户认证与身份 | `GET /auth/login`、`GET /auth/callback`、`POST /auth/refresh`、`POST /auth/logout`、`GET /me` | 对接 Booster SSO/OIDC，验证 token 并映射 `User.externalId`；所有业务 API 据此解析当前用户 |
| 服务就绪 | `GET /ready` | 检查数据库、地图存储、关键密钥和必须外部依赖；与 `/health` 的进程存活检查分开 |
| 技能详情与交付 | `GET /skills/:skillId`、技能版本/兼容性校验、技能包下载/撤销 | 任务保存和 Agent 使用真实技能时所需；当前只提供演示目录列表 |
| 地图资源传输 | 原始资源下载、签名上传/下载 URL 或分片上传 | 当前管理端仅有预览读取；Agent 下载将资源内嵌在 JSON。大文件或跨网络部署前需要专用传输合同 |
| 任务生命周期 | 发布、撤回/归档、版本历史、回滚 | 当前任务只有 CRUD；是否需要这些状态要先由产品确认 |
| Agent 运行协议 | 任务下发、启动/暂停/继续/停止、执行结果、位置/状态上报、实时通道 | 当前 Agent 只做资源同步，不控制机器人导航、播报、问答或手势执行 |
| 权限与审计 | 组织、角色、成员、资源授权、审计日志 | 当前只有资源 owner 模型；没有多角色、组织隔离或可追溯的运维接口 |

## 4. CONFIRM：上线前必须人工确认

| 主题 | 需要确认的问题 | 责任方建议 |
| --- | --- | --- |
| SSO | Issuer、Client ID、回调地址、scope、token 有效期、刷新/退出机制、组织与账号映射规则 | 平台身份/Booster 团队 + 后端 |
| 数据库与迁移 | 生产数据库地址、备份恢复、迁移窗口、演示数据是否导入、系统默认人设归属 | 运维/DBA + 产品 + 后端 |
| 地图存储 | 使用持久卷还是对象存储、数据区域、容量、生命周期、备份、访问 URL 和 CDN/内网策略 | 基础设施 + 安全 + 后端 |
| MCP 外联 | 允许访问的 MCP 域名/IP、是否仅 HTTPS、代理/出口、私网服务访问边界、凭据轮换和审计要求 | 安全 + 网络 + 产品 |
| 技能库 | 真实接口地址、稳定技能 ID、版本/兼容性语义、下线策略、技能包交付方式 | 技能平台 + 机器人团队 |
| Agent/机器人 | 稳定 `deviceId` 的来源、设备注册授权、可访问网络、文件落盘目录、资源校验、离线/升级行为 | Agent/机器人 + 运维 |
| 对外运行范围 | 是否需要任务发布审批、归档、回滚、多人协作、审计，以及机器人执行控制和遥测 | 产品 + 交付/运营 |
| 运维安全 | 域名、TLS、CORS、限流、WAF、日志脱敏、监控告警、密钥托管及事故响应 | 安全 + 基础设施 |

未确认上述事项时，不建议通过环境变量猜测生产策略，尤其不得开放任意 MCP 地址、共用演示身份或将资源目录放在容器临时磁盘。

## 5. 推荐上线顺序

1. 完成 SSO 请求认证、`/me` 与 owner 迁移，移除对 `DEMO_USER_EMAIL` 的生产依赖。
2. 确定数据库和地图持久化方案，增加 `/ready`，完成备份与恢复演练。
3. 为 MCP 完成出网安全控制和生产密钥托管；未完成时禁用插件创建和刷新。
4. 接入真实技能库，确认任务保存、技能兼容性和 Agent 交付合同。
5. 通过访问控制、审计、负载与故障演练后，依次开放地图、人设、任务、插件和 Agent 资源同步接口。
6. `POST /demo/reset` 保持仅开发环境可用，不进入生产网关路由。

## 6. 代码核对位置

- 路由与 Swagger：`services/api/src/main.ts` 及各 `*.controller.ts`。
- 当前演示身份：`services/api/src/identity/current-user.service.ts`。
- 演示技能 Provider：`services/api/src/skills/skills.module.ts`。
- 地图本地存储：`services/api/src/maps/map-storage.provider.ts`。
- MCP 外联与凭据：`services/api/src/mcp-plugins/mcp-plugins.service.ts`。
- Agent 资源包与设备同步：`services/api/src/agent/agent.service.ts`。

接口行为、字段和错误码的详细合同仍以 Swagger `/api-docs` 和共享契约 `packages/contracts` 为准；正式发布前应重新运行本文件的核对流程，避免文档状态滞后于代码。
