# 设计 Token 初稿

本文件保留为证据工作底稿。正式实施值以 `design-spec.md` v1.1 为唯一入口；A 为直接证据，B 为实施映射，P 为产品决策，BLOCKED 为来源限制。

## 1. 已观察 / 高置信度方向

| Token | 当前判断 | 置信度 | 来源 |
|---|---|---:|---|
| 页面整体气质 | 浅色、轻量、产品后台、低装饰 | 高 | Figma 页面与组件命名；当前后台截图 |
| 内容组织 | 开放列表 / 表格 / 分隔线优先，不是默认卡片网格 | 中高 | 目标稿含 Table cell；当前业务也以表格为主 |
| 主要背景 | 浅色背景，存在浅灰到近白的渐变线索 | 中 | 首页属性面板：`#F5F5F5`、`#F9FEFF` |
| 交互表面 | Button、Modal、Alert、Table cell 有独立组件 | 高 | Figma 图层命名 |
| 关注项 | 描边对比度需要加重 | 高 | Figma 评论 |

## 2. 待核对 Token

| Token | 待核对内容 |
|---|---|
| font-family | 中文与英文实际字体、fallback 顺序 |
| body-size | 正文、表格、辅助文字的具体字号 |
| heading-scale | 页面标题、区块标题、Modal 标题字号级别 |
| line-height | 中文文本、表格、表单说明的行高 |
| spacing | 页面边距、区块间距、字段间距、Modal 内边距 |
| radius | Button、Input、Popover、Modal、空状态容器圆角 |
| border | 默认、Hover、Focus、Error、Selected 描边色和宽度 |
| shadow | Popover、Modal、Toast 的阴影层级 |
| semantic-colors | Success、Warning、Error、Info 的色值 |
| motion | Popover / Modal 的进入退出、Toast 动画时长 |
| responsive | 小屏导航、表格、Modal、固定底部操作栏的折叠规则 |

## 3. 读取顺序

后续高倍数 Figma 审计应先从基础组件读取，再回填页面 Token：

1. Button
2. Input / Select / Textarea
3. Table cell
4. Empty state
5. Modal
6. Alert
7. Create Persona
8. 首页 / 页面壳

这样可以避免从一张复杂首页截图反推所有细节。

## 4. v1.0 已锁定证据

| Token / 属性 | 值 | 来源 | 等级 |
|---|---|---|---|
| Empty page size | 1440×870px | Figma `空状态` Properties | A |
| Empty gradient | `#F5F5F5 → #F9FEFF` | Figma `空状态` Properties | A |
| Persona page size | 1440×870px | Figma `创建人设2` Properties | A |
| Persona gradient | `#F5F7FF → #FAFEFF` | Figma `创建人设2` Properties | A |
| Button geometry | Hug 148×44px；Gap 12px | Figma `Button` Properties | A |
| Table cell geometry | Fixed 155×64px；Padding 16px；Gap 16px | Figma `Table cell` Properties | A |
| Table divider | Bottom 0.5px；`#BCBCBC` at 16% | Figma `Table cell` Properties | A |
| Modal compact | 372px 宽；Padding 32px；Vertical；Gap `Spacing/7` | 多个 Figma `Modal` Properties | A |
| Modal wide | 711px / 758px 宽 | Figma `Modal` Properties | A |
| Modal confirm | 402×178px | Figma `Modal` Properties | A |
| Modal surface | `#FFFFFF`；Radius `Utilities/Border Radius/3XL` | Figma `Modal` Properties | A |
| Alert geometry | 195×48px；Radius 12px / `XL` | Figma `Alert` Properties | A |
| Alert accent | `#6E63FF` at 15% | Figma `Alert` Properties | A |
| Alert/dropdown shadow | `0 12px 16px -4px #101828` at 4% | Figma `Alert` Properties | A |
| Dropdown border | 0.5px `#F4F4F4`；Background `#FFFFFF` | Figma `Alert` Properties | A |

## 5. 明确边界

- 字体文件名、完整字号体系、Button 全部 Variant 色值：BLOCKED；使用 `design-spec.md` 中 B 实施映射。
- Prototype 热点与目标连线：BLOCKED；使用 `interaction-matrix.md` 中已关闭的 P 产品决策。
- `3XL`、`XL`、`Spacing/7` 等 Figma 语义 Token 的原始数值没有在只读面板展开，实施时保留语义命名并做 B 映射。
