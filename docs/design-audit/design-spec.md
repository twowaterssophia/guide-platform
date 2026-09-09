# Hi Chat Design → 导览后台：具体设计规范 v1.1

> 这是一份面向后续开发的单一设计规范入口。它把视觉、布局、组件、状态、交互和页面映射集中在一起。
>
> 规范状态：**阶段 1 v1.1，唯一实施入口**。A 为 Figma / 当前项目直接证据，B 为明确实施映射，P 为产品决策；Prototype 圆形连线细节不属于本规范的实施前置条件。任何 B/P 都不得被描述为 Figma 原始读数；后续若取得新证据，只更新本文件的变更记录和对应 Token。

## 0. 设计目标与边界

### 目标

让导览后台在以下方面与 Hi Chat Design 建立同一套产品语言：

- 页面壳、导航、标题区、表格、表单、空状态、按钮、弹窗、Alert、Popover 的外观。
- 同类操作使用同类容器和反馈方式。
- Hover、Focus、Selected、Disabled、Loading、Error 等状态一致。
- 保留导览业务所需的地图、点位、路径和任务编排能力。

### 边界

- 复制设计语言和交互语法，不复制 Hi Chat 的业务内容。
- 所有业务文本、地图数据、点位数据、任务动作、语音人设和 MCP 插件数据仍属于导览后台。
- 不将地图画布、多步骤任务编排强行压缩成小弹窗。
- 不把 Figma 截图作为静态 UI；控件和文字必须继续由代码渲染。

## 1. 参考来源与证据等级

| 等级 | 含义 | 例子 |
|---|---|---|
| A：已确认 | 已从 Figma 结构、属性或当前代码直接观察 | Figma 有 `首页`、`空状态`、`创建人设2`、`Modal`、`Alert`、`Button`、`Table cell`；首页 1440×870；属性出现 `#F5F5F5`、`#F9FEFF` |
| B：实施值 | 为后续开发给出的明确工作值 | 页面边距 48px、控件高度 36px、Modal 默认宽度 480px |
| P：产品决策 | Figma 没有暴露原始值，或业务需要明确取舍 | 地图选择用 Select Dialog、插件表单用宽 Modal、地图编排保留独立页面 |
| BLOCKED：来源阻塞 | 已尝试只读方法仍无法取得可靠证据 | Prototype 热点连线、真实字体文件、完整 Button Variant 色值 |

当 A 与 B 冲突时，以 A 为准；P 只在没有 A 时生效；BLOCKED 不得被猜测值覆盖。

## 2. 页面与容器规范

### 2.1 基准画布

| 项目 | 规范 |
|---|---:|
| Figma 首页基准尺寸 | 1440 × 870（A） |
| 桌面最小可用宽度 | 1024px（B） |
| 页面左右边距 | 48px（B） |
| 页面最大内容宽度 | 1344px，即 `1440 - 2×48`（B） |
| 小屏左右边距 | 24px（B） |
| 顶部导航高度 | 64px（B：实施映射，Figma 未暴露精确值） |
| 页面标题区最小高度 | 62px（B） |
| 标题区到首个内容区 | 32px（B） |
| 主要区块之间 | 32–40px（B） |

页面应使用开放布局、列表、表格和分割线作为主要组织方式；除 Modal、Popover、预览区域和确实需要强调的编辑块外，不给每个区块额外套卡片。

### 2.2 页面壳

```text
App shell
├─ Topbar（固定文档流，不悬浮）
│  ├─ Brand
│  ├─ 一级导航
│  └─ 账户入口
└─ Main content
   ├─ Page heading（标题 + 说明 + 主操作）
   └─ Page body（table / form / preview / editor）
```

- 顶部导航底部使用 1px 分割线。
- 当前一级导航使用文字变深 + 底部 2px active indicator。
- 页面标题左对齐；主操作位于标题区右侧。
- 详情页和表单页的返回按钮与标题在同一水平线。
- 复杂编辑页的底部操作栏固定在视口底部，并为内容预留底部空间。

### 2.3 语音模块二级导航

- 一级导航选择“语音”后，左侧显示二级导航：`人设`、`插件`。
- 二级导航宽度：176px（B）。
- 二级导航与内容之间间距：48px（B）。
- 二级导航右侧使用 1px 分割线。
- 选中项使用浅灰背景、深色文字和 600 字重，不使用高饱和色块。

## 3. 色彩规范

### 3.1 核心 Token

| Token | v1.1 值 | 用途 | 证据 |
|---|---|---|---|
| `--color-page` | `#FFFFFF` | Modal、表格主体和默认表面 | Figma Modal Background/Body（A） |
| `--color-empty-start` | `#F5F5F5` | `空状态` 页面渐变起点 | Figma `空状态` Properties（A） |
| `--color-empty-end` | `#F9FEFF` | `空状态` 页面渐变终点 | Figma `空状态` Properties（A） |
| `--color-persona-start` | `#F5F7FF` | `创建人设2` 页面渐变起点 | Figma `创建人设2` Properties（A） |
| `--color-persona-end` | `#FAFEFF` | `创建人设2` 页面渐变终点 | Figma `创建人设2` Properties（A） |
| `--color-text-strong` | `#161616` | 标题、主文本 | 当前项目基线（A/B） |
| `--color-text` | `#303030` | 正文、表单值 | 当前项目基线（B） |
| `--color-text-muted` | `#777777` | 说明、表头、辅助信息 | 当前项目基线（B） |
| `--color-text-placeholder` | `#8A8A8A` | Placeholder、空状态辅助文案 | 当前项目基线（B） |
| `--color-border-strong` | `#BCBCBC` at 16% | Table cell 底部分割线 / 重点描边 | Figma `Table cell` Properties（A） |
| `--color-border` | `#D5D5D5` | 输入框、Select、Popover 边框 | 当前项目基线（B） |
| `--color-divider` | `#EDEDED` | 表格行、区块分割线 | 当前项目基线（B） |
| `--color-surface-subtle` | `#F8F8F8` | Hover、标签、次级表面 | 当前项目基线（B） |
| `--color-surface-hover` | `#F3F3F3` | 菜单项、列表项 Hover | 当前项目基线（B） |
| `--color-accent` | `#6E63FF` | 品牌图标、主操作、选中指示和聚焦轮廓 | Hi Chat 主操作视觉 + Figma `Alert` 精确色值（A） |
| `--color-primary-hover` | `#5B52E8` | 主操作 Hover / Active | B：基于 Accent 的可读性映射 |
| `--color-accent-soft` | `rgb(110 99 255 / 15%)` | 轻量选中、聚焦外环、Accent Alert | Figma `Alert` Properties（A） |
| `--color-danger` | `#B42318` | 错误、危险操作 | 当前项目基线（B） |
| `--color-danger-hover` | `#8F1D14` | 危险操作 Hover / Active | B：语义色可读性映射 |
| `--color-success` | `#2F7D4A` | 成功 Toast / 状态 | 当前项目基线（B） |
| `--color-backdrop` | `rgb(0 0 0 / 32%)` | Modal 遮罩 | B：实施映射；Prototype / Properties 未暴露遮罩值 |

### 3.2 使用规则

- 默认组件和内容表面保持纯白；不能把白色擅自改成米色、奶油色或暖灰色。
- 仅在 Figma 已显示的 `空状态`、`创建人设2` 页面壳使用对应渐变 Token，不给按钮、表格和表单凭空增加渐变。
- 整体仍以白色表面和中性文本为主；`#6E63FF` 只用于主操作、当前导航指示、品牌图标、选中控件和聚焦反馈，不大面积铺色。
- 主按钮使用紫色实心；危险按钮使用语义红色，不与主操作混用。
- 错误色只用于错误边框、错误文案和危险状态，不用于大面积装饰。
- 描边对比度优先满足可读性；Figma 中“描边颜色需加重”的评论视为高优先级复核项。

## 4. 字体与排版规范

### 4.1 字体栈

```css
font-family: Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
```

这是 B：实施映射。Figma 只读面板未暴露字体文件名，因此真实字体仍为 BLOCKED，不得在验收中称为 Figma 实测。

### 4.2 类型 Token

| Token | 字号 | 字重 | 行高 | 用途 |
|---|---:|---:|---:|---|
| `type.page-title` | 26px | 650 | 1.25 | 页面标题、详情标题 |
| `type.section-title` | 18px | 600 | 1.4 | 空状态标题、Modal 标题 |
| `type.subsection` | 14px | 600 | 1.4 | 表单区块、任务区块标题 |
| `type.body` | 13px | 400 | 1.55 | 正文、表格值、表单值 |
| `type.body-strong` | 13px | 600 | 1.5 | 名称、强调值、主操作文字 |
| `type.label` | 13px | 600 | 1.4 | 字段标签、表单标题 |
| `type.caption` | 12px | 400 | 1.5 | 辅助说明、时间、表头 |
| `type.button` | 13px | 600 | 1 | Button 文本 |

规则：

- 所有 Button、Tab、Input、Select、Popover、表格单元格都显式声明字号，不能依赖浏览器默认值。
- 中文正文不得使用过小字号；12px 只用于辅助信息和时间。
- 标题与辅助说明之间默认间距 8–10px。
- 长文本使用自然换行；名称和表格单元格可截断，但必须通过 title 或详情页保留完整内容。

## 5. 间距、圆角、边框、阴影

### 5.1 间距 Token

基础单位为 4px：

`4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40 / 48 / 64`

使用规则：

- 控件内水平留白：12px 或 16px。
- 字段标签与控件：8px。
- 字段之间：24px。
- 表单区块之间：40px。
- Modal 外层内边距：32px（A：Figma Modal）；内部区块间距按组件变体映射。
- 页面主内容边距：48px。
- 底部固定操作栏高度：72px。

### 5.2 圆角 Token

| Token | 值 | 用途 |
|---|---:|---|
| `radius-sm` | 3px | Input、Select、细粒度控件 |
| `radius-md` | 4px | Button、Popover、Table tag、菜单 |
| `radius-lg` | 6px | Modal、预览容器、编辑块 |
| `radius-round` | 50% | 头像、点位标记、Toggle thumb |

除 Figma 明确展示为大圆角容器的区域，不使用 12px 以上圆角，也不把普通按钮做成胶囊。

### 5.3 阴影 Token

```css
--shadow-popover: 0 10px 24px rgb(0 0 0 / 10%);
--shadow-modal: 0 20px 60px rgb(0 0 0 / 12%);
--shadow-toast: 0 10px 30px rgb(0 0 0 / 12%);
```

只用于浮层，不给普通页面区块增加阴影。

## 6. 基础组件规范

### 6.1 Button（Figma A 证据 + 实施映射）

| 变体 | 高度 | 内边距 | 背景 | 文字 |
|---|---:|---:|---|---|
| Primary | 44px | 0 18px（B：实施映射） | `#6E63FF` | `#FFFFFF` |
| Secondary | 38px | 0 18px | `#FFFFFF` | `#3E3E3E` |
| Text | 30px | 0 | transparent | `#4C4C4C` |
| Icon | 30×30px | 0 | transparent | 当前文字色 |
| Danger | 38px | 0 18px | `#B42318` | `#FFFFFF` |

状态：

- Primary Hover / Active：背景 `#5B52E8`。
- Secondary Hover：背景 `#F8F8F8`，边框加深。
- Text Hover：文字 `#111111`，可加 3px 下划线偏移。
- Disabled：背景 `#E5E5E5`，文字 `#999999`，禁止重复提交。
- Focus：2px `#6E63FF` outline，offset 2px；已是紫色背景的控件使用外环和 offset 保持可见。
- 图标与文字间距：12px（A：Button Gap）；不得沿用旧版 6px 猜测值。
- Figma 未暴露按钮文字字号、字体、圆角和完整 Variant 状态色；这些采用 B/P 实施映射，不能写成 Figma 原始证据。

### 6.2 Input / Select / Textarea

- 默认高度：38px。
- 默认边框：1px `#D5D5D5`。
- 圆角：3px。
- 水平内边距：11px。
- 文字：13px，颜色 `#1D1D1D`。
- Placeholder：`#8A8A8A`。
- Hover：边框 `#A6A6A6`。
- Focus：边框 `#6E63FF` + 2px `rgb(110 99 255 / 15%)` 外描边。
- Error：边框 `#B42318`，下方 12px 错误文案。
- Textarea 默认最小高度：112px；动作播报文本域可使用 38px 起始高度并随内容扩展。

### 6.3 Radio / Checkbox / Toggle

- Checkbox / Radio 尺寸：15px。
- 选中色：`#6E63FF`。
- Toggle 尺寸：36×22px。
- Toggle 未选中背景：`#B7B7B7`；选中背景：`#6E63FF`。
- Toggle thumb：18px，白色，带轻微阴影。

### 6.4 Table

- 表格不使用外层大卡片。
- 表头最小高度：42px。
- 数据行最小高度：64px（A：`Table cell` Height Fixed 64px）。
- 单元格水平内边距：16px（A：`Table cell` Padding 16px）。
- 表头：12px、500 字重、`#777777`。
- 数据：13px、`#303030`。
- 行分割线：0.5px `#BCBCBC` at 16%（A：`Table cell` Bottom border）。
- Row Hover：`#FAFAFA`。
- 名称列使用 600 字重。
- 操作列右对齐或按 Figma 组件统一左对齐，不能一个页面一种方式。
- 行点击进入详情时，行内按钮必须阻止事件冒泡，避免同时跳转。

### 6.5 Tag

- 高度：25–26px。
- 水平内边距：8px。
- 边框：1px `#DEDEDE`。
- 圆角：3px。
- 背景：`#F8F8F8`。
- 文字：12px，`#565656`。
- 超出列宽时截断；完整工具名放在 title / 详情页。

### 6.6 Empty state

- 默认最小高度：430–480px。
- 图标 / 插图在上，标题在下，说明再下，CTA 最后。
- 图标与标题间距：26px。
- 标题：18px、600 字重。
- 说明：13px、`#8A8A8A`，上方 10px。
- CTA：上方 28px。
- 空状态必须提供下一步动作：新建、添加或查看说明。

### 6.7 Popover / Dropdown

- 背景：白色。
- 边框：1px `#D5D5D5`。
- 圆角：3–4px。
- 阴影：`--shadow-popover`。
- 内边距：6px。
- 菜单项最小高度：32–36px。
- Hover：`#F3F3F3`。
- 打开后支持 Esc 关闭；点击外部关闭；选择后按业务规则立即生效或等待确认。
- 菜单靠近视口边缘时自动翻转，不允许被裁切。

### 6.8 Modal / Confirm Modal

| 类型 | 宽度 |
|---|---:|
| Confirm / Alert | 402×178px（A：Modal 变体；业务可在 372–402px 间按内容取值） |
| 普通表单 Modal | 372px 宽，内容高度按 396 / 578 / 589 / 607px 变体取值（A） |
| 动态字段 / 插件 Modal | 711px 或 758px 宽变体（A） |

- 遮罩：`rgb(0 0 0 / 32%)`。
- Modal 背景：白色（A：Background/Body `#FFFFFF`）；圆角使用 Figma `Utilities/Border Radius/3XL` 语义 Token（A），CSS 数值为 B 实施映射。
- Modal 主体采用 Vertical Auto Layout；外层 Padding 32px、主 Gap 使用 `Utilities/Spacing/7`（A）。
- Header、Content、Footer 的内部间距在不破坏 32px 外边距的前提下采用 B 实施映射。
- Footer：右对齐，按钮间距 10px；默认“取消”在左、“确认 / 保存”在右。
- 点击遮罩：普通信息 Modal 可关闭；有未保存内容的编辑 Modal 不得因误触遮罩丢失数据，应先弹放弃确认或不关闭。
- Esc：普通 Modal 可关闭；危险确认和未保存表单遵循同样的保护规则。
- 打开后焦点落在标题后的第一个可操作控件；关闭后焦点回到触发按钮。

### 6.9 Alert / Toast

- Toast 位于视口顶部居中，距顶部 24px。
- 最大宽度：360px；最小宽度：136px。
- Accent Alert：195×48px，Horizontal，Radius `XL`，上下 12px，左右 `Spacing/4`，Gap `Spacing/3`，Fill `#6E63FF` at 15%（A）。
- Text Alert：195×48px，Radius 12px，主文字 `#262626`，阴影 `0 12px 16px -4px #101828` at 4%（A）。
- Dropdown surface：195×48px，Radius 12px，0.5px 边框，背景 `#FFFFFF`，边框 `#F4F4F4`，同一阴影（A）。
- 成功使用绿色左边框，失败使用红色左边框。
- Toast 用于短反馈，不承载必须阅读的长说明。
- 需要用户决定的内容使用 Alert / Confirm Modal，而不是 Toast。
- Toast 的位置、持续时间和成功 / 失败语义属于 P：产品决策；不得声称来自 Prototype 连线。

## 7. 交互同构规范

### 7.1 交互形态选择

| 形态 | 使用场景 | 导览后台动作 |
|---|---|---|
| 独立页面 | 多步骤、画布、持续编辑 | 新建 / 编辑导览任务、创建 / 编辑人设、地图点位编排 |
| Modal | 局部表单、一次性配置、危险确认 | 添加地图、添加插件、删除、放弃编辑、退出登录、重置 |
| Select Dialog | 需要搜索、列表较长、选择后回填 | 选择地图；技能 / 插件选项超过 8 项时升级 |
| Popover | 少量即时选项、更多操作 | 行更多菜单、添加任务类型、简单技能选择、账户菜单 |
| Toast | 成功、失败、处理中短反馈 | 保存成功、插件刷新、任务删除、同步提示 |

### 7.2 打开 / 关闭合同

#### Modal

1. 点击触发按钮打开。
2. 背景内容保持原位置，不重置表单草稿。
3. 取消、关闭按钮、Esc 按目标规则关闭。
4. 保存成功后先显示成功反馈，再关闭或跳转。
5. 点击遮罩是否关闭由 Modal 类型决定；未保存表单不可静默丢弃。

#### Popover

1. 点击触发按钮切换打开状态。
2. 点击外部或 Esc 关闭。
3. 选择项后立即更新当前上下文，并关闭（多选除外）。
4. 触发按钮保留 `aria-expanded`。

#### Select Dialog

1. 点击字段触发 Dialog。
2. 顶部显示标题和搜索框。
3. 列表项显示名称及必要的辅助信息。
4. 单选选择后回填并关闭；多选使用“完成”确认。
5. 没有结果显示空状态，不显示空白弹层。

### 7.3 必须统一的状态

- Hover：轻微表面变化，不改变布局。
- Focus：始终有可见 2px outline。
- Selected：文字加深 / 背景浅灰 / 勾选图标，三者至少保留两种信号。
- Disabled：降低对比度并阻止提交。
- Loading：按钮禁用，显示进行中反馈，防止重复操作。
- Error：控件红色边框 + 就近错误文案；不要只用颜色传达错误。
- Empty：说明当前没有数据并提供下一步动作。

## 8. 导览后台页面规范

### 8.1 导览任务列表

结构：

```text
页面标题：导览任务
说明：设置机器人要执行的导览内容
右侧：新建导览任务（Primary）
下方：Table
```

表格列：任务名称、地图名称、点位数量、创建时间、操作。

交互：

- 点击数据行进入任务详情。
- 点击“编辑”进入任务编辑流。
- 点击“更多”打开 Popover，仅显示删除。
- 删除使用 Confirm Modal。
- 无数据时使用 Empty state，CTA 为“新建导览任务”。

### 8.2 地图列表与详情

- 地图列表复用任务列表的标题区、表格、操作列和空状态。
- “添加地图”使用 Modal 表单，包含名称和文件选择。
- 地图详情保留独立页面，因为包含预览区域。
- 预览区域使用明确边框和轻量圆角，不额外套多层卡片。
- 地图删除使用 Confirm Modal；删除成功显示 Toast 并回到列表。

### 8.3 人设列表与创建 / 编辑

- 人设列表复用 Table / Empty state / More menu。
- 创建人设保留独立页面，复用 Figma 中 `创建人设2` 的表单区块结构。
- 表单区块：基础设置、问答设置、技能设置。
- 返回按钮位于标题左侧。
- 取消 / 返回时若有未保存变更，使用放弃编辑 Confirm Modal。
- 插件选择：默认使用 Popover 多选；当选项需要搜索或描述过长时升级为 Select Dialog。
- 预置技能开关使用 Toggle；自定义技能使用分组 Popover。

### 8.4 MCP 插件列表与添加 / 编辑

- 列表列：插件名称、工具数量 / 工具名称、创建时间、最后刷新时间、操作。
- 工具名称使用 Tag；超出列宽截断并提供详情查看。
- “刷新”是行内动作，点击后进入 loading，完成后 Toast。
- 添加插件优先改为宽表单 Modal；Modal 内部内容区滚动，Footer 固定可见。
- 动态认证字段根据认证方式出现，切换认证方式时保留可恢复草稿，不能静默清空已输入值。
- 保存插件需要显示处理中状态；初始化失败使用错误 Toast，并在必要时保留字段错误。

### 8.5 新建 / 编辑导览任务

保留三步独立编辑流：

1. 基础信息：名称、地图。
2. 点位：地图画布、点位新增、点位列表、排序、朝向。
3. 任务：抵达点位后 / 点位间路径上的语音播报、语音问答、执行技能。

交互调整：

- 第一步地图选择由当前页面内展开列表升级为 Select Dialog；选择后回填并关闭。
- 第二步地图缩放控件保留 Popover 之外的固定工具控件，因为它属于画布操作。
- 第三步“添加任务”使用 Popover 菜单。
- 技能选择使用分组 Popover；技能很多时升级为 Select Dialog。
- 语音人设选择使用自定义 Select / Popover，不使用浏览器原生 Select 作为最终视觉。
- 底部固定操作栏保留：上一步、下一步、取消、保存。
- 点位和动作拖拽排序保留，不因视觉迁移而删除。

## 9. 当前代码映射

后续实施应优先复用现有渲染函数和事件委托，仅替换结构类名、样式和局部容器：

| 现有代码 | 规范对应 |
|---|---|
| `renderNavigation` | App Shell / 一级导航 |
| `renderVoicePage` | 二级导航 / 语音页面壳 |
| `renderMapList`、`renderTourTaskList`、`renderPersonaList`、`renderPluginManagement` | Table / Empty state |
| `renderMapDetail`、`renderTourTaskDetail`、`renderPersonaDetail`、`renderMcpPluginDetail` | Detail page |
| `renderPersonaForm` | Create Persona 页面 |
| `renderMcpPluginFormPage` | Plugin Modal 或表单页面迁移目标 |
| `renderTourTaskCreateBasic` | 基础信息步骤 |
| `renderTourTaskCreatePoints` | 地图 / 点位步骤 |
| `renderTourTaskCreateActions` | 任务编排步骤 |
| `renderModal` 及各 `render*Modal` | Modal / Alert / Confirm Modal |
| `renderToast` | Toast |
| `app.addEventListener('click', ...)` | 交互行为保持，必要时增加 Modal / Popover 状态 |

安全要求：

- 不改 `guide.appData` key 和数据版本。
- 不删除现有路由 hash。
- 不删除拖拽、表单校验、localStorage 和现有业务状态。
- 视觉迁移优先修改 Token、组件类和渲染容器；行为迁移再修改对应 action handler。

## 10. 响应式规范

### 1440px 及以上

- 页面左右边距 48px。
- 表格显示完整列。
- 复杂表单使用单列宽布局，最大内容宽度由页面容器约束。

### 1024–1279px

- 页面左右边距降为 32px。
- 表格允许横向滚动，不压缩到不可读。
- 标题区按钮保持可见，必要时按钮缩短文案但不隐藏主操作。

### 768–1023px

- 页面左右边距 24px。
- 语音二级导航可缩窄为 144px。
- Modal 使用 `calc(100vw - 48px)`，内部内容滚动。
- 底部固定操作栏按钮保持 44px 最小触达高度。

### 320–767px

- 一级导航允许横向滚动或折叠为菜单，但不能出现遮挡。
- 表格转为横向滚动容器，禁止强行挤压列内容。
- 表单单列显示。
- Modal 使用 `calc(100vw - 32px)`，最大高度 90vh，内容区滚动。
- 地图画布保持可缩放和拖拽；点位列表单独滚动。

## 11. 实施验收标准

### 视觉

- 页面背景、容器边距、导航高度、标题层级一致。
- Button、Input、Table、Modal、Alert、Empty state 的几何尺寸统一。
- 颜色、描边、分割线、圆角、阴影按 Token 使用。
- 所有控件显式设置字号、行高和字重。
- 图标保持同一线性 / 填充风格，不能随意替换成近似 glyph。

### 交互

- 同类操作统一使用 Modal、Popover、Select Dialog 或独立页面。
- Modal 支持取消、关闭、Esc、焦点回收和未保存保护。
- Popover 支持点击外部关闭和 Esc。
- Toast 不替代需要用户决策的 Alert。
- 表单错误靠近字段显示，提交按钮在 loading 时不可重复点击。
- 行点击与行内操作不互相误触发。

### 回归

- 一级导航切换。
- 任务列表行点击、编辑、删除。
- 地图添加、预览、删除。
- 人设创建、编辑、插件多选、放弃编辑。
- 插件添加、动态认证字段、刷新、删除。
- 任务三步创建、地图选择、点位拖拽、动作排序、保存。
- localStorage 数据保留和演示数据重置。

## 12. 证据边界与产品决策

以下决策是 P：产品决策，不是 Figma Prototype 连线的直接复述：

1. 地图选择采用 Select Dialog：列表可搜索，选择后要回填并关闭。
2. 添加插件采用 711/758px 宽 Modal：认证字段动态变化，需要保留上下文与滚动区。
3. 创建 / 编辑人设保持独立页面：目标稿存在 `创建人设2` 页面样例，且导览业务字段较多。
4. 地图点位、拖拽排序、动作编排保持独立编辑页面：画布和持续编辑上下文不能被小弹窗破坏。
5. 删除、放弃编辑、退出登录、重置使用 Confirm Modal：这些操作需要用户明确决定，不能用短 Toast 替代。
6. 账户菜单、更多操作、添加动作、少量技能选择使用 Popover：选项少且选择后应立即回到当前上下文。

Prototype 已通过编辑器 Properties、画布截图、Prototype 演示页三种只读方式尝试；由于无障碍树没有暴露画布热点与连线目标，圆形连线细节记录为非关键来源风险，不作为本规范的实施前置条件。

## 13. 验收入口

唯一实施入口为本文件 v1.1。阶段 1 在 `phase-1-checklist.md` 全部关键项完成且 `verify-phase1.ps1` 返回 0 后即可宣布完成；Prototype 圆形连线细节作为非关键风险保留记录。

## 14. 变更记录

| 版本 | 日期 | 内容 |
|---|---|---|
| v0.1 | 2026-09-08 | 建立统一设计规范初稿。 |
| v1.0 | 2026-09-08 | 纳入本轮 Figma 只读证据、Modal / Alert 变体、页面渐变差异、Prototype 阻塞边界和产品决策；作为唯一实施入口。 |
| v1.1 | 2026-09-09 | 根据 Hi Chat 主操作视觉和已确认 Accent 色值，将主操作、选中指示和聚焦反馈统一为 `#6E63FF` 紫色体系，危险操作保留语义红。 |
