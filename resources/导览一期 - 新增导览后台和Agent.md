# 导览一期 \- 新增导览后台和Agent

> 前端开发样式参考：
> 
> - Agent 页面参考：[App 设计稿](https://www.figma.com/design/E7Rnuuo5msAQVt7VhN8PYN/APP-UI-%E7%89%88%E6%9C%AC%E5%8D%87%E7%BA%A7?node-id=311-4065&t=b5XfUE5aKtY3ofxW-1)
> 
> - 导览后台参考：[Hi Chat Hub 设计稿](https://www.figma.com/design/KbiuPCrglwVLTDsKONkC9A/Hi-Chat-Design?node-id=311-4382&t=qQSQaoXBsHWcxCRD-1)
> 
> 

# 背景 / 问题

机器人导览是普遍的客户应用场景，如展厅讲解、语音问答、巡检等。

当前没有官方的导览场景解决方案，需要经过复杂定制开发实现，成本高、耗时长、不可复用。

现计划开发一方导览应用，对客户和二开公司开放，项目规划见：[导览项目规划](https://booster.feishu.cn/wiki/T8uaws69pi6dEbkU2L6cUNhonbc)

一期分为两个需求实现：

- 本次需求：支持点位导航、语音播报、执行技能

- 下次需求：支持语音问答

# 目标

- 支持：

    - 用户在导览后台创建导览任务，标记地图点位并规划路径，配置点位动作（语音播报、执行技能）

    - 用户通过 Booster APP，控制机器人使用导览 Agent 执行导览任务

- 不支持：

    - 语音问答，下次需求覆盖

    - 建图，由外部开发者 / Booster Studio 团队开发

# 核心资源关系与流转

- 在云端的 Booster 账号下，存储地图和导览资源，资源关系如下：

- 机器人通过 Booster App 从云端下载账号下的导览资源

# 主要用户流程

# 详细设计

## 导览后台 \- 整体

|功能描述|界面示意图 / 流程图|
|---|---|
|**登录/注册**<br>- 必须登录 Booster Studio 账号才能使用导览后台功能<br>- 无登录态时：打开进入 Booster Studio 登录页面（复用 Studio 页面），可登录/注册账号<br>- 登录成功后，自动跳回导览后台页面，可正常使用功能|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NDc2NDkwZGEzMzU2ZjUyM2EyZmU3MjUyZDNiYThmOTRfMDBhZGYzMzA0NmVlMmVhYzE1Y2Y4YTc2MTM3NmQ1MDNfSUQ6NzY3NjA2MDY4NDc2NTM1MTIwNF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**整体布局**<br>- 左上角展示导览应用 logo<br>- 顶部展示一级导航：导览任务、地图，默认：导览任务<br>- 右上角展示账号头像，点击展示：<br>    - 用户名（即邮箱）<br>    - English / 中文：当前是中文则展示「English」，是英文则展示「中文」，点击切换到对应语言<br>    - 退出登录：点击出现二次确认弹窗，确定则退出登录|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Zjk3NTQxZTk4NmU2YzNjYjZiYTk2MTNkMDA0OGI0OWNfMzM3NGYwOTUzM2Q2Yzc0OWMxYmU3YWFhNGQ5OTE3YzdfSUQ6NzY3NjEzMjYwNjA2MDIxOTM0OF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|

## 导览后台 \- 地图

|功能描述|界面示意图 / 流程图|
|---|---|
|**无地图**<br>- 无地图时，展示占位图和按钮「添加地图」<br>**添加地图**<br>- 输入地图名称<br>- 选择本地文件上传，仅支持上传 \.XXX 格式的文件<br>    - 校验文件大小，超过限制提示：“地图资源最大 XX MB”<br>    - 上传过程中，进行 loading 状态提示，上传成功 toast 提示“上传成功”<br>- 点击「保存」，toast 提示“添加成功”<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWFlZDQ2OWI5MTEzZDhmNTgyNDcwMmZiN2RmMTVjMWFfNGMyYzNjMzhmYjgwMjg2ODE2NTkwNWExZWRmOWVjMzlfSUQ6NzY3ODIxOTkwNDIzNTc2ODgwNl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Y2Y3MjU0MTkyOWFkNTFmYWQyY2ExNzFkNTYwMjYxOTlfMTBlNDU4MmU1YTk1YWRkY2YzMTdiZjBhYzAxZGY1ZjlfSUQ6NzY3ODI0MjgxMDIxMDExMDY1MV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**查看地图列表**<br>- 展示账号下的所有地图资源，按创建时间倒序排列<br>- 展示地图信息：地图名称、创建时间<br>- 展示操作按钮：「编辑」、「···」|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGFiZGQ4ZmY3NGNlNDRmYjQxMWNjYjNjODRhYWU0NGJfM2MyNDM0Y2RmZWRlMWMzMmZmMmZhZTFlYzAxMmZjZGVfSUQ6NzY3ODIyMDI3MTg0MDkwNjQ0N18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**查看地图详情**<br>- 点击每一行，打开新页面，进入地图详情页<br>- 标题「地图名称」<br>- 页面展示：地图名称、2D 地图<br>- 底部按钮：编辑、删除|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=M2RlOGJhMTY1YWJjZDFhZGM1YTQ1Yjg5Mjk4MWZkYjlfYjZlY2RhZjc5MWIxYThmNWE3OTI5MDNkMDRkM2VjMTRfSUQ6NzY3ODIyMDIyNzI0MjcwODE1NF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**编辑地图**<br>- 仅支持编辑地图名称，不支持重新上传地图|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YjU2N2E3NTE2NGM5ZjEzMDk3YTIwMmQ4M2I1YTMyOGZfZDJkMWU1N2FiMWU2ZjU2MTkyNzQ2YjgzMDJkNGI4ZWVfSUQ6NzY3ODIyMDQxNDk5ODcyNzYzNF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**删除地图**<br>- 点击地图右侧「···」菜单可见「删除」选项，弹出二次确认弹窗，确定则删除地图<br>- 在地图详情页，点击「删除」，弹出二次确认弹窗，确定则删除地图|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmY0MDg3ZmI2OGFiNjE3Y2RjNmE0NzQ2NTc1Y2YyNWNfMzRlYzU2ZDU4N2QwZTI2Yzc4Yjc3ZjVhZWI1NzAzYzFfSUQ6NzY3ODIyMDM0ODA3NzI5NjU4OF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=N2U5NzIxYmM4NzI4NmNjNjY4OGU2ZjdlY2I4YmRiOGRfYmQzYWMzMTk1NjBlODA3NDY1YTRkN2NiZWU2YjBhYjdfSUQ6NzY3ODIyMDM3Njc4ODg4MDMxMl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|

## 导览后台 \- 导览任务

|功能描述|界面示意图 / 流程图|
|---|---|
|**无导览任务时展示占位图**<br>- 展示「新建导览任务」按钮引导添加<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDVhOWNkNjFiZDVlZWQ3MzdkMGVjYjUwNDc3MWQ5MmNfYjU2MDFjNmEyMjcwZjBiYjg1Mjg5NzMxNGY1OGI1ODNfSUQ6NzY3NjEzMjcwNjMwODI3OTUxNl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**新建导览任务**<br>- 打开新页面，页面标题：“新建导览任务”<br>- 左上角是返回按钮，点击后，弹出二次确认弹窗，确定返回则放弃添加<br>- 底部是下一步按钮<br>**填写名称**<br>- 填写导览任务名称<br>**选择地图**<br>- 点击下拉菜单，展示地图列表，按创建时间倒序排列，支持搜索<br>- 仅可单选<br>- 如果没有地图，提示暂无地图<br>**下一步**<br>- 点击下一步时校验：<br>    - 未填写名称：输入框变红，下方红字提示“请输入名称”<br>    - 未选择地图：输入框变红，下方红字提示“请选择地图”|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWRhMTkyYTkzZDMzOTE2YWIxZTZlYTMzNWMzZmMwZTNfYzY3NzgxMTBlYjM4MDk0MDE4MTlhMjBmNmQzZjE0YzNfSUQ6NzY3NjAyMzI0NjEwMjM1MTEyN18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjJmODUzNzY5ODNlZjI1Y2YzNWI5NzI5NmI3ZjlhMWFfNDE2MzFkMTBjMGNhOWE2OGU1ZTMxMmYwNmFjOTU4ZjRfSUQ6NzY3NjAyMzIwNzQ2MzQ4ODcwM18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**配置点位**<br>- 页面上展示 2D 平面地图，支持点击「\+」「\-」缩放，支持鼠标拖拽移动地图<br>- 点击“添加点位”，可以在地图上标记点位，同时按钮变为「取消添加」，点击后退出添加状态<br>- 拖动点位上的小箭头，可以设置走到点位时机器人的朝向<br>- 拖动点位，可以修改坐标<br>**点位列表**<br>- 地图下方展示点位列表<br>- 每个点位展示：顺序序号、名称、坐标、角度<br>- 点位默认名称：“点位1”、“点位2”依次类推<br>- 支持修改各个属性，输入框失焦或按「Enter」生效此次修改，如果修改后为空，则失焦后不生效此次修改<br>- 支持拖动调整顺序<br>- 支持删除点位<br>**下一步**<br>- 未添加点位时不允许点击「下一步」|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWZjM2M0Y2ZhOGE2YjVkNzIyNWRiMDQ0MDUyOTA1NDZfNjMzNjRmMmY4ZGI2OTQyNTIzZDVmZjMwMGM3MjJjNGZfSUQ6NzY3NzQ0NTQ2OTcxNDUxNzIxN18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTdiZDRhMDIzYmYzODcyNjY5MDM2Zjk2OGNmNmU2MDlfNjZmOWYxZTMyNzBhNzBkZTczYmVlODBlNDBmZWMwYjdfSUQ6NzY3NzQ0NjA3MDAyODM3MjkzN18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**设置点位动作**<br>- 展示全部点位，每个点位右侧展示「添加动作」按钮<br>- 点位默认无动作，可配置 0\~N 个动作<br>- 点位动作有顺序，支持拖动排序<br>- 点位动作分 2 种类型：语音播报、执行技能<br>**添加点位动作 \- 语音播报类**<br>- 输入讲解词（必填）<br>**添加点位动作 \- 执行技能**<br>- 点击输入框出现技能列表，支持单选，技能列表通过 Booster Studio 的技能库接口获取<br>- 列表中展示两类技能：<br>    - 官方预装技能列表<br>    - Booster Studio 账号下的云端技能列表<br>**保存导览任务**<br>- 点击「保存」，校验：<br>    - 未填写讲解词：输入框变红，下方红字提示“请输入讲解词”<br>    - 未选择技能：输入框变红，下方红字提示“请选择技能”<br>- 保存成功后，返回导览任务列表页，刷新列表|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzM0Y2MzNTllMTEzODE2MmFmNGU0YzAzYWYzMWE5MjdfMWI5OTI4Y2JmMGQ0YzQ1MDdiMGUwODNhMDQzZWEwNTlfSUQ6NzY3NjA3MTAzODY4NTM2NzQ5NV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjhkMzZiYjczM2IzZDJjYzZhNzU3OTc0NTZkZmQ3YmNfNzIwMTQ3ZTE3OWRkODkxNjI5M2NiZDJhNTk4ZGUxNGFfSUQ6NzY3NjA3MTc0MTA3NjI0NTc5NV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGUwYzI3YWNjYTA2NDQ0MGY5NWU2N2MyODdjZGZjMGZfMjM2ZDNjYmY4ODY2MDY1ZmFiZThhOThlNGI0MWI0ZTVfSUQ6NzY3NjA3MTk1ODIyNzc4MjkxOF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjU4ZTZiMjZiN2MwNmU3YWZmYzU4M2YxMWYwNGYyYmVfODFiZTE5MmU4ZTVlOGUwZDgxYzAyYWE5N2RjMTllMTVfSUQ6NzY3NjA3MTQ4NTk2MTcwMjMzMV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**查看导览任务列表**<br>- 账号下有导览任务时，展示所有导览任务，按创建时间倒序排序<br>- 展示信息包括：导览任务名称、地图名称、点位数量、创建时间<br>- 操作按钮：编辑、「···」，点击「···」出现删除操作<br>- 右上角展示「新建导览任务」按钮|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDEwMzVhMDUzNTgyNjFlM2QwOWEzZThjZWQ3MjE3OTFfMGI0NTEwNjk4MTQyOThlMDRhNzdmNDQwNzY0MDZlMjRfSUQ6NzY3NjEzMjgwODM1NTU2NDgxOV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**查看导览任务详情**<br>- 点击导览任务，打开新页面“导览任务名称”<br>- 展示所有导览任务详情：导览任务名称、地图及点位、点位详情和所有动作<br>- 右上角展示「编辑」和「···」，点击「···」显示「删除」|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzRkOTJjNmIyZDBiYTk0Njk1ZTM2MjkzODZmNzAxMDdfYzk4OGNmOGE1YTMyNDRiNWMwZTA2YTA2NGE1ZGRlMzdfSUQ6NzY3NjA5MDg0NjYwMDU5NjY3M18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**编辑导览任务**<br>- 点击编辑，进入“编辑导览任务”页面，整体复用新建导览任务页，但是禁止修改地图，其他都可以编辑|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MmI2ZWZlZGQ2YWRlMzU5ZjYyZmZlODAxYzdkYjJjNWVfYjk4ZDBkMDA2ZmZjMDRjMGQwNTI1MTMwZDgyOWEwNThfSUQ6NzY3NjExNTAzMzQ5NTE3ODQyNl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**删除导览任务**<br>- 入口1：列表右侧「···」有「删除」选项，点击弹出二次确认弹窗，确定则删除任务<br>- 入口2：在查看导览任务详情页，右上角「···」有「删除」选项，点击弹出二次确认弹窗，确定则删除任务<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MGEyYjM2OTU4ZjdhMWU2NjU1OTQ5MzgxNTY0ZmExNGJfMTAwN2I2NWZhMzVjYjg5ZTg0ZDM1NmNmZGRkOGE4YWVfSUQ6NzY3NjEzMjg4Mjg1NDc3NTczOV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MmM2ZTcyOTIxOWIwNDdkYjU4ZTNhNGY0NWExZTQzNDJfMTIzNWY5MTYzZDc5MTYwMDY4MWM1Y2NkYjE5YWYwMDFfSUQ6NzY3NjEzMzAzNDkxMDk0NDIxM18xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGY1OGQ3YzE0OTQ1YWM0ZmM5MjllZWYwYzBlZWM5ZGZfYWZkOTdhMjM1NzFhNjgzMzQxOTBhNzliZGE5M2UwOTdfSUQ6NzY3NjEzMjkzNzg5NjY5MjkzNl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|

## Booster App \- 导览 Agent

|功能描述|界面示意图 / 流程图|
|---|---|
|**安装导览 Agent（复用 Booster Studio 既有能力）**<br>- 解决方案团队将导览 Agent 上架到 Agent Store 后，用户可在 Booster App 中，通过「切换 Agent」\-「探索更多」\-「从 Agent Store 安装」安装导览 Agent<br>- Agent 名称：“金牌导览”，Agent 描述：“集自主领航、展项讲解、互动问答与智能避障于一身，让每一次参观更生动、更顺畅。”<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODlmZDgxMjFiOTU5OGY0MzQ4MzQwNDkyZjA3MjkwM2JfZDE1ZTlkNzk0NWFjYjAxMmQ0ODhiYTZhZTU1ZTEzNDVfSUQ6NzY3NjA5MzEwNzQ5NDAxMzkwMV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzZlZTdjZTVhOWUzZWQ2ZDBkNWFjYTI5MzEyNTU0N2RfYWE4MDZjZGI2ZjFhMmRhMDFlODZiZDE2NWM0ZTJiYTZfSUQ6NzY3NjA5NTI2MTQ4MzEyNTcyMl8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**添加导览任务**<br>- 机器人安装导览 Agent 后，默认展示：「导览设置」选项<br>- 点击「添加导览任务」，打开一个 web 页面，点击左上角「X」可退回导览设置<br>- 展示云端所有导览任务，如果无任务，提示“暂无导览任务 如何添加任务？”，点击跳转飞书文档链接<br>- 每个导览任务下方展示按钮：<br>    - 该任务从未添加过，展示「添加」按钮<br>    - 该任务添加过，展示“已添加”文案<br>- 点击「添加」，判断地图是否添加过：<br>    - 如果本地有对应地图，则只添加导览任务<br>    - 如果本地无对应地图，则先添加地图，然后添加导览任务<br>- 添加时，如果发现当前机器人固件版本不支持导览任务中配置的技能，则取消添加，提示：“添加失败，机器人固件版本过低，请升级到最新版本”<br>- 提示消息：<br>    - 添加时，toast 提示“正在添加导览任务”<br>    - 添加完毕，toast 提示“添加成功”<br>    - 添加失败，toast 提示“添加失败，请重试”<br>    - 添加过程中，如发现任务已存在于本机，提示“该任务已存在于机器人，请勿重复添加”，「添加」按钮变为“已添加”文案<br>**删除导览任务**<br>- 已下载的导览任务，点击「···」出现「删除」按钮，点击弹出二次确认弹窗，确定则删除本地导览任务资源<br>- 如果没有其他导览任务引用该任务使用的地图资源，则一并删除存储在本地的地图资源<br>**添加导览任务 \- 云端无任务**<br>- 展示占位图和文案“暂无可添加的导览任务，请先在导览后台创建 查看说明”<br>**添加导览任务 \- 无网络**<br>- 展示无网络占位图，提示“无网络连接，请联网后重试”|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTUxZGJmZTMyYjgxOTU3NmI0YmJkOTNmYjg3MDc0YzVfMTkwNTk4MGY0MzhkMmJkZWM4MzIzN2U2M2YyYmMwYTlfSUQ6NzY3ODIyNDI3OTYxMTkwMjkyMV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=N2EwZGZhMzNjMDdiZTcwYzdkNTY1MGJmN2Q2MWUzMGRfN2ZmNDZkOGMwZjU2YWUwN2QzMDdkZTljMWMzMzczMzVfSUQ6NzY3Nzg3MDM0Mzg4NDYzOTQzMV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Yzk4YWFmYjQ2YjY5OTY1NWIzYmIwNWQ5MWQ5YWNhYzdfNDcyNTQ3NWY1YTYzOGY2NzdmZDg3MTI1N2FjOGE5OTFfSUQ6NzY3Nzg3MDQ4MjE1MDcyMjc3MV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjE3NTEyYWY2YWJiMDk3MWRmOWMzNjYyNmZmZDBjNTJfMjU3YjQzZGEzN2JkNDc3MThlNWIyNjlkMTE4NThjNGFfSUQ6NzY3NjEzMjAzNDg3MTY0MzA2OF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzMzNzI5ZmU5OGQ2YzIyYWIzZjZkZDk5OTYwMmY4NWZfNzNlMDhhNzdhMDM1MmMyN2I2MThlNjNhZWVkMDQ2YWFfSUQ6NzY3Nzg0MTAxOTAzNzQwNDM4MF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**展示导览任务**<br>- 启动导览 Agent 时，展示机器人本地已下载的所有导览任务选项，显示名称和默认图标，按获取时间倒序排列<br>- 在最后展示「导览设置」<br>**自动更新已添加的导览任务**<br>- 打开导览 Agent 时，自动检查云端的导览任务是否有更新，如果有更新，自动更新导览任务<br>    - 更新时，toast 提示“云端导览任务有更新，正在获取最新版本”<br>    - 更新成功，toast 提示“导览任务更新成功”|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Yzg3Yjg5M2U1MzdkMzRjMmVhZjA0YzI4OTZlNWUzNDlfNzk4MmVhNGFkNWUyMmRjOGFmNjE4ZmI0NjUwY2I5ODFfSUQ6NzY3Nzg2MDU0NTE2NTI2NTg3OF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)|
|**执行导览任务**<br>- 机器人进入 walk 模式后，用户点击导览任务，机器人执行导览任务：<br>    - 根据导览任务对应地图，定位自己所在位置<br>    - 行进到第一个点位、调整朝向、执行点位 1 所有任务，如果点位上没有任务，则继续行进至下一个点位<br>    - 行进至点位2、调整朝向、执行点位 2 任务……直至结束，退出任务<br>- 此时 APP 底部选项变为：<br>    - 「暂停」、「下个环节」、「结束」<br>**暂停/继续（P1）**<br>- 点击「暂停」导览任务后，选项文案变为「继续」：<br>    - 当机器人在自主导航时，停止移动，点继续则继续行进<br>    - 当机器人在执行动作时，停止动作，点继续则重新开始当前环节<br>**下个环节**<br>- 当机器人在自主导航时，此按钮不能点击<br>- 当机器人在表演点位动作时，点击下个环节，表演下个动作，或者导航到下个点位<br>**结束**<br>- 点击「结束」，结束当前任务，选项列表恢复为导览任务列表界面<br>**任务自然结束**<br>- 任务执行完毕后，自然结束，选项恢复为任务列表界面；|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzkxMmM0YzZjNjE4NDliMDMxMTlkNWQxZjA2NjdlNmFfZWRlYjAyODIyYzRjMzk3Y2Q1ZGJjY2E2MGVhYzhjZjVfSUQ6NzY3NzgzODQyOTQ0NjY1NTE5OV8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=M2E3MTA0MzBkZmYyZmQ3NmYyNDUyODczYTdmNjViYzBfMzlmMzU0YzdjYTUzMzE1MjQ1YWRiMmM0Y2M0MmZmZjNfSUQ6NzY3NzgzODUwNDQ1MzM2MDU4MF8xNzg4MTU2MDM1OjE3ODgyNDI0MzVfVjM)<br>|
|**异常情况处理**<br>- 机器人未安装激光雷达<br>    - 启动导览 agent 时，判断机器人是否有官方型号的激光雷达，如不具备，toast 提示“机器人未安装激光雷达，无法使用导览功能”<br>    - 点击执行导览任务时，同上判断，如未安装，则不启动导览任务，并同上提示<br>- 机器人定位失败<br>    - 点击执行导览任务时，如无法成功获取到在地图中的位置，提示“定位失败”||

# 附录

[导览项目规划](https://booster.feishu.cn/wiki/T8uaws69pi6dEbkU2L6cUNhonbc)

[机器人导览竞品调研](https://booster.feishu.cn/wiki/Zf1Ww8heMiQ9r2kcR9tceDr9nOh)

[北京地铁来访纪要\_0811](https://booster.feishu.cn/wiki/OL4MwX8WZiZMVYkMCdPcaMLfnlf)

[人形机器人与具身智能实景实训\-北京地铁](https://booster.feishu.cn/docx/Rs3od522noTrbNxuCHYcTCuOn0e)

[中国国家博物馆人形机器人智能导览实景实训实施方案\-内部沟通稿](https://booster.feishu.cn/wiki/RZISwMKl4iOJmokEo4bchHPCnmh)

[北京地铁实景实训（一期）功能清单](https://booster.feishu.cn/wiki/CoGgwYabTijeSvkmM0qcgXitngg)

[\[概要\] 技能库](https://booster.feishu.cn/wiki/CVzQwtj4SiUs2GkOWMwcGjounCe)

[\[PRD\] App 支持技能库 \- 第 3 次评审](https://booster.feishu.cn/wiki/Q3FtwuDYNiGbepk9V7TcEExznFc)

[Hichat Hub](https://hichat.boosterobotics.com/hichathub/agent/edit)

## 对 Booster Studio 团队依赖梳理

1. 账号登录：

    1. 导览后台通过 Booster Studio 账号登录 @侯君竹：预期 9\.11 上线

    2. 获取 Booster App 的登录态 @孙晓磊

2. 技能库 @孙晓磊：预期 9 月内开发完成，跟版本可能到 10 月底，但是可以针对单独机器人刷包

    1. 列表查询接口

    2. 执行技能接口

## 产品形态

|模块|形态|功能|
|---|---|---|
|建图|复用三方 APP OMap|遥控机器人进行激光雷达扫描，构建二维地图和三维点云图|
|导览后台|Web 页面|导入机器人建图，设置点位，设定行走路径、编排任务（语音播报等）|
|导览操作|Booster App 中新增导览 Agent|用户查看和执行编排好的导览任务|



