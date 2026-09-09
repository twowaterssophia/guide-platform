# 阶段 1 验收清单

> 状态定义：`[x]` 表示已完成；本阶段不要求复刻 Figma Prototype 的圆形连线细节。

## 关键项

- [x] CRITICAL-01 安全边界：阶段一仅写入 `docs/design-audit/`；未修改 `index.html`、`src/app.js`、`src/styles.css`、`booster-app-agent/`、业务需求文档和 Figma。
  - 证据：阶段一前后核心文件 SHA256 保持为 `07A2E217...B8F1E8F`、`9D2375D5...57E2C5A`、`AD00F337...C656B1A`。
- [x] CRITICAL-02 页面壳：确认目标稿包含 1440×870 页面级画板；空状态和创建人设使用不同的冷色浅渐变。
  - 证据：Figma `空状态` 与 `创建人设2` Properties。
- [x] CRITICAL-03 Button：确认 148×44px、Horizontal、Gap 12px。
  - 证据：Figma `Button` Properties；未暴露的字体/圆角/Variant 色值标为 BLOCKED。
- [x] CRITICAL-04 Table cell：确认 155×64px、Padding 16px、Gap 16px、Bottom 0.5px、`#BCBCBC` at 16%。
  - 证据：Figma `Table cell` Properties。
- [x] CRITICAL-05 Empty state：确认 1440×870、`#F5F5F5 → #F9FEFF`。
  - 证据：Figma `空状态` Properties。
- [x] CRITICAL-06 Create Persona：确认 1440×870、`#F5F7FF → #FAFEFF`，并决策为创建/编辑人设的独立页面模板。
  - 证据：Figma `创建人设2` Properties；产品决策见 `interaction-matrix.md`。
- [x] CRITICAL-07 Modal：核对 8 个 Modal，锁定 372px 普通、402px Confirm、711/758px 宽 Modal 族，以及 32px Padding、Vertical、`3XL` Radius、白色表面。
  - 证据：Figma 多个 `Modal` Properties。
- [x] CRITICAL-08 Alert / Toast / Dropdown：核对 3 个 Alert，锁定 195×48px、12px/`XL` Radius、Accent Fill、文本色、0.5px 边框和阴影。
  - 证据：Figma 多个 `Alert` Properties。
- [x] CRITICAL-09 Popover / Dropdown：将账户菜单、更多操作、添加动作、少量技能选择关闭为 Popover 决策；超过 8 项或需搜索时升级 Select Dialog。
  - 证据：Figma Dropdown surface + 产品决策。
- [x] CRITICAL-10 Prototype 范围确认：已完成三种追加只读尝试并确认至少 52 个 frame；圆形连线、热点名称、触发动作和目标连线细节明确不纳入阶段一验收。
  - 证据：Properties、画布截图、Prototype 演示页 46/52 至 52/52。
- [x] CRITICAL-11 交互矩阵：所有关键业务动作均为确定目标形态，不保留“倾向/可能/待核对”作为关键决策。
  - 证据：`interaction-matrix.md` v1.0 表。
- [x] CRITICAL-12 Token 可追溯性：关键 Token 均记录值、来源组件/页面、证据等级。
  - 证据：`design-spec.md`、`design-tokens-draft.md`、`figma-audit.md`。
- [x] CRITICAL-13 单一实施入口：`design-spec.md` 标记为 v1.1，包含布局、色彩、排版、组件、交互、页面映射、响应式和验收章节。
  - 证据：`design-spec.md`。
- [x] CRITICAL-14 可视化检查：提供独立静态视觉索引，未接入原项目。
  - 证据：`design-spec-visual-index.html`。
- [x] CRITICAL-15 自动验收：`verify-phase1.ps1` 验证必需文件、v1.0、关键章节、清单状态、README 状态与核心文件哈希。
  - 证据：脚本执行结果。

## 已记录风险

- [x] RISK-01 Prototype 热点/连线：非关键范围。Figma Prototype 无障碍树未暴露热点名称、触发动作和目标节点；本任务按 `interaction-matrix.md` 的产品决策实施，不要求逐条复刻圆形连线。
- [x] RISK-02 字体与 Button 完整 Variant：BLOCKED。只读 Properties 未暴露可靠原值；v1.0 使用明确 B 实施映射，后续若获得 Dev Mode 权限再按证据校准。
- [x] RISK-03 Figma 语义 Token 原值：`3XL`、`XL`、`Spacing/7` 等未展开原始数值；规范保留语义名并使用 B 映射。
