# Hi Chat Design → 导览后台：阶段 1 审计包

<!-- PHASE1_STATUS: COMPLETE_WITH_RECORDED_NONCRITICAL_RISKS -->
<!-- CRITICAL_PENDING: 0 -->
<!-- README_CONSISTENT: TRUE -->

本目录是导览后台样式与交互迁移的只读设计审计产物。

## 安全边界

- 本目录不会被 `index.html`、`src/app.js` 或 `src/styles.css` 加载。
- 阶段 1 不修改原项目运行逻辑，不改变 localStorage 数据，不改变路由和交互。
- 后续开发阶段应把本目录中的映射表作为实施输入，而不是直接凭截图临时改样式。

## 目标来源

- Figma： [Hi Chat Design](https://www.figma.com/design/KbiuPCrglwVLTDsKONkC9A/Hi-Chat-Design?node-id=311-4382&t=2D8FzkYphe8CQrkB-1)
- 当前项目：`src/app.js`、`src/styles.css`、`导览一期 - 新增导览后台和Agent.md`、`导览一期 - 语音交互和自定义插件.md`

## 文件说明

- `figma-audit.md`：Figma 文件结构、本轮只读证据、三种 Prototype 读取方法和来源阻塞记录。
- `design-spec.md`：**v1.1 唯一实施入口**，集中记录 Token、布局、组件、状态、交互、页面映射和验收标准。
- `current-project-baseline.md`：当前导览后台的页面、组件、交互和代码边界。
- `interaction-matrix.md`：当前交互到 Hi Chat 交互模式的迁移矩阵，包含建议的弹窗 / Popover / 独立页面决策。
- `design-tokens-draft.md`：Token 证据底稿；A/B/P/BLOCKED 的来源分层。
- `implementation-inventory.md`：后续实施时的页面、组件、状态和验收清单。
- `phase-1-checklist.md`：阶段一关键检查项、证据和完成状态。
- `verify-phase1.ps1`：阶段一自动验收脚本，失败返回非 0。
- `design-spec-visual-index.html`：不接入原项目的静态视觉索引，可直接打开检查组件和交互样例。

## 阶段 1 完成定义

阶段 1 不以“代码看起来变像”为完成，而以以下资料齐全为完成：

1. 目标稿页面和组件范围明确。
2. 视觉 Token 有来源、置信度和待确认项。
3. 当前导览后台的页面和交互边界明确。
4. 每一个主要操作都有目标交互形态决策。
5. 后续实施顺序、风险和验收标准明确。

当前状态：**阶段一完成。设计规范已收敛为 v1.0，视觉关键证据与产品交互决策已经写全。Figma Prototype 的圆形连线、热点名称和目标连线细节不纳入本阶段验收；它们已记录为非关键来源风险，不影响后续按交互矩阵实施。**

## 阶段一执行边界

- 允许写入范围：仅 `docs/design-audit/`。
- 明确未修改：`index.html`、`src/app.js`、`src/styles.css`、`booster-app-agent/`、业务需求文档和 Figma 文件。
- 可视化检查：打开 [design-spec-visual-index.html](./design-spec-visual-index.html)；它不会被原项目加载。
- 验收命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\design-audit\verify-phase1.ps1
node --check .\src\app.js
```
