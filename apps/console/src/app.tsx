import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Bot, Check, ChevronLeft, ChevronRight, CircleUserRound, Map, MicVocal, Pencil, Plus, Route, Wrench } from 'lucide-react'
import { NavLink, Navigate, Route as RouterRoute, Routes, useLocation, useNavigate } from 'react-router-dom'
import { healthResponseSchema, runtimeInfoSchema, tourTaskListSchema } from '@guide/contracts'
import type { ReactNode } from 'react'
import type { TourTaskSummary } from '@guide/contracts'
import { TaskMenuAdapter, useConfirmModalController, useToastStackController } from './ui-adapters'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1'

const navItems = [
  { label: '导览任务', to: '/tour-tasks', icon: Route },
  { label: '地图', to: '/maps', icon: Map },
  { label: '语音', to: '/voice/personas', icon: MicVocal },
]

const taskStatusLabels: Record<TourTaskSummary['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const taskDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

async function getJson(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`)
  if (!response.ok) throw new Error(`请求失败（${response.status}）`)
  return response.json() as Promise<unknown>
}

function AppShell({ children }: { children: ReactNode }) {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => healthResponseSchema.parse(await getJson('/health')),
    staleTime: 30_000,
  })

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/tour-tasks" aria-label="导览后台首页">
          <Bot aria-hidden="true" size={22} strokeWidth={2.25} />
          <span>导览后台</span>
        </NavLink>
        <nav className="primary-nav" aria-label="主要导航">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to={to}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="account-area">
          <span
            className={`connection-dot${healthQuery.isSuccess ? ' is-ready' : healthQuery.isError ? ' is-error' : ''}`}
            title={healthQuery.isSuccess ? '服务已连接' : healthQuery.isError ? '服务未连接' : '正在连接服务'}
            aria-label={healthQuery.isSuccess ? '服务已连接' : healthQuery.isError ? '服务未连接' : '正在连接服务'}
          />
          <button className="account-button" type="button" aria-label="打开账号菜单">
            <CircleUserRound aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>guide@booster.tech</span>
          </button>
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
  )
}

function TourTaskListPage() {
  const navigate = useNavigate()
  const [deleteTask, setDeleteTask] = useState<TourTaskSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const showToast = useToastStackController()
  const taskQuery = useQuery({
    queryKey: ['tour-tasks'],
    queryFn: async () => tourTaskListSchema.parse(await getJson('/tour-tasks')),
  })

  const tasks = taskQuery.data ?? []
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  const confirmDelete = () => {
    setDeleteTask(null)
    setDeleteTrigger(null)
    showToast({
      variant: 'warning',
      title: '删除未执行',
      message: '删除接口尚未接入，未修改数据。',
    })
  }

  useConfirmModalController({
    open: Boolean(deleteTask),
    title: deleteTask ? `确认删除“${deleteTask.name}”？` : '',
    description: deleteTask ? '删除操作需要后端接口确认，当前只会关闭这个确认窗口并保留任务数据。' : undefined,
    trigger: deleteTrigger,
    onConfirm: confirmDelete,
    onCancel: () => {
      setDeleteTask(null)
      setDeleteTrigger(null)
    },
  })

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const editTask = (task: TourTaskSummary) => {
    navigate('/tour-tasks/new', { state: { mode: 'edit', taskId: task.id } })
  }

  const requestDelete = (task: TourTaskSummary, trigger: HTMLElement) => {
    setDeleteTrigger(trigger)
    setDeleteTask(task)
  }

  return (
    <section className="page-section" aria-labelledby="tour-tasks-title">
      <div className="page-heading">
        <div>
          <h1 id="tour-tasks-title">导览任务</h1>
          <p className="page-summary">设置机器人要执行的导览内容</p>
        </div>
        <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/tour-tasks/new')}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
          新建导览任务
        </button>
      </div>
      {taskQuery.isLoading ? <div className="state-panel">正在加载导览任务</div> : null}
      {taskQuery.isError ? <div className="state-panel state-error">暂时无法加载导览任务，请检查本地服务。</div> : null}
      {taskQuery.isSuccess && tasks.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true">
            <Route aria-hidden="true" size={42} strokeWidth={1.35} />
          </div>
          <h2 className="guide-empty-title">暂无导览任务</h2>
          <p className="guide-empty-description">创建第一个导览任务，让机器人开始执行导览。</p>
          <button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/tour-tasks/new')}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            新建导览任务
          </button>
        </div>
      ) : null}
      {taskQuery.isSuccess && tasks.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table">
            <thead className="guide-table-head">
              <tr className="guide-table-row">
                <th className="guide-table-header-cell">任务名称</th>
                <th className="guide-table-header-cell">地图</th>
                <th className="guide-table-header-cell">点位数量</th>
                <th className="guide-table-header-cell">状态</th>
                <th className="guide-table-header-cell">创建时间</th>
                <th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th>
              </tr>
            </thead>
            <tbody className="guide-table-body">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`guide-table-row guide-table-row-interactive${selectedTaskId === task.id ? ' is-selected' : ''}`}
                  tabIndex={0}
                  aria-label={`查看任务 ${task.name}`}
                  onClick={() => openTaskDetail(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openTaskDetail(task.id)
                    }
                  }}
                >
                  <td className="guide-table-cell guide-table-cell-name task-name">{task.name}</td>
                  <td className="guide-table-cell">{task.mapName}</td>
                  <td className="guide-table-cell">{task.pointCount}</td>
                  <td className="guide-table-cell"><span className={`guide-tag guide-tag-${task.status === 'PUBLISHED' ? 'success' : task.status === 'DRAFT' ? 'info' : 'default'}`} title={taskStatusLabels[task.status]}>{taskStatusLabels[task.status]}</span></td>
                  <td className="guide-table-cell">{taskDateFormatter.format(new Date(task.createdAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    <button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${task.name}`} title="编辑" onClick={() => editTask(task)}>
                      <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                    <TaskMenuAdapter taskName={task.name} onDelete={(trigger) => requestDelete(task, trigger)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {selectedTask ? (
        <section className="task-detail-panel" aria-labelledby="task-detail-title">
          <div className="task-detail-heading">
            <div>
              <p className="eyebrow">任务详情</p>
              <h2 id="task-detail-title">{selectedTask.name}</h2>
            </div>
            <button className="guide-button guide-button-secondary" type="button" onClick={() => setSelectedTaskId(null)}>
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
              返回列表
            </button>
          </div>
          <dl className="task-detail-grid">
            <div><dt>地图</dt><dd>{selectedTask.mapName}</dd></div>
            <div><dt>点位数量</dt><dd>{selectedTask.pointCount}</dd></div>
            <div><dt>状态</dt><dd><span className={`guide-tag guide-tag-${selectedTask.status === 'PUBLISHED' ? 'success' : selectedTask.status === 'DRAFT' ? 'info' : 'default'}`} title={taskStatusLabels[selectedTask.status]}>{taskStatusLabels[selectedTask.status]}</span></dd></div>
            <div><dt>版本</dt><dd>v{selectedTask.version}</dd></div>
            <div><dt>创建时间</dt><dd>{taskDateFormatter.format(new Date(selectedTask.createdAt))}</dd></div>
            <div><dt>更新时间</dt><dd>{taskDateFormatter.format(new Date(selectedTask.updatedAt))}</dd></div>
          </dl>
          <div className="task-detail-actions">
            <button className="guide-button guide-button-primary" type="button" onClick={() => editTask(selectedTask)}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
              编辑任务
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}

function NewTaskPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as { mode?: string; taskId?: string } | null
  const isEditing = navigationState?.mode === 'edit' && Boolean(navigationState.taskId)
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [mapName, setMapName] = useState('')
  const [points, setPoints] = useState([{ name: '', description: '' }])
  const [action, setAction] = useState('语音播报')
  const [notice, setNotice] = useState('')

  const canContinue = step === 1 ? Boolean(name.trim() && mapName.trim()) : step === 2 ? points.some((point) => point.name.trim()) : true

  const addPoint = () => setPoints((current) => [...current, { name: '', description: '' }])
  const updatePoint = (index: number, key: 'name' | 'description', value: string) => {
    setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, [key]: value } : point))
  }

  return (
    <section className="page-section" aria-labelledby="new-task-title">
      <div className="page-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/tour-tasks')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            返回任务列表
          </button>
          <h1 id="new-task-title">{isEditing ? '编辑导览任务' : '新建导览任务'}</h1>
          <p className="page-summary">按三个步骤完成导览任务配置，当前内容仅保留在本地编辑状态。</p>
        </div>
      </div>
      <ol className="editor-stepper" aria-label="任务编辑步骤">
        {['基本信息', '点位设置', '动作编排'].map((label, index) => {
          const stepNumber = index + 1
          return (
            <li className={`editor-step${step === stepNumber ? ' is-current' : step > stepNumber ? ' is-complete' : ''}`} key={label}>
              <button type="button" onClick={() => stepNumber < step && setStep(stepNumber)} disabled={stepNumber > step} aria-current={step === stepNumber ? 'step' : undefined}>
                <span className="editor-step-number">{step > stepNumber ? <Check aria-hidden="true" size={14} /> : stepNumber}</span>
                <span>{label}</span>
              </button>
              {stepNumber < 3 ? <ChevronRight className="editor-step-divider" aria-hidden="true" size={16} /> : null}
            </li>
          )
        })}
      </ol>
      <div className="editor-card">
        {step === 1 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <h2 id="editor-step-title">基本信息</h2>
            <p className="editor-help">先填写任务名称和使用的地图。</p>
            <div className="editor-form-grid">
              <label className="editor-field">
                <span>任务名称</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：王府井大厅导览" />
              </label>
              <label className="editor-field">
                <span>地图名称</span>
                <input value={mapName} onChange={(event) => setMapName(event.target.value)} placeholder="选择或输入地图名称" />
              </label>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <div className="editor-panel-heading"><div><h2 id="editor-step-title">点位设置</h2><p className="editor-help">添加导览过程中需要经过的点位。</p></div><button className="guide-button guide-button-secondary" type="button" onClick={addPoint}><Plus aria-hidden="true" size={16} />添加点位</button></div>
            <div className="point-list">
              {points.map((point, index) => (
                <div className="point-editor" key={`point-${index}`}>
                  <span className="point-index">{index + 1}</span>
                  <label className="editor-field"><span>点位名称</span><input value={point.name} onChange={(event) => updatePoint(index, 'name', event.target.value)} placeholder="例如：大厅入口" /></label>
                  <label className="editor-field"><span>讲解说明</span><input value={point.description} onChange={(event) => updatePoint(index, 'description', event.target.value)} placeholder="可选" /></label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <h2 id="editor-step-title">动作编排</h2>
            <p className="editor-help">选择机器人到达点位后的默认动作。</p>
            <label className="editor-field editor-field-narrow"><span>默认动作</span><select value={action} onChange={(event) => setAction(event.target.value)}><option>语音播报</option><option>等待确认</option><option>拍照记录</option></select></label>
            <div className="editor-summary" aria-live="polite"><strong>{name || '未命名任务'}</strong><span>{mapName || '未选择地图'} · {points.filter((point) => point.name.trim()).length} 个点位 · {action}</span></div>
          </div>
        ) : null}
        {notice ? <p className="editor-notice" role="status">{notice}</p> : null}
        <div className="editor-actions">
          <button className="guide-button guide-button-secondary" type="button" onClick={() => step === 1 ? navigate('/tour-tasks') : setStep((current) => current - 1)}>
            <ChevronLeft aria-hidden="true" size={16} />
            {step === 1 ? '取消' : '上一步'}
          </button>
          {step < 3 ? <button className="guide-button guide-button-primary" type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>下一步<ChevronRight aria-hidden="true" size={16} /></button> : <button className="guide-button guide-button-primary" type="button" onClick={() => setNotice('保存接口尚未接入，当前仅保留本地草稿。')}><Check aria-hidden="true" size={16} />保存草稿</button>}
        </div>
      </div>
    </section>
  )
}

function MapsPage() {
  return (
    <section className="page-section" aria-labelledby="maps-title">
      <div className="page-heading">
        <div>
          <h1 id="maps-title">地图</h1>
          <p className="page-summary">管理导览任务使用的地图资产</p>
        </div>
      </div>
      <div className="guide-empty" role="status" aria-live="polite">
        <div className="guide-empty-icon" aria-hidden="true">
          <Map aria-hidden="true" size={42} strokeWidth={1.35} />
        </div>
        <h2 className="guide-empty-title">暂无地图资产</h2>
        <p className="guide-empty-description">地图资产接口尚未接入。完成接口接入后，可在此上传和管理地图。</p>
      </div>
    </section>
  )
}

function PersonasPage() {
  return (
    <section className="page-section" aria-labelledby="personas-title">
      <div className="page-heading">
        <div>
          <h1 id="personas-title">人设管理</h1>
          <p className="page-summary">管理语音导览使用的人设与表达风格</p>
        </div>
      </div>
      <div className="guide-empty" role="status" aria-live="polite">
        <div className="guide-empty-icon" aria-hidden="true">
          <CircleUserRound aria-hidden="true" size={42} strokeWidth={1.35} />
        </div>
        <h2 className="guide-empty-title">暂无语音人设</h2>
        <p className="guide-empty-description">人设管理接口尚未接入。完成接口接入后，可在此创建和编辑语音人设。</p>
      </div>
    </section>
  )
}

function PluginsPage() {
  return (
    <section className="page-section" aria-labelledby="plugins-title">
      <div className="page-heading">
        <div>
          <h1 id="plugins-title">插件管理</h1>
          <p className="page-summary">管理导览流程可调用的工具与插件</p>
        </div>
      </div>
      <div className="guide-empty" role="status" aria-live="polite">
        <div className="guide-empty-icon" aria-hidden="true">
          <Wrench aria-hidden="true" size={42} strokeWidth={1.35} />
        </div>
        <h2 className="guide-empty-title">暂无可用插件</h2>
        <p className="guide-empty-description">插件管理接口尚未接入。完成接口接入后，可在此添加和配置插件。</p>
      </div>
    </section>
  )
}

function RuntimePage() {
  const runtimeQuery = useQuery({
    queryKey: ['runtime'],
    queryFn: async () => runtimeInfoSchema.parse(await getJson('/runtime')),
  })
  const runtime = runtimeQuery.data
  return (
    <section className="page-section" aria-labelledby="runtime-title">
      <div className="page-heading"><h1 id="runtime-title">运行环境</h1></div>
      <div className="state-panel">{runtime ? `身份服务：${runtime.identityProvider}；技能服务：${runtime.skillProvider}` : '正在读取运行环境'}</div>
    </section>
  )
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <RouterRoute path="/tour-tasks" element={<TourTaskListPage />} />
        <RouterRoute path="/tour-tasks/new" element={<NewTaskPage />} />
        <RouterRoute path="/maps" element={<MapsPage />} />
        <RouterRoute path="/voice/personas" element={<PersonasPage />} />
        <RouterRoute path="/voice/plugins" element={<PluginsPage />} />
        <RouterRoute path="/runtime" element={<RuntimePage />} />
        <RouterRoute path="*" element={<Navigate to="/tour-tasks" replace />} />
      </Routes>
    </AppShell>
  )
}
