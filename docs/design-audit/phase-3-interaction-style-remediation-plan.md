# 阶段三：交互与样式修复计划

状态：执行中；`D3-01`、`D3-02`、`D3-03`、`D3-04` 已完成，包含地图列表/详情、任务列表/独立详情和真实三步编辑；
`D3-05` 等待 MCP API，`D3-06` 在剩余主线完成后做最终验收。
唯一验收基准为 `design-spec.md` v1.1 与 `interaction-matrix.md` v1.0。

## 已确认的实施边界

- 旧 `src/app.js` 只作为已验证交互能力的参考；不迁移其 mock 数据或 `localStorage` 持久化。
- 任务详情及完整编辑在真实任务详情 API 可用后一次完成，不再保留列表页内嵌的 summary 详情作为过渡实现。
- 允许新增 Playwright，用于桌面和窄屏的视觉回归与交互 smoke test。
- 地图文件协议已采用 `.pcd + .png + .json`；本地地图上传、预览和引用保护已接入真实 API。正式容量、对象存储和生产身份仍是联调项。

## 执行顺序

| 批次 | 状态 | 范围 | 完成条件 |
| --- | --- | --- | --- |
| D3-01 | 完成 | Shell、语音二级导航、账户 Popover、Confirm Modal、Toast、表格和基础表单几何 | 使用真实本地 API 的桌面与 390px Playwright 回归通过；确认窗口、账户菜单及页面截图已复核。 |
| D3-02 | 完成 | 人设列表、详情、创建和编辑 | 使用真实 Personas/Skills API；更多操作菜单、未保存保护、自定义音色选择、分组技能 Popover 和 Toggle 已通过桌面/390px 回归。 |
| D3-03 | 完成 | 地图列表/详情与任务列表/独立详情 | 地图和任务均使用真实 API；任务行可进入独立详情，删除有确认、级联和 Toast。 |
| D3-04 | 完成 | 地图画布、点位、路径、动作和固定操作栏 | 恢复旧版可用的画布、拖拽、排序能力，并绑定真实任务写入。 |
| D3-05 | 等待 MCP API | 插件管理与账户操作 | 宽 Modal、动态认证字段、刷新反馈、真实账户菜单项。 |
| D3-06 | 待开始 | 回归与验收 | Playwright 桌面/390px、键盘焦点、无障碍状态、真实 API 联调与视觉差异记录。 |

## 当前发现与处置

| 问题 | 依据 | 处置批次 |
| --- | --- | --- |
| 语音模块没有人设/插件二级导航 | 规范 2.3 | D3-01 |
| 账户按钮无菜单行为 | 交互矩阵：账户菜单为 Dropdown Popover | D3-01 |
| 危险确认可由遮罩、Esc、关闭按钮绕过 | 规范 6.8 / 12.5 | D3-01 |
| Toast 位于右上，规范为顶部居中 | 规范 6.9 | D3-01 |
| 表格被外层卡片包围 | 规范 6.4 | D3-01 |
| 人设使用原生 Select、技能卡片网格且离开不保护草稿 | 规范 8.3 / 交互矩阵 | D3-02 |
| 任务行在列表下方嵌入详情 | 规范 8.1；详情 API 未就绪 | D3-03（已修复为独立详情路由） |
| 任务编辑使用自由文本地图和占位动作 | 规范 8.5；已改为真实地图、人设、点位、路径和动作编排 | D3-04（已修复） |
| 地图曾为 honest empty state | 地图 API 已就绪；插件 API 仍未就绪 | D3-03 / D3-05 |

## D3-03 地图子线验收

- 地图文件合同记录在 `docs/migration/map-file-contract.md`：PCD 源文件、PNG 二维占据栅格和 JSON 配准元数据必须成套上传。
- `/maps` 已接入真实 API，支持加载、空、错误、列表、添加地图 Modal、上传 loading、草稿放弃确认和成功 Toast。
- `/maps/:mapId` 已接入独立详情页，显示预览或不可预览状态、PCD 元数据、坐标系、分辨率、原点和引用任务数。
- 地图改名使用版本号；删除使用 Confirm Modal；被任务引用时保留 `409 RESOURCE_IN_USE` 并显示就近 Toast。
- `pnpm --filter @guide/api test`：12 项通过；地图格式、阈值、存储读写及清理均有测试。
- `pnpm exec playwright test e2e/console/d3-03-maps.spec.ts`：7 项通过、1 项仅 desktop 合理跳过；覆盖 desktop/390px 上传、预览、改名、删除保护和表格横向滚动。
- 视觉复核：地图列表、402px 上传 Modal、地图详情和 390px 列表；文件选择器改为中文可访问控件，未发现控件折行或窄屏表格挤压。

## D3-03 任务子线验收

- `/tour-tasks` 使用真实 `GET /tour-tasks`；点击任务行进入独立 `/tour-tasks/:taskId` 详情页，不再在列表下方嵌入 summary 面板。
- `POST/PATCH/DELETE /tour-tasks` 已接入真实 Prisma 事务；创建和更新校验地图/人设归属、技能可用性、连续路径和 `expectedVersion`，删除由数据库级联清理点位、路径和动作。
- 详情页显示地图、人设、状态、版本、点位坐标/朝向、点位动作和路径动作；列表与详情删除均使用不可由遮罩或 Esc 绕过的 Confirm Modal，成功后显示顶部居中 Toast。
- `pnpm --filter @guide/api test`：17 项通过；`pnpm exec playwright test e2e/console/d3-03-tour-tasks.spec.ts`：desktop/mobile 共 4 项通过。已复核 1440px 与 390px 截图，长动作文本自然换行且无横向溢出。

## D3-04 验收

- `/tour-tasks/new` 与 `/tour-tasks/:taskId/edit` 共用真实三步编辑器；基本信息从 Maps、Personas API 加载，创建调用 `POST`，编辑使用 `expectedVersion` 调用 `PATCH`。
- 地图选择使用带搜索和焦点约束的 Dialog；人设、动作类型与技能分别使用符合规范的 Popover，技能按官方/云端分组。
- 点位支持地图点击添加、标记拖动、坐标/朝向输入、删除和拖拽排序；点位重排或删除会重建连续路径。
- 点位与路径动作可添加、编辑、删除和拖拽排序；路径不提供技能动作，语音与技能必填项会阻止无效保存。
- 任务编辑提供固定底部操作栏、未保存草稿保护、成功/失败 Toast 和稳定编辑 URL；已有任务暂不允许换图，避免坐标失效。
- `pnpm exec playwright test e2e/console/d3-04-task-editor.spec.ts`：5 项通过、1 项仅 desktop 合理跳过；覆盖桌面/390px 创建、点位与动作排序持久化、草稿保护、编辑预填和版本更新。
- `pnpm test:console:e2e`：33 项通过、3 项按视口条件合理跳过。1440×870 与 390×844 截图已复核；修复窄屏 Y 坐标输入框被压缩后，各数值输入宽度为 190px，动作长文本正常换行，操作栏未遮挡末尾内容。

## D3-01 验收

- 语音路由显示 176px 二级导航，当前项为浅灰底、深色 600 字重。
- 账户入口可打开/关闭 Popover，支持外部点击与 Esc，关闭后焦点回到触发按钮。
- Confirm Modal 不显示关闭按钮，遮罩和 Esc 不会隐式取消危险操作。
- Toast 顶部居中，表格使用开放布局和行分割线。
- 所有基础输入控件使用 38px 高度、3px 圆角和统一 focus 样式。
- `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build` 通过；Playwright 通过 Vite 同源代理连接真实本地 API，并记录桌面和 390px 证据。

## D3-01 验收证据

- `pnpm test:console:e2e`：9 项通过、1 项仅在 desktop 合理跳过；测试会自动启动隔离的 4300 Vite 服务，覆盖桌面与 390px 视口下的
  语音二级导航、账户菜单关闭/焦点恢复、危险确认的 Esc 与遮罩保护、移动表格滚动及核心路由控制台错误。
- Playwright Chromium 已作为根开发依赖安装，`playwright.config.ts` 和 `e2e/console/` 提供可重复的回归入口。
- 视觉检查已查看 1440×870 任务列表/账户菜单/Confirm Modal、语音人设页和 390×844 人设页；未发现
  文本遮挡、按钮折行或表格列挤压。

## D3-02 验收

- 人设列表只保留“更多操作”入口，菜单内提供编辑和删除；详情页保留主编辑按钮，删除收纳到同一菜单。
- 音色使用带 `listbox` 语义的自定义 Select；自定义技能使用按官方/云端分组的多选 Popover，支持完成、Esc、外部点击和焦点回收。
- 技能 Popover 根据视口空间自动向上或向下展开，不会在首屏底部被裁切；预置技能使用 Toggle 视觉并保留原生 checkbox 语义。
- 创建/编辑页使用 `#F5F7FF → #FAFEFF` 页面渐变；取消、返回、一级导航和浏览器离开会保护未保存草稿。
- 放弃草稿和删除人设均使用不可由遮罩或 Esc 隐式执行的 Confirm Modal；保存成功不会误触发草稿保护。
- `pnpm test:console:e2e` 总计 17 项通过、1 项仅在 desktop 合理跳过；Playwright 使用真实 Personas/Skills API 创建并清理测试人设，覆盖桌面与 390px 的选择器、分组、视口边界、菜单、详情删除入口和草稿保护。
