# Figma 设计审计

## 1. 访问记录

- 文件名称：`Hi Chat Design`
- 文件地址：`https://www.figma.com/design/KbiuPCrglwVLTDsKONkC9A/Hi-Chat-Design`
- 当前权限：只读，可查看和评论，不能编辑。
- 观察方式：Figma 网页只读画布与图层树；未执行登录、编辑、评论或导出写入操作。

## 2. 已确认的文件结构

Figma 文件包含至少以下页面：

- `Page 3`
- `Page 1`
- `确定版本`

在 `Page 3` 的图层树中已观察到以下命名，说明目标稿包含一套完整的后台和基础组件样例：

- `首页`
- `空状态`（至少两处）
- `创建人设2`（至少两处）
- `Modal`（多处）
- `Button`
- `Alert`（多处）
- `Table cell`
- `Group 2090056462`
- 若干截图和 Section 图层

这说明迁移时应优先复用“组件族和状态”，而不是只复制某一张首页截图。

## 3. 已观察的画板证据

### 首页

- 画板可见尺寸：`1440 × 870`。
- 选中首页时，属性面板显示浅色渐变相关颜色：`#F5F5F5`、`#F9FEFF`。
- 首页在画布上以独立画板存在，后续应把它视为页面壳和整体背景的参考，而不是导览后台业务页面的直接内容。

### 组件集合

- 目标稿单独提供空状态、创建人设、Modal、Alert、Button、Table cell 等样例。
- 这些命名与导览后台现有的空状态、表格、创建人设、删除确认、Toast / Alert、按钮有明显对应关系。
- Figma 中存在设计评论“描边颜色需加重”，因此边框 / 描边不能只按截图中的低对比度直接复刻，需要在后续逐组件确认。

### 当前可访问限制

- Figma 画布初始缩放约为 2%–4%，可确认页面与图层结构，但无法可靠读取所有字号、间距和单个组件的精确属性。
- 后续若要进入实现阶段，必须在可稳定访问时补做 100% 或接近原尺寸的组件读数。
- 任何未取得高倍数证据的数值都应继续标记为“待核对”，不能直接当作最终 Token。

## 4. 第一版组件分组

| 目标稿分组 | 需要提取的维度 | 导览后台映射 |
|---|---|---|
| 页面壳 / 首页 | 顶部导航、内容最大宽度、背景、标题区、主操作位置 | 全部后台页面 |
| Button | 类型、尺寸、圆角、字重、图标间距、禁用/悬停/按下 | 新建、保存、编辑、取消、删除、刷新 |
| Table cell | 表头、行高、分隔线、操作列、长文本、Hover | 任务、地图、人设、插件列表 |
| 空状态 | 插图 / 图标、标题、说明、CTA 位置 | 无任务、无地图、无人设、无插件 |
| 创建人设 | 表单区块、字段、底部操作、返回和取消 | 人设创建 / 编辑 |
| Modal | 遮罩、宽度、标题、内容区、Footer、关闭规则 | 添加地图、添加插件、确认操作 |
| Alert | 信息层级、危险色、动作按钮、关闭方式 | 删除、放弃编辑、退出登录、重置 |

## 5. 后续高倍数核对清单

下次 Figma 可稳定访问时，按以下顺序核对，避免遗漏：

1. 选中首页：记录页面背景、内容宽度、顶部高度、左右边距、标题层级。
2. 选中 Button：记录所有 Variant、字号、字重、高度、水平内边距、圆角和状态色。
3. 选中 Table cell：记录表头、行、分隔线、操作列和 Hover / Selected。
4. 选中空状态：记录图形尺寸、文案间距、CTA 尺寸和垂直居中规则。
5. 选中创建人设：记录字段间距、分组分隔线、控件高度和底部操作栏。
6. 逐个选中 Modal / Alert：记录宽度、内边距、标题与正文间距、按钮顺序、遮罩透明度。
7. 检查 Prototype 连线：记录哪些动作打开 Modal、Popover、独立页面或 Toast。
8. 记录设计评论和未决项，尤其是描边对比度、关闭规则和移动端行为。

## 6. 本轮只读核对结果（2026-09-08）

本轮没有编辑、评论、导出或请求编辑权限；只读取 Figma 属性、画布截图和 Prototype 演示。

### 6.1 Button

选中图层：`Button`。

| 属性 | 读数 | 证据等级 |
|---|---|---|
| Flow | Horizontal | A：Figma Properties |
| Width | Hug 148px | A：Figma Properties |
| Height | Hug 44px | A：Figma Properties |
| Gap | 12px | A：Figma Properties |
| 视觉状态 | 画布可见取消 / 确认双按钮实例 | B：Figma screenshot |

按钮的文字字号、字体、圆角和完整 Variant 颜色没有在只读属性面板中暴露为可靠数值；因此这些值在 `design-spec.md` 中明确标为实施映射或产品决策，不伪装成 Figma 实测值。

### 6.2 Table cell

选中图层：`Table cell`。

| 属性 | 读数 | 证据等级 |
|---|---|---|
| Flow | Horizontal | A：Figma Properties |
| Width | Fixed 155px | A：Figma Properties |
| Height | Fixed 64px | A：Figma Properties |
| Padding | 16px | A：Figma Properties |
| Gap | 16px | A：Figma Properties |
| Bottom border | 0.5px | A：Figma Properties |
| Bottom border color | `#BCBCBC` at 16% | A：Figma Properties |

### 6.3 Empty state 与 Create Persona

| 图层 | 读数 | 证据等级 |
|---|---|---|
| `空状态` | 1440×870；Linear Gradient `#F5F5F5 → #F9FEFF` | A：Figma Properties |
| `创建人设2` | 1440×870；Linear Gradient `#F5F7FF → #FAFEFF` | A：Figma Properties |

这两个图层证明页面级背景并非单一纯白：列表空状态使用灰白渐变，人设页面使用更偏冷的淡蓝渐变。实施时只能把渐变放在对应页面壳，不得扩散到所有组件。

### 6.4 Modal 变体

共读取到 8 个名为 `Modal` 的图层，发现以下可复用变体：

| 变体读数 | 共同属性 | 证据等级 |
|---|---|---|
| 372×578px | Vertical；Radius `Utilities/Border Radius/3XL`；Padding 32px；Gap `Utilities/Spacing/7`；Background `#FFFFFF` | A |
| 372×607px | 同上 | A |
| 372×589px | Radius `3XL`；Background `#FFFFFF`；Auto Layout 信息部分隐藏 | A |
| 372×396px | Vertical；Radius `3XL`；Padding 32px；Gap `Spacing/7`；Background `#FFFFFF` | A |
| 758×546px | Vertical；Radius `3XL`；Padding 32px；Gap `Spacing/7`；Background `#FFFFFF` | A |
| 711×517px | Vertical；Radius `3XL`；Padding 32px；Gap `Spacing/7`；Background `#FFFFFF` | A |
| 402×178px | Radius `3XL`；Background `#FFFFFF` | A |

`3XL` 与 `Spacing/7` 是 Figma 语义 Token，当前只读面板没有展开它们的原始数值。后续实现使用规范中的明确实施映射，并保留来源名，避免把 6px / 24px 等猜测写成 Figma 原值。

### 6.5 Alert / Dropdown surface 变体

共读取到 3 个名为 `Alert` 的图层：

| 变体 | 读数 | 证据等级 |
|---|---|---|
| Accent alert | Horizontal；195×48px；Radius `Utilities/Border Radius/XL`；Top/Bottom 12px；Left/Right `Spacing/4`；Gap `Spacing/3`；Fill `#6E63FF` at 15% | A |
| Text alert | Horizontal；195×48px；Radius 12px；Gap 10px；主文字 `#262626`；Shadow `0 12px 16px -4px #101828` at 4% | A |
| Dropdown surface | Horizontal；195×48px；Radius 12px；Border 0.5px；Background `#FFFFFF`；Border `#F4F4F4`；同一阴影 | A |

这组证据支持“短反馈 / 下拉浮层 / 需要决定的确认”分成不同表面，不应把所有反馈都实现成同一种 Toast。

### 6.6 Prototype 只读核对

本轮针对唯一阻塞又追加了一次只读核对，采用三种方法：

1. Figma 编辑器的图层树和 Properties 面板：确认页面与组件命名、属性和变体。
2. Figma 画布截图：确认按钮、页面壳、空状态和视觉层级。
3. Figma Prototype 演示页：通过 `Previous frame / Next frame` 逐帧查看，并在 `Options → Advanced settings` 中确认 `Show hints on click` 为 checked；确认原型至少有 52 个 frame（可从 46/52 步进到 52/52）。

追加尝试记录：

- 方法 A：在编辑器打开 `Prototype view`，选择 `Present`，再选中 `首页`、`Button`、`创建人设2` 等节点。结果：右侧仍只显示 Properties（尺寸、渐变、Auto Layout），没有 Interaction details、触发器或连接目标。
- 方法 B：在 Prototype 演示页 `Options → Advanced settings` 检查 `Show hints on click`。结果：设置确实为 checked，但画布无障碍树仍只暴露 `Previous frame / Next frame / Restart`，未出现热点名称或动作说明。
- 方法 C：在 Prototype 页使用 `Previous frame / Next frame` 逐帧浏览至 52/52。结果：可确认 frame 序列和加载占位，但帧之间没有可定位到源节点的交互标签或连线元数据。

结果：Prototype 演示页的画布内容可见，但无障碍树只暴露 Prototype 控件，没有暴露画布热点名称、连线目标或触发动作；多帧切换中部分帧出现加载占位，无法可靠建立“某个业务控件 → 某个具体 Modal / Popover / 页面”的逐项连线表。

状态：**非关键范围（不阻塞阶段一）**。交互矩阵中的具体目标形态已按 Hi Chat 的组件语法和导览业务复杂度做成产品决策；本任务不要求逐条复刻 Prototype 的圆形连线、热点名称或连线动画。

如后续希望做逐条 Prototype 对照，可另行补充“源 → 触发 → 目标”节点清单；该信息不是阶段一或阶段二实施的前置条件。

## 7. 证据使用规则

- A：可以直接进入 Token / 组件规范。
- B：可以用于页面结构和视觉方向，不可单独推出精确数值。
- P：产品决策；必须写明理由和影响。
- BLOCKED：关键来源不可可靠读取；保留阻塞，不以猜测填充。
