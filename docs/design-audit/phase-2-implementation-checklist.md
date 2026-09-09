# 阶段二正式工程实施清单

> 收尾记录：2026-09-09
>
> 本清单记录阶段二正式 React 工程的实际完成状态。视觉与交互取值以 `design-spec.md` v1.1 和 `interaction-matrix.md` 为权威；旧原型 `src/*` 不属于阶段二实现范围。

## 1. 前置状态

- [x] `verify-phase1.ps1` 返回 0，阶段一设计门禁通过。
- [x] 正式工程边界确认：`apps/console`、`packages/ui`、`packages/contracts`、`services/api`。
- [x] 根目录 `index.html`、`src/app.js`、`src/styles.css` 仅用于核对旧原型行为，未被阶段二改写。

## 2. 正式入口与边界

| 职责 | 当前入口 | 状态 |
|---|---|---|
| React 挂载与全局样式 | `apps/console/src/main.tsx` | 已加载 Console 样式和七类共享组件 CSS |
| 页面壳、路由、页面组合 | `apps/console/src/app.tsx` | 已完成当前阶段路由与页面状态 |
| 页面级布局 | `apps/console/src/styles.css` | 已清理与共享组件重复的基础 CSS |
| 设计 Token | `packages/ui/src/tokens.css` | 已作为共享颜色、排版、间距、圆角、边框和浮层阴影来源 |
| 共享组件 | `packages/ui/src` | Button、Table、Tag、Empty、Popover、Confirm Modal、Toast 均已实现并接入 |

## 3. 分批实施状态

### P2-01：Token 基线（已完成）

- [x] `design-spec.md` v1.1 核心 Token 映射到 `packages/ui/src/tokens.css`。
- [x] 保留 `--guide-*` 命名空间，页面不重复定义基础 Token。

### P2-02：App Shell 与页面标题区（已完成）

- [x] 64px Topbar、一级导航、1344px 最大内容宽度和响应式 gutter 已对齐。
- [x] 页面标题区包含规范说明和主操作位。
- [x] 保留路由、健康状态查询和账户入口语义。

### P2-03：共享基础组件（已完成）

- [x] Button：Primary、Secondary、Text、Icon、Danger，以及 Hover、Focus、Disabled、Loading。
- [x] Table：表头、表体、操作列、行 Hover/Focus、键盘行激活。
- [x] Tag：五种语义、紧凑尺寸、长文本 title。
- [x] Empty state：视觉区、标题、说明、可选 action、渐变和窄屏适配。
- [x] Popover：外部点击、Escape、焦点返回、ARIA 关联、边缘贴合和窄屏约束。
- [x] Confirm Modal：402px 默认宽度、遮罩、Escape、焦点约束/恢复、ARIA、危险确认。
- [x] Toast：四种语义、自动消失、手动关闭、暂停计时、ARIA live、堆叠和窄屏约束。

### P2-04A/B/C：导览任务列表与共享组件接入（已完成）

- [x] 保持 TanStack Query 与 `tourTaskListSchema` 数据边界。
- [x] 任务表格使用任务名称、地图、点位数量、状态、创建时间和操作列。
- [x] 行点击进入详情；编辑和更多操作阻止冒泡；更多菜单仅提供删除。
- [x] 删除确认通过共享 Confirm Modal，未接入删除 API 时明确提示“未执行”。
- [x] 共享 CSS 已从 `main.tsx` 统一加载。
- [x] `/tour-tasks` 已消费共享 Button、Table、Tag、Empty contract；Popover、Modal、Toast 通过 `ui-adapters.ts` 接入。

### P2-05：后续页面（已完成当前阶段范围）

- [x] `/maps`：地图资产管理入口和 honest Empty state。
- [x] `/voice/personas`：语音人设入口和 honest Empty state。
- [x] `/voice/plugins`：插件管理入口和 honest Empty state。
- [x] 三个页面均保留清晰的接口未接入说明，没有伪造数据或写入行为。

### P2-06：导览任务编辑流（已完成当前阶段范围）

- [x] `/tour-tasks/new` 三步本地编辑流：基本信息、点位设置、动作编排。
- [x] 支持前进/后退、步骤状态、点位添加、动作选择和摘要预览。
- [x] “保存草稿”明确提示持久化接口尚未接入，不伪造保存成功。

### P2-07：浏览器与可访问性验收（部分完成，限制已记录）

- [x] CUA 已验证 `/tour-tasks/new` 三步流程可操作并正确渲染。
- [x] CUA 已验证 `/maps`、`/voice/personas`、`/voice/plugins` 标题和 Empty state。
- [x] 上述浏览器检查无 console error；路由 HTTP 200。
- [ ] `/tour-tasks` 的真实 populated 数据态未完成联调：本机 PostgreSQL/Docker 不可用。
- [ ] 最后的“保存草稿”提示点击未取得可靠工具证据，原因是浏览器工具包装层临时异常；代码路径已静态验证。

### P2-08：最终收尾（已完成）

- [x] 删除 Console 中与共享组件重复的按钮、菜单、弹窗、状态标签、提示和空状态基础 CSS。
- [x] 同步本清单与 `phase-2-component-adoption-audit.md`。
- [x] 完成全仓 `pnpm typecheck`、`pnpm build`、`pnpm lint`。
- [x] 完成 `verify-phase1.ps1`。
- [x] 无新增未授权业务规则、依赖、数据库写入或旧原型改动。

## 4. 验收命令结果

| 命令 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 通过（此前已验证） |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过 |
| `pnpm lint` | 通过 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File .\\docs\\design-audit\\verify-phase1.ps1` | 通过 |

已确认 HTTP 200：`/tour-tasks`、`/tour-tasks/new`、`/maps`、`/voice/personas`、`/voice/plugins`、`/runtime`。

## 5. 剩余限制与后续入口

- 当前 API `127.0.0.1:3000` 不可用，因此无法完成真实数据和 mutation 联调。
- 本机 PostgreSQL 与 Docker Desktop daemon 不可用，因此无法验收 populated 数据态。
- Maps、Personas、Plugins 的后端 API 尚不存在；当前页面保持 honest Empty state。
- 下一阶段若继续，应先补齐后端契约和数据库环境，再做真实数据联调；在此之前不应继续扩展前端业务功能。
