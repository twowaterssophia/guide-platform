# P2-04 共享组件接入审计

> 审计日期：2026-09-09
>
> 本文记录 P2-04A/B/C 完成后的运行时消费情况。审计范围为 `apps/console/src` 与 `packages/ui/src`；不修改旧 `src/*`、业务需求文档、生产环境或数据库数据。

## 1. 结论摘要

- Console 通过 `apps/console/src/main.tsx` 统一加载 `styles.css` 以及 Button、Table、Tag、Empty、Popover、Modal、Toast 的共享 CSS。
- `/tour-tasks` 已使用共享 `guide-button`、`guide-table`、`guide-tag`、`guide-empty` class contract；查询仍由 TanStack Query 驱动，数据仍由 `tourTaskListSchema` 解析。
- Popover、Confirm Modal、Toast 由 `apps/console/src/ui-adapters.ts` 管理 controller 生命周期，React 卸载时执行 `destroy`，避免遗留 DOM 和事件监听。
- Console 页面级 CSS 已删除旧的重复按钮、表格、状态标签、菜单、弹窗、提示和空状态基础选择器，仅保留页面布局与编辑器特有样式。
- 未接入后端的页面和操作均保持 honest Empty/未执行提示，没有伪造数据或持久化结果。

## 2. 共享组件消费对照

| 组件 | 当前消费位置 | 验证结论 |
|---|---|---|
| Button | `/tour-tasks`、`/tour-tasks/new` 及共享 Modal/Popover | 使用 `guide-button-*` 变体；图标按钮带 aria-label/title |
| Table | `/tour-tasks` | 使用共享表格 class；行 click、Enter/Space 激活和操作列冒泡隔离保留 |
| Tag | `/tour-tasks` 任务列表和详情 | `DRAFT/PUBLISHED/ARCHIVED` 映射到 info/success/default，并提供 title |
| Empty | `/tour-tasks`、`/maps`、`/voice/personas`、`/voice/plugins` | 使用共享空状态结构；未接入 API 时展示明确说明 |
| Popover | `TaskMenuAdapter` | controller 负责 outside click、Escape、ARIA 和销毁；删除回调保留原 trigger |
| Confirm Modal | `useConfirmModalController` | controller 负责遮罩、Escape、焦点约束/恢复、ARIA 和销毁 |
| Toast | `useToastStackController` | controller 负责 live region、自动消失、暂停、手动关闭和堆叠 |

## 3. 关键实现证据

### 3.1 CSS 入口

`apps/console/src/main.tsx` 是唯一的 Console 全局 CSS 入口，依次加载页面样式和七类共享组件样式。共享 Token 仍由 `apps/console/src/styles.css` 的 `@import` 提供。

### 3.2 React adapter 生命周期

`apps/console/src/ui-adapters.ts` 的三个 adapter 对 imperative controller 做了 React 生命周期封装：

- `TaskMenuAdapter` 为每个任务创建 trigger/content，监听删除，并在 effect cleanup 中 `destroy/remove`。
- `useConfirmModalController` 在 `open` 时创建并打开 modal，关闭或依赖变化时销毁；回调通过 ref 保持最新。
- `useToastStackController` 创建单一 stack，支持初始化前排队，卸载时销毁。

### 3.3 页面级重复 CSS 清理

`apps/console/src/styles.css` 仅保留 App Shell、页面标题区、任务详情和三步编辑器等页面级规则。基础按钮、表格、标签、空状态、菜单、弹窗、提示的视觉契约统一来自 `packages/ui/src`。

## 4. 行为与可访问性验收

- CUA 已验证 `/tour-tasks/new` 三步编辑流，以及 `/maps`、`/voice/personas`、`/voice/plugins` 的标题和 Empty state。
- 浏览器检查的相关页面无 console error，路由均返回 HTTP 200。
- Popover、Modal 的 Escape、outside click、焦点恢复和 ARIA 行为由共享 controller contract 覆盖；Console adapter 已正确传入配置和 trigger。
- populated 任务数据态、真实删除 mutation、以及完整窄屏截图仍受 PostgreSQL/Docker/API 环境限制，不能宣称已完成联调。

## 5. 验收命令

```powershell
pnpm typecheck
pnpm build
pnpm lint
powershell -NoProfile -ExecutionPolicy Bypass -File .\\docs\\design-audit\\verify-phase1.ps1
```

以上命令在 2026-09-09 收尾时均通过。

## 6. 审计结论

P2-04A/B/C 的共享组件接入已完成，当前没有需要继续拆分的前端接入工作。后续工作应以 API/数据库可用为前置条件，先完成真实数据契约和 mutation，再进入下一轮产品功能开发。
